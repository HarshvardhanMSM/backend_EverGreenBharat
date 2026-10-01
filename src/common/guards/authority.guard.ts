import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthorityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Super Admin has unrestricted authority
    if (user.admin?.isSuperAdmin) {
      return true;
    }

    // Protect target super admin resources from non-super admins
    const targetIsSuperAdmin = request.targetAdmin?.isSuperAdmin;
    if (targetIsSuperAdmin) {
      throw new ForbiddenException(
        'Only Super Administrators can perform operations on Super Admin accounts',
      );
    }

    return true;
  }
}
