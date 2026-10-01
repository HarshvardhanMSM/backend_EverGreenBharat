import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Admin } from '../../admin/entities/admin.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  roles?: string[];
  permissions?: string[];
  isStaff?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key',
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Check if token belongs to an Admin/Staff member in independent admins table
    const admin = await this.adminRepository.findOne({
      where: [{ id: payload.sub }, { email: payload.email?.toLowerCase() }],
      relations: {
        adminRoles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
    });

    if (admin) {
      if (admin.deletedAt || (admin.status as any) === 'SUSPENDED') {
        throw new UnauthorizedException('Staff account deactivated or suspended');
      }

      // Collect roles and permissions from admin entity if not in payload
      const roles = payload.roles && payload.roles.length > 0
        ? payload.roles
        : admin.adminRoles?.map((ar) => ar.role?.code).filter(Boolean) || [];

      const permissions = payload.permissions && payload.permissions.length > 0
        ? payload.permissions
        : admin.adminRoles?.flatMap((ar) =>
            ar.role?.rolePermissions?.map((rp) => rp.permission?.key).filter(Boolean) || [],
          ) || [];

      return {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        displayName: admin.displayName,
        avatarUrl: admin.avatarUrl,
        department: admin.department,
        status: admin.status,
        isSuperAdmin: admin.isSuperAdmin,
        isAdmin: true,
        admin: admin, // keeps req.user.admin compatible with guards
        roles,
        permissions,
      };
    }

    // 2. Otherwise validate standard App Customer/User
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found or account deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      admin: null,
      isAdmin: false,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  }
}
