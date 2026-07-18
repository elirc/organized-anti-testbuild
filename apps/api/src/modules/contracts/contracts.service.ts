import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractCreateInput, ContractStatus } from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  // Valid state transitions dictionary
  private readonly validTransitions: Record<ContractStatus, ContractStatus[]> = {
    [ContractStatus.DRAFT]: [ContractStatus.IN_REVIEW],
    [ContractStatus.IN_REVIEW]: [ContractStatus.APPROVED, ContractStatus.DRAFT],
    [ContractStatus.APPROVED]: [ContractStatus.SENT, ContractStatus.DRAFT],
    [ContractStatus.SENT]: [ContractStatus.SIGNED],
    [ContractStatus.SIGNED]: [ContractStatus.ACTIVE],
    [ContractStatus.ACTIVE]: [ContractStatus.TERMINATED],
    [ContractStatus.TERMINATED]: [], // Terminal state
  };

  async findAll(tenantId?: string) {
    return this.prisma.employmentContract.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        country: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const contract = await this.prisma.employmentContract.findUnique({
      where: { id },
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        country: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    if (tenantId && contract.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Contract belongs to another tenant');
    }

    return contract;
  }

  async create(input: ContractCreateInput, tenantId: string, actorUserId: string) {
    // Validate effective date and termination date
    const eff = new Date(input.effectiveDate);
    const term = input.terminationDate ? new Date(input.terminationDate) : null;

    if (term && term <= eff) {
      throw new BadRequestException('Termination date must be after the effective date');
    }

    const contract = await this.prisma.employmentContract.create({
      data: {
        tenantId,
        workerId: input.workerId,
        countryId: input.countryId,
        contractType: input.contractType as any,
        status: ContractStatus.DRAFT, // default is DRAFT
        compensationAmount: input.compensationAmount,
        compensationCurrency: input.compensationCurrency,
        effectiveDate: eff,
        terminationDate: term,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      actorUserId,
      'CONTRACT_CREATED',
      'EmploymentContract',
      contract.id,
      { workerId: contract.workerId, contractType: contract.contractType }
    );

    return this.findOne(contract.id);
  }

  async update(id: string, input: Partial<ContractCreateInput>, tenantId?: string, actorUserId?: string) {
    const contract = await this.findOne(id, tenantId);

    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.IN_REVIEW) {
      throw new BadRequestException('Contracts can only be edited in DRAFT or IN_REVIEW state');
    }

    const eff = input.effectiveDate ? new Date(input.effectiveDate) : contract.effectiveDate;
    const term = input.terminationDate ? new Date(input.terminationDate) : contract.terminationDate;

    if (term && term <= eff) {
      throw new BadRequestException('Termination date must be after the effective date');
    }

    const updatedContract = await this.prisma.employmentContract.update({
      where: { id: contract.id },
      data: {
        contractType: input.contractType as any,
        compensationAmount: input.compensationAmount,
        compensationCurrency: input.compensationCurrency,
        effectiveDate: eff,
        terminationDate: term,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      updatedContract.tenantId,
      actorUserId || null,
      'CONTRACT_UPDATED',
      'EmploymentContract',
      updatedContract.id,
      { oldValues: contract, newValues: updatedContract }
    );

    return updatedContract;
  }

  async updateStatus(id: string, newStatus: ContractStatus, tenantId?: string, actorUserId?: string) {
    const contract = await this.findOne(id, tenantId);
    const currentStatus = contract.status as ContractStatus;

    // Enforce state transitions
    const allowed = this.validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid contract status transition: Cannot move from ${currentStatus} to ${newStatus}. Allowed transitions: [${allowed.join(', ')}]`
      );
    }

    const updatedContract = await this.prisma.employmentContract.update({
      where: { id: contract.id },
      data: { status: newStatus as any },
    });

    // Record audit log
    await this.auditLogService.create(
      updatedContract.tenantId,
      actorUserId || null,
      'CONTRACT_STATUS_CHANGED',
      'EmploymentContract',
      updatedContract.id,
      { oldStatus: currentStatus, newStatus }
    );

    return updatedContract;
  }
}
