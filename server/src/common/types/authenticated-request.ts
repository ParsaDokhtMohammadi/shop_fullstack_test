import type { Request } from 'express';
import { JwtPayload } from '../utils/jwt.util';

// What the auth guard puts on the request, and what @CurrentUser() reads back.
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
