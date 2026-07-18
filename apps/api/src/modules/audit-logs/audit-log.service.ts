import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string | null,
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata: any = {}
  ) {
    try {
      const log = await this.prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId,
          action,
          entityType,
          entityId,
          metadata: JSON.stringify(metadata || {}),
        },
      });
      this.logger.log(`Audit Log Created: [${action}] on ${entityType} ID: ${entityId} by User: ${actorUserId}`);
      
      return {
        ...log,
        metadata: JSON.parse(log.metadata),
      };
    } catch (err) {
      this.logger.error('Failed to create audit log:', err);
    }
  }

  async findAll(tenantId?: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return logs.map((log) => {
      let parsedMetadata = {};
      try {
        parsedMetadata = JSON.parse(log.metadata);
      } catch (err) {
        parsedMetadata = {};
      }
      return {
        ...log,
        metadata: parsedMetadata,
      };
    });
  }
}
