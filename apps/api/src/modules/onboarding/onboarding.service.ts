import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingTaskStatus, OnboardingStatus, UserRole } from '@gwos/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findPlanByWorker(workerId: string, tenantId?: string) {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { workerId },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        worker: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Onboarding plan for worker ${workerId} not found`);
    }

    if (tenantId && plan.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Onboarding plan belongs to another tenant');
    }

    // Calculate progress percentage
    const totalTasks = plan.tasks.length;
    const completedTasks = plan.tasks.filter((t) => t.status === OnboardingTaskStatus.DONE).length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...plan,
      progressPercentage,
    };
  }

  async findTask(taskId: string, tenantId?: string) {
    const task = await this.prisma.onboardingTask.findUnique({
      where: { id: taskId },
      include: { onboardingPlan: true },
    });

    if (!task) {
      throw new NotFoundException(`Onboarding task ${taskId} not found`);
    }

    if (tenantId && task.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Onboarding task belongs to another tenant');
    }

    return task;
  }

  async updateTaskStatus(
    taskId: string,
    status: OnboardingTaskStatus,
    tenantId: string | undefined,
    user: { sub: string; role: UserRole; workerId?: string | null; tenantId?: string | null }
  ) {
    const task = await this.findTask(taskId, tenantId);

    // Security/Role checks:
    // Workers can only update tasks assigned to them, and only for their own onboarding plan!
    if (user.role === UserRole.WORKER) {
      if (task.onboardingPlan.workerId !== user.workerId) {
        throw new ForbiddenException('Access denied: You can only complete your own onboarding tasks');
      }
      if (task.assignedToRole !== UserRole.WORKER) {
        throw new ForbiddenException(`Access denied: This task is assigned to ${task.assignedToRole}, not the Worker`);
      }
    }

    // Client HR can only update tasks inside their tenant
    if (user.role === UserRole.CLIENT_HR && task.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied: You can only complete onboarding tasks for your own tenant');
    }

    const oldStatus = task.status;
    const completedAt = status === OnboardingTaskStatus.DONE ? new Date() : null;

    const updatedTask = await this.prisma.onboardingTask.update({
      where: { id: task.id },
      data: { status: status as any, completedAt },
    });

    // Generate Audit Log for task status change
    await this.auditLogService.create(
      task.tenantId,
      user.sub,
      'ONBOARDING_TASK_STATUS_CHANGED',
      'OnboardingTask',
      task.id,
      { oldStatus, newStatus: status, title: task.title }
    );

    // Refresh plan tasks to check completion status
    const allTasks = await this.prisma.onboardingTask.findMany({
      where: { onboardingPlanId: task.onboardingPlanId },
    });

    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === OnboardingTaskStatus.DONE).length;
    const blocked = allTasks.filter((t) => t.status === OnboardingTaskStatus.BLOCKED).length;

    let newPlanStatus = OnboardingStatus.IN_PROGRESS;
    let planCompletedAt: Date | null = null;

    if (total > 0 && done === total) {
      newPlanStatus = OnboardingStatus.COMPLETED;
      planCompletedAt = new Date();
    } else if (blocked > 0) {
      newPlanStatus = OnboardingStatus.BLOCKED;
    }

    // Update the OnboardingPlan
    const updatedPlan = await this.prisma.onboardingPlan.update({
      where: { id: task.onboardingPlanId },
      data: { status: newPlanStatus as any, completedAt: planCompletedAt },
    });

    // If plan completed, record it
    if (newPlanStatus === OnboardingStatus.COMPLETED && updatedPlan.status !== task.onboardingPlan.status) {
      await this.auditLogService.create(
        task.tenantId,
        null,
        'ONBOARDING_PLAN_COMPLETED',
        'OnboardingPlan',
        updatedPlan.id,
        { workerId: updatedPlan.workerId }
      );
    }

    return updatedTask;
  }
}
