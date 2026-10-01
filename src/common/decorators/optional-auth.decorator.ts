import { SetMetadata } from '@nestjs/common';
import { IS_OPTIONAL_AUTH_KEY } from '../constants/system.constants';

export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
