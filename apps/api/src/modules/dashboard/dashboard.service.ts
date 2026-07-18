import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId?: string) {
    const tenantFilter = tenantId ? { tenantId } : {};

    // 1. Total Active Workers
    const activeWorkersCount = await this.prisma.worker.count({
      where: { ...tenantFilter, employmentStatus: 'ACTIVE' },
    });

    // 2. Workers Onboarding
    const onboardingWorkersCount = await this.prisma.worker.count({
      where: { ...tenantFilter, employmentStatus: 'ONBOARDING' },
    });

    // 3. Blocked Onboarding Tasks
    const blockedTasksCount = await this.prisma.onboardingTask.count({
      where: { ...tenantFilter, status: 'BLOCKED' },
    });

    // 4. Open Support Cases
    const openSupportCasesCount = await this.prisma.supportCase.count({
      where: { ...tenantFilter, status: 'OPEN' },
    });

    // 5. Payroll Cycles In Review
    const payrollCyclesInReviewCount = await this.prisma.payrollCycle.count({
      where: { ...tenantFilter, status: 'REVIEW' },
    });

    // 6. Documents Pending Review
    const documentsPendingCount = await this.prisma.document.count({
      where: { ...tenantFilter, status: 'PENDING_REVIEW' },
    });

    // 7. Upcoming Worker Start Dates
    const upcomingWorkers = await this.prisma.worker.findMany({
      where: {
        ...tenantFilter,
        startDate: { gte: new Date('2026-01-01') },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        startDate: true,
        company: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
    });

    // 8. Country Distribution
    const countryGroups = await this.prisma.worker.groupBy({
      by: ['countryCode'],
      where: tenantFilter,
      _count: {
        id: true,
      },
    });

    const countryDistribution = countryGroups.map((group) => ({
      countryCode: group.countryCode,
      count: group._count.id,
    }));

    // 9. Recent Audit Activity
    const recentAuditLogs = await this.prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        actor: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const parsedAuditLogs = recentAuditLogs.map((log) => {
      let parsed = {};
      try {
        parsed = JSON.parse(log.metadata);
      } catch (err) {
        parsed = {};
      }
      return {
        ...log,
        metadata: parsed,
      };
    });

    return {
      metrics: {
        activeWorkers: activeWorkersCount,
        onboardingWorkers: onboardingWorkersCount,
        blockedTasks: blockedTasksCount,
        openSupportCases: openSupportCasesCount,
        payrollCyclesInReview: payrollCyclesInReviewCount,
        documentsPendingReview: documentsPendingCount,
      },
      upcomingWorkers,
      countryDistribution,
      recentAuditLogs: parsedAuditLogs,
    };
  }
}
