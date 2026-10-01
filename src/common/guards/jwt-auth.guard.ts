import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, Observable } from 'rxjs';
import {
  IS_PUBLIC_KEY,
  IS_OPTIONAL_AUTH_KEY,
} from '../constants/system.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isOptional) {
      // Authenticate when a token is present, otherwise continue as guest
      let result: boolean | Promise<boolean> | Observable<boolean>;
      try {
        result = super.canActivate(context);
      } catch {
        return true;
      }
      if (result instanceof Observable) {
        return firstValueFrom(result).catch(() => true);
      }
      return Promise.resolve(result).catch(() => true);
    }

    return super.canActivate(context);
  }
}
