import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupportCaseCreateInput,
  SupportCaseCommentCreateInput,
  SupportStatus,
  UserRole,
} from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class SupportCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAll(tenantId?: string, createdByUserId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (createdByUserId) where.createdByUserId = createdByUserId;

    return this.prisma.supportCase.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId?: string, userRole?: UserRole) {
    const ticket = await this.prisma.supportCase.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support case ${id} not found`);
    }

    if (tenantId && ticket.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Support case belongs to another tenant');
    }

    // Security Rule: Filter out internal comments for client HR, client Admin, and Workers
    const isInternalUser =
      userRole === UserRole.PLATFORM_ADMIN || userRole === UserRole.INTERNAL_OPS;

    if (!isInternalUser) {
      ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    }

    return ticket;
  }

  async create(input: SupportCaseCreateInput, tenantId: string, createdByUserId: string, userRole: UserRole) {
    let workerId = input.workerId || null;
    let companyId = input.companyId || null;

    // For Worker users, lookup and enforce their own workerId and companyId
    if (userRole === UserRole.WORKER) {
      const worker = await this.prisma.worker.findUnique({
        where: { userId: createdByUserId },
      });
      if (worker) {
        workerId = worker.id;
        companyId = worker.companyId;
      }
    }

    const ticket = await this.prisma.supportCase.create({
      data: {
        tenantId,
        workerId,
        companyId,
        createdByUserId,
        category: input.category as any,
        priority: input.priority as any,
        status: SupportStatus.OPEN,
        subject: input.subject,
        description: input.description,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      createdByUserId,
      'SUPPORT_CASE_CREATED',
      'SupportCase',
      ticket.id,
      { category: ticket.category, subject: ticket.subject }
    );

    return this.findOne(ticket.id, undefined, userRole);
  }

  async update(
    id: string,
    input: { status?: SupportStatus; priority?: string; assignedToUserId?: string | null },
    tenantId?: string,
    actorUserId?: string
  ) {
    const ticket = await this.prisma.supportCase.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Support case ${id} not found`);
    }

    if (tenantId && ticket.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.supportCase.update({
      where: { id },
      data: {
        status: input.status ? (input.status as any) : undefined,
        priority: input.priority ? (input.priority as any) : undefined,
        assignedToUserId: input.assignedToUserId !== undefined ? input.assignedToUserId : undefined,
      },
    });

    // Record audit log if status or assignee changed
    if (input.status && input.status !== ticket.status) {
      await this.auditLogService.create(
        updated.tenantId,
        actorUserId || null,
        'SUPPORT_CASE_STATUS_CHANGED',
        'SupportCase',
        updated.id,
        { oldStatus: ticket.status, newStatus: input.status }
      );
    }

    return updated;
  }

  async addComment(
    ticketId: string,
    input: SupportCaseCommentCreateInput,
    tenantId: string | undefined,
    authorUserId: string,
    userRole: UserRole
  ) {
    const ticket = await this.findOne(ticketId, tenantId, userRole);

    // Enforce that client roles and workers CANNOT post internal comments
    const isInternalUser =
      userRole === UserRole.PLATFORM_ADMIN || userRole === UserRole.INTERNAL_OPS;

    const isInternal = isInternalUser ? input.isInternal : false;

    const comment = await this.prisma.supportCaseComment.create({
      data: {
        tenantId: ticket.tenantId,
        supportCaseId: ticketId,
        authorUserId,
        body: input.body,
        isInternal,
      },
    });

    // Touch case updated timestamp
    await this.prisma.supportCase.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return comment;
  }
}
