import { getFirebaseAuth } from "@/lib/firebase";
import {
  type Auth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const COOKIE_NAME = "rhythm_session";
const COOKIE_MAX_AGE_DAYS = 30;

/**
 * Set Firebase Auth persistence to LOCAL on web so login survives refresh and new tabs.
 * No-op on native (Firebase handles persistence there).
 */
export async function setAuthPersistence(auth: Auth): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Not available (e.g. non-web); ignore
  }
}

/**
 * Set a cookie when the user is logged in so we can verify session (e.g. same-origin checks).
 * Web only; no sensitive data in the cookie.
 */
export function setAuthCookie(): void {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Clear the auth cookie on sign out.
 */
export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Check if the auth cookie is present (e.g. for server or quick client check).
 */
export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${COOKIE_NAME}=`);
}
