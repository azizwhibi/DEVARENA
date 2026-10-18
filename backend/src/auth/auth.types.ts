export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'developer' | 'recruiter';
  status: 'active' | 'suspended';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
