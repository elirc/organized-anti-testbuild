import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentUploadInput, DocumentStatus, DocumentType } from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAll(tenantId?: string, workerId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (workerId) where.workerId = workerId;

    return this.prisma.document.findMany({
      where,
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        worker: true,
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (tenantId && doc.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Document belongs to another tenant');
    }

    return doc;
  }

  async create(input: DocumentUploadInput, tenantId: string, workerId: string, uploadedByUserId: string) {
    // Check if worker belongs to the tenant
    const worker = await this.prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || worker.tenantId !== tenantId) {
      throw new BadRequestException('Invalid worker target for document upload');
    }

    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        workerId,
        uploadedByUserId,
        documentType: input.documentType as any,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        status: DocumentStatus.PENDING_REVIEW,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      uploadedByUserId,
      'DOCUMENT_UPLOADED',
      'Document',
      doc.id,
      { documentType: doc.documentType, fileName: doc.fileName }
    );

    return doc;
  }

  async approve(id: string, tenantId: string | undefined, actorUserId: string) {
    const doc = await this.findOne(id, tenantId);

    if (doc.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Cannot approve document in ${doc.status} status`);
    }

    const updatedDoc = await this.prisma.document.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.APPROVED, rejectionReason: null },
    });

    // Record audit log
    await this.auditLogService.create(
      updatedDoc.tenantId,
      actorUserId,
      'DOCUMENT_APPROVED',
      'Document',
      updatedDoc.id,
      { documentType: updatedDoc.documentType }
    );

    // Dynamic Workflow Engine Logic:
    // If the approved document is a PASSPORT or TAX_FORM, let's find the matching onboarding task
    // for this worker and automatically mark it as DONE!
    try {
      const plan = await this.prisma.onboardingPlan.findUnique({
        where: { workerId: doc.workerId },
      });

      if (plan) {
        // Find tasks containing keywords like Passport or Tax in their titles
        const tasks = await this.prisma.onboardingTask.findMany({
          where: {
            onboardingPlanId: plan.id,
            status: 'TODO',
          },
        });

        let targetTask = null;
        if (doc.documentType === 'PASSPORT') {
          targetTask = tasks.find(
            (t) => t.title.toLowerCase().includes('passport') || t.title.toLowerCase().includes('right to work')
          );
        } else if (doc.documentType === 'TAX_FORM') {
          targetTask = tasks.find(
            (t) => t.title.toLowerCase().includes('tax') || t.title.toLowerCase().includes('checklist') || t.title.toLowerCase().includes('w-4')
          );
        } else if (doc.documentType === 'BANK_INFO') {
          targetTask = tasks.find(
            (t) => t.title.toLowerCase().includes('bank') || t.title.toLowerCase().includes('deposit') || t.title.toLowerCase().includes('payroll')
          );
        }

        if (targetTask) {
          await this.prisma.onboardingTask.update({
            where: { id: targetTask.id },
            data: { status: 'DONE', completedAt: new Date() },
          });

          // Re-evaluate if onboarding plan is fully completed
          const remainingTasks = await this.prisma.onboardingTask.count({
            where: {
              onboardingPlanId: plan.id,
              status: { not: 'DONE' },
            },
          });

          if (remainingTasks === 0) {
            await this.prisma.onboardingPlan.update({
              where: { id: plan.id },
              data: { status: 'COMPLETED', completedAt: new Date() },
            });

            await this.auditLogService.create(
              updatedDoc.tenantId,
              null,
              'ONBOARDING_PLAN_COMPLETED',
              'OnboardingPlan',
              plan.id,
              { workerId: doc.workerId }
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-update onboarding tasks upon document approval:', err);
    }

    return updatedDoc;
  }

  async reject(id: string, reason: string, tenantId: string | undefined, actorUserId: string) {
    const doc = await this.findOne(id, tenantId);

    if (doc.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Cannot reject document in ${doc.status} status`);
    }

    const updatedDoc = await this.prisma.document.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.REJECTED, rejectionReason: reason },
    });

    // Record audit log
    await this.auditLogService.create(
      updatedDoc.tenantId,
      actorUserId,
      'DOCUMENT_REJECTED',
      'Document',
      updatedDoc.id,
      { documentType: updatedDoc.documentType, rejectionReason: reason }
    );

    return updatedDoc;
  }
}
