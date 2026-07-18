import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BenefitEnrollmentUpdateInput, BenefitType, BenefitStatus } from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class BenefitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findByWorker(workerId: string, tenantId?: string) {
    const enrollments = await this.prisma.benefitEnrollment.findMany({
      where: { workerId, tenantId: tenantId ? tenantId : undefined },
      orderBy: { benefitType: 'asc' },
    });

    return enrollments;
  }

  async findOne(id: string, tenantId?: string) {
    const enrollment = await this.prisma.benefitEnrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException(`Benefit enrollment with ID ${id} not found`);
    }

    if (tenantId && enrollment.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Benefit enrollment belongs to another tenant');
    }

    return enrollment;
  }

  async createEnrollment(
    workerId: string,
    benefitType: BenefitType,
    providerName: string,
    status: BenefitStatus,
    effectiveDate: Date | null,
    tenantId: string,
    actorUserId: string
  ) {
    const enrollment = await this.prisma.benefitEnrollment.create({
      data: {
        tenantId,
        workerId,
        benefitType: benefitType as any,
        providerName,
        status: status as any,
        effectiveDate,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      actorUserId,
      'BENEFIT_ENROLLMENT_CREATED',
      'BenefitEnrollment',
      enrollment.id,
      { benefitType, providerName, status }
    );

    return enrollment;
  }

  async updateEnrollment(
    id: string,
    input: BenefitEnrollmentUpdateInput,
    tenantId?: string,
    actorUserId?: string
  ) {
    const enrollment = await this.findOne(id, tenantId);

    const updated = await this.prisma.benefitEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: input.status as any,
        providerName: input.providerName,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      updated.tenantId,
      actorUserId || null,
      'BENEFIT_ENROLLMENT_UPDATED',
      'BenefitEnrollment',
      updated.id,
      { oldStatus: enrollment.status, newStatus: input.status }
    );

    return updated;
  }
}
