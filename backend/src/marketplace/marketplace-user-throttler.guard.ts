import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Runs after UserGuard. The bucket is the authenticated user, not the IP. */
@Injectable()
export class MarketplaceUserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user;
    const id =
      user && typeof user === 'object' && 'id' in user ? user.id : undefined;
    if (typeof id !== 'string' || id.length === 0) {
      return Promise.resolve('missing-user');
    }
    return Promise.resolve(`user:${id}`);
  }
}
