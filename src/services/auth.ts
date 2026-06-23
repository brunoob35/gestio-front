import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "../types/auth";

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function setLGPDPending(value: boolean) {
  localStorage.setItem("lgpd_pending", value ? "1" : "0");
}

export function isLGPDPending() {
  return localStorage.getItem("lgpd_pending") === "1";
}

export function clearLGPDPending() {
  localStorage.removeItem("lgpd_pending");
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function removeToken() {
  localStorage.removeItem("token");
  clearLGPDPending();
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

export function hasPermission(
  userPermissions: number | null,
  requiredPermission: number
): boolean {
  if (userPermissions === null) return false;
  return (userPermissions & requiredPermission) === requiredPermission;
}

export function getCurrentUserId(): number | null {
  const token = getToken();
  if (!token) return null;

  const decoded = decodeToken(token);
  if (!decoded?.userId) return null;

  return decoded.userId;
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

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("permissions");
  clearLGPDPending();
}
