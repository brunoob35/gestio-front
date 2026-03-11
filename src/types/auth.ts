export interface JwtPayload {
  authorized: boolean;
  userId: number;
  permissions: number;
  exp: number;
  iat: number;
}