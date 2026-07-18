import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyCreateInput } from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAll(tenantId?: string) {
    return this.prisma.company.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        workers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            employmentStatus: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    if (tenantId && company.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Company belongs to another tenant');
    }

    return company;
  }

  async create(input: CompanyCreateInput, tenantId: string, actorUserId: string) {
    const company = await this.prisma.company.create({
      data: {
        tenantId,
        name: input.name,
        legalName: input.legalName,
        industry: input.industry,
        headquartersCountry: input.headquartersCountry,
        primaryContactName: input.primaryContactName,
        primaryContactEmail: input.primaryContactEmail,
        status: 'ACTIVE',
      },
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      actorUserId,
      'COMPANY_CREATED',
      'Company',
      company.id,
      { name: company.name, legalName: company.legalName }
    );

    return company;
  }

  async update(id: string, input: CompanyCreateInput, tenantId?: string, actorUserId?: string) {
    const company = await this.findOne(id, tenantId);

    const updatedCompany = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        name: input.name,
        legalName: input.legalName,
        industry: input.industry,
        headquartersCountry: input.headquartersCountry,
        primaryContactName: input.primaryContactName,
        primaryContactEmail: input.primaryContactEmail,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      updatedCompany.tenantId,
      actorUserId || null,
      'COMPANY_UPDATED',
      'Company',
      updatedCompany.id,
      { oldValues: company, newValues: updatedCompany }
    );

    return updatedCompany;
  }
}
