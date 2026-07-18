import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayrollCycleStatus, PayrollItemStatus } from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findAllCycles(tenantId?: string) {
    return this.prisma.payrollCycle.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        company: { select: { name: true } },
        country: true,
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findCycle(id: string, tenantId?: string) {
    const cycle = await this.prisma.payrollCycle.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, legalName: true } },
        country: true,
        payrollItems: {
          include: {
            worker: {
              select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
            },
          },
          orderBy: { grossAmount: 'desc' },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Payroll cycle with ID ${id} not found`);
    }

    if (tenantId && cycle.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Payroll cycle belongs to another tenant');
    }

    // Calculate totals by currency
    const totalsMap: Record<string, { grossAmount: number; count: number }> = {};
    for (const item of cycle.payrollItems) {
      const cur = item.currency;
      if (!totalsMap[cur]) {
        totalsMap[cur] = { grossAmount: 0, count: 0 };
      }
      totalsMap[cur].grossAmount += item.grossAmount;
      totalsMap[cur].count += 1;
    }

    const currencySummaries = Object.entries(totalsMap).map(([currency, data]) => ({
      currency,
      grossAmount: data.grossAmount,
      count: data.count,
    }));

    return {
      ...cycle,
      currencySummaries,
    };
  }

  async createCycle(
    tenantId: string,
    companyId: string,
    countryId: string,
    periodStart: Date,
    periodEnd: Date,
    payDate: Date,
    actorUserId: string
  ) {
    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }

    // 1. Create the PayrollCycle in DRAFT status
    const cycle = await this.prisma.payrollCycle.create({
      data: {
        tenantId,
        companyId,
        countryId,
        periodStart,
        periodEnd,
        payDate,
        status: PayrollCycleStatus.DRAFT,
      },
    });

    // 2. Automate: Find all workers in company and country
    const workers = await this.prisma.worker.findMany({
      where: {
        tenantId,
        companyId,
        countryCode: (await this.prisma.country.findUnique({ where: { id: countryId } }))?.code || 'US',
        employmentStatus: { in: ['ACTIVE', 'ONBOARDING'] },
      },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 3. Auto-generate PayrollItems from their active contracts
    const country = await this.prisma.country.findUnique({ where: { id: countryId } });
    const frequency = country?.payrollFrequency || 'MONTHLY';

    const itemsData = [];
    for (const worker of workers) {
      const activeContract = worker.contracts[0];
      if (activeContract) {
        // Calculate compensation per pay period
        let grossAmount = activeContract.compensationAmount;
        if (frequency === 'MONTHLY') {
          // Assume compensationAmount is monthly
          grossAmount = activeContract.compensationAmount;
        } else if (frequency === 'SEMI_MONTHLY') {
          // Assume monthly, divide by 2
          grossAmount = activeContract.compensationAmount / 2;
        } else if (frequency === 'BI_WEEKLY') {
          // Assume monthly, divide by 2
          grossAmount = activeContract.compensationAmount / 2;
        }

        itemsData.push({
          tenantId,
          payrollCycleId: cycle.id,
          workerId: worker.id,
          grossAmount,
          currency: activeContract.compensationCurrency,
          status: PayrollItemStatus.PENDING,
          notes: `Automated generation from contract (${activeContract.contractType})`,
        });
      }
    }

    if (itemsData.length > 0) {
      await this.prisma.payrollItem.createMany({
        data: itemsData,
      });
    }

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      actorUserId,
      'PAYROLL_CYCLE_CREATED',
      'PayrollCycle',
      cycle.id,
      { periodStart, periodEnd, itemsGenerated: itemsData.length }
    );

    return this.findCycle(cycle.id);
  }

  async updateCycleStatus(id: string, newStatus: PayrollCycleStatus, tenantId?: string, actorUserId?: string) {
    const cycle = await this.findCycle(id, tenantId);
    const oldStatus = cycle.status;

    const updatedCycle = await this.prisma.payrollCycle.update({
      where: { id: cycle.id },
      data: { status: newStatus as any },
    });

    // If closing or paying the cycle, we can transition items to PAID
    if (newStatus === PayrollCycleStatus.PAID || newStatus === PayrollCycleStatus.CLOSED) {
      await this.prisma.payrollItem.updateMany({
        where: { payrollCycleId: cycle.id, status: { not: 'HELD' } },
        data: { status: 'PAID' },
      });
    }

    // Record audit log
    await this.auditLogService.create(
      updatedCycle.tenantId,
      actorUserId || null,
      'PAYROLL_CYCLE_STATUS_CHANGED',
      'PayrollCycle',
      updatedCycle.id,
      { oldStatus, newStatus }
    );

    return updatedCycle;
  }

  async addCustomPayrollItem(
    cycleId: string,
    workerId: string,
    grossAmount: number,
    currency: string,
    notes: string | null,
    tenantId: string,
    actorUserId: string
  ) {
    const cycle = await this.findCycle(cycleId, tenantId);

    if (cycle.status === PayrollCycleStatus.CLOSED || cycle.status === PayrollCycleStatus.PAID) {
      throw new BadRequestException('Cannot add payroll items to a closed or paid cycle');
    }

    const item = await this.prisma.payrollItem.create({
      data: {
        tenantId,
        payrollCycleId: cycleId,
        workerId,
        grossAmount,
        currency,
        notes,
        status: PayrollItemStatus.PENDING,
      },
    });

    // Record audit log
    await this.auditLogService.create(
      tenantId,
      actorUserId,
      'PAYROLL_ITEM_ADDED',
      'PayrollItem',
      item.id,
      { grossAmount, currency }
    );

    return item;
  }

  async updatePayrollItemStatus(
    itemId: string,
    status: PayrollItemStatus,
    grossAmount?: number,
    notes?: string | null,
    tenantId?: string,
    actorUserId?: string
  ) {
    const item = await this.prisma.payrollItem.findUnique({
      where: { id: itemId },
      include: { payrollCycle: true },
    });

    if (!item) {
      throw new NotFoundException(`Payroll item ${itemId} not found`);
    }

    if (tenantId && item.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Payroll item belongs to another tenant');
    }

    if (item.payrollCycle.status === 'CLOSED' || item.payrollCycle.status === 'PAID') {
      throw new BadRequestException('Cannot modify items in a closed or paid payroll cycle');
    }

    const updatedItem = await this.prisma.payrollItem.update({
      where: { id: itemId },
      data: {
        status: status as any,
        grossAmount: grossAmount !== undefined ? grossAmount : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return updatedItem;
  }
}
