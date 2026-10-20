import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(protected readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    req.user = await this.auth.authenticate(req.headers.authorization);
    return true;
  }
}

@Injectable()
export class AdminGuard extends UserGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest<Request>();
    if (req.user?.role !== 'admin') throw new ForbiddenException();
    return true;
  }
}

@Injectable()
export class RecruiterGuard extends UserGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest<Request>();
    if (req.user?.role !== 'recruiter' && req.user?.role !== 'admin') {
      throw new ForbiddenException();
    }
    return true;
  }
}

@Injectable()
export class OptionalAuthGuard extends UserGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.headers.authorization === undefined) {
      req.user = undefined;
      return true;
    }
    return super.canActivate(context);
  }
}
