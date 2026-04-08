import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "../types/auth";

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function removeToken() {
  localStorage.removeItem("token");
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function getUserPermissions(): number | null {
  const token = getToken();
  if (!token) return null;

  const decoded = decodeToken(token);
  if (!decoded) return null;

  return decoded.permissions;
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;

  return decoded.exp * 1000 < Date.now();
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  return !isTokenExpired(token);
}

export interface JwtPayload {
  authorized: boolean;
  userId: number;
  permissions: number;
  exp: number;
  iat: number;
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("permissions");
}