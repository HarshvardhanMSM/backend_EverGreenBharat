import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/system.constants';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
