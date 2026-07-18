import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkerCreateInput, EmploymentStatus } from '@gwos/shared';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAll(tenantId?: string) {
    return this.prisma.worker.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, legalName: true },
        },
        user: {
          select: { id: true, email: true, status: true },
        },
        onboardingPlan: {
          include: {
            tasks: { orderBy: { createdAt: 'asc' } },
          },
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        payrollItems: {
          include: { payrollCycle: true },
          orderBy: { createdAt: 'desc' },
        },
        benefitEnrollments: {
          orderBy: { createdAt: 'asc' },
        },
        supportCases: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID ${id} not found`);
    }

    if (tenantId && worker.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Worker belongs to another tenant');
    }

    return worker;
  }

  async create(input: WorkerCreateInput, tenantId: string, actorUserId: string) {
    // Check if email already exists in User or Worker table
    const existingUser = await this.prisma.user.findUnique({ where: { email: input.email } });
    const existingWorker = await this.prisma.worker.findUnique({ where: { email: input.email } });

    if (existingUser || existingWorker) {
      throw new BadRequestException('Email address is already in use');
    }

    // 1. Create a User for the Worker
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'WORKER',
        status: 'ACTIVE',
      },
    });

    // 2. Create the Worker profile linked to the User
    const worker = await this.prisma.worker.create({
      data: {
        tenantId,
        companyId: input.companyId,
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        countryCode: input.countryCode,
        jobTitle: input.jobTitle,
        department: input.department,
        employmentStatus: EmploymentStatus.ONBOARDING, // default is onboarding
        startDate: new Date(input.startDate),
        managerName: input.managerName || null,
        managerEmail: input.managerEmail || null,
      },
    });

    // 3. Create the OnboardingPlan
    const planDueDate = new Date(input.startDate);
    planDueDate.setDate(planDueDate.getDate() - 1); // due 1 day before starting

    const plan = await this.prisma.onboardingPlan.create({
      data: {
        tenantId,
        workerId: worker.id,
        status: 'NOT_STARTED',
        dueDate: planDueDate,
      },
    });

    // 4. Generate default Onboarding Tasks based on country compliance requirements
    const country = await this.prisma.country.findUnique({
      where: { code: input.countryCode },
      include: { complianceRequirements: true },
    });

    if (country && country.complianceRequirements.length > 0) {
      const tasksData = country.complianceRequirements.map((req) => {
        // Map requirementType to OnboardingTaskType
        let taskType: 'PROFILE_INFO' | 'DOCUMENT_UPLOAD' | 'POLICY_ACK' | 'INTERNAL_REVIEW' | 'CONTRACT_SIGNATURE' = 'DOCUMENT_UPLOAD';
        if (req.requirementType === 'DOCUMENT' || req.requirementType === 'RIGHT_TO_WORK') {
          taskType = 'DOCUMENT_UPLOAD';
        }

        return {
          tenantId,
          onboardingPlanId: plan.id,
          title: req.name,
          description: req.description,
          taskType,
          assignedToRole: 'WORKER' as any,
          status: 'TODO' as any,
          dueDate: planDueDate,
        };
      });

      await this.prisma.onboardingTask.createMany({
        data: tasksData,
      });

      // Update plan status to IN_PROGRESS since tasks are generated
      await this.prisma.onboardingPlan.update({
        where: { id: plan.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // 5. Generate default Benefit Enrollments as ELIGIBLE
    const benefitTypes = ['HEALTH', 'DENTAL', 'VISION', 'RETIREMENT'];
    await this.prisma.benefitEnrollment.createMany({
      data: benefitTypes.map((type) => ({
        tenantId,
        workerId: worker.id,
        benefitType: type as any,
        providerName: 'TBD',
        status: 'ELIGIBLE',
      })),
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      actorUserId,
      'WORKER_CREATED',
      'Worker',
      worker.id,
      { firstName: worker.firstName, lastName: worker.lastName, email: worker.email }
    );

    return this.findOne(worker.id);
  }

  async update(id: string, input: Partial<WorkerCreateInput>, tenantId?: string, actorUserId?: string) {
    const worker = await this.findOne(id, tenantId);

    const updatedWorker = await this.prisma.worker.update({
      where: { id: worker.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        jobTitle: input.jobTitle,
        department: input.department,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        managerName: input.managerName,
        managerEmail: input.managerEmail,
      },
    });

    // If User account exists, update User first/last names as well
    if (worker.userId) {
      await this.prisma.user.update({
        where: { id: worker.userId },
        data: {
          firstName: input.firstName || worker.firstName,
          lastName: input.lastName || worker.lastName,
        },
      });
    }

    // Record audit log
    await this.auditLogService.create(
      updatedWorker.tenantId,
      actorUserId || null,
      'WORKER_UPDATED',
      'Worker',
      updatedWorker.id,
      { oldValues: worker, newValues: updatedWorker }
    );

    return updatedWorker;
  }

  async updateStatus(id: string, status: EmploymentStatus, overrideReason: string | null, tenantId?: string, actorUserId?: string) {
    const worker = await this.findOne(id, tenantId);

    // Business Logic: Worker cannot become ACTIVE unless onboarding is completed,
    // UNLESS an INTERNAL_OPS user overrides it with a reason recorded in audit logs.
    if (status === EmploymentStatus.ACTIVE) {
      const plan = await this.prisma.onboardingPlan.findUnique({
        where: { workerId: worker.id },
      });

      const isCompleted = plan?.status === 'COMPLETED';

      if (!isCompleted && !overrideReason) {
        throw new BadRequestException(
          'Worker cannot become ACTIVE because their required onboarding is incomplete. Internal ops can override this by providing an override reason.'
        );
      }
    }

    const updatedWorker = await this.prisma.worker.update({
      where: { id: worker.id },
      data: { employmentStatus: status as any },
    });

    // Record audit log with the transition and potential override metadata
    await this.auditLogService.create(
      updatedWorker.tenantId,
      actorUserId || null,
      'WORKER_STATUS_CHANGED',
      'Worker',
      updatedWorker.id,
      {
        oldStatus: worker.employmentStatus,
        newStatus: status,
        overrideReason: overrideReason || undefined,
      }
    );

    return updatedWorker;
  }
}
