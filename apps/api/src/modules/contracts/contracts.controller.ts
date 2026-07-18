import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ContractCreateSchema, ContractCreateInput, ContractStatus } from '@gwos/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ContractsService } from './contracts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('contracts')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async findAll(@Req() req: any, @CurrentUser() user: any) {
    if (user.role === UserRole.WORKER) {
      throw new ForbiddenException('Access denied: Workers cannot list contract pools');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.contractsService.findAll(filterTenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any, @CurrentUser() user: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    const contract = await this.contractsService.findOne(id, filterTenantId);

    // Worker can only view their own contract
    if (user.role === UserRole.WORKER && user.workerId !== contract.workerId) {
      throw new ForbiddenException('Access denied: You can only view your own employment contract');
    }

    return contract;
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  @UsePipes(new ZodValidationPipe(ContractCreateSchema))
  async create(
    @Body() input: ContractCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required for platform/ops roles to draft a contract');
    }

    return this.contractsService.create(input, targetTenantId, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  @UsePipes(new ZodValidationPipe(ContractCreateSchema))
  async update(
    @Param('id') id: string,
    @Body() input: ContractCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.contractsService.update(id, input, filterTenantId, user.sub);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ContractStatus },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.status) {
      throw new BadRequestException('status field is required in request body');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;

    // Worker role signature check
    if (user.role === UserRole.WORKER) {
      const contract = await this.contractsService.findOne(id, filterTenantId);
      
      if (contract.workerId !== user.workerId) {
        throw new ForbiddenException('Access denied: You can only sign your own contract');
      }

      if (body.status !== ContractStatus.SIGNED) {
        throw new ForbiddenException('Access denied: Workers are only permitted to sign their contract (transition to SIGNED)');
      }
    }

    return this.contractsService.updateStatus(id, body.status, filterTenantId, user.sub);
  }
}
