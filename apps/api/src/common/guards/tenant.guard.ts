import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@gwos/shared';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Tenant check failed: User is not authenticated');
    }

    // Platform Admins and Internal Ops can bypass tenant checks (cross-tenant)
    if (
      user.role === UserRole.PLATFORM_ADMIN ||
      user.role === UserRole.INTERNAL_OPS
    ) {
      // Put a helper on the request to show they are cross-tenant
      request.isCrossTenant = true;
      
      // If a specific tenantId is passed in query or headers, we can bind it
      const headerTenantId = request.headers['x-tenant-id'] || request.query.tenantId || request.body.tenantId;
      if (headerTenantId) {
        request.tenantId = headerTenantId;
      }
      return true;
    }

    // Client/Worker users MUST have a tenant ID
    if (!user.tenantId) {
      throw new ForbiddenException('Access denied: User is not bound to any tenant');
    }

    // Bind user tenant ID to request object for automatic service filters
    request.tenantId = user.tenantId;
    request.isCrossTenant = false;

    // Check if another tenantId was explicitly requested in the query, params, or body, and reject if it mismatch
    const requestedTenantId =
      request.params.tenantId ||
      request.query.tenantId ||
      request.body.tenantId ||
      request.headers['x-tenant-id'];

    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new ForbiddenException(
        `Access denied: You cannot access or modify resources of tenant ${requestedTenantId}`
      );
    }

    return true;
  }
}
