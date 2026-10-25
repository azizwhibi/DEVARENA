import { isUUID } from 'class-validator';

export function assertSafeAuthConfig(env: NodeJS.ProcessEnv): void {
  if (env.DEV_BYPASS_AUTH !== 'true') return;
  if (env.NODE_ENV === 'production') {
    throw new Error('DEV_BYPASS_AUTH cannot be enabled in production');
  }
  if (!env.DEV_USER_ID || !isUUID(env.DEV_USER_ID)) {
    throw new Error('DEV_USER_ID must be a UUID when auth bypass is enabled');
  }
}
