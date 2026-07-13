// ═══════════════════════════════════════════════════════════
// Admin Authentication — Password management
// ═══════════════════════════════════════════════════════════

const PASSWORD_KEY = 'sat_admin_password_hash';
const TOKEN_KEY = 'admin_token';
const DEFAULT_PASSWORD = 'sat123';

// Simple hash function (not cryptographically secure but sufficient for client-side)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'sat_' + Math.abs(hash).toString(36) + '_hash';
}

// Get stored password hash
export function getStoredPasswordHash(): string {
  const stored = localStorage.getItem(PASSWORD_KEY);
  if (stored) return stored;
  // Default password on first run
  const defaultHash = hashPassword(DEFAULT_PASSWORD);
  localStorage.setItem(PASSWORD_KEY, defaultHash);
  return defaultHash;
}

// Verify password
export function verifyPassword(password: string): boolean {
  const hash = hashPassword(password);
  const stored = getStoredPasswordHash();
  return hash === stored;
}

// Change password
export function changePassword(currentPassword: string, newPassword: string): { success: boolean; message: string } {
  // Verify current password
  if (!verifyPassword(currentPassword)) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
  }

  // Validate new password
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' };
  }

  // Store new password
  const newHash = hashPassword(newPassword);
  localStorage.setItem(PASSWORD_KEY, newHash);

  // Clear auth token to force re-login
  localStorage.removeItem(TOKEN_KEY);

  return { success: true, message: 'تم تغيير كلمة المرور بنجاح. سجل الدخول مرة أخرى.' };
}

// Reset to default
export function resetPasswordToDefault(): void {
  const defaultHash = hashPassword(DEFAULT_PASSWORD);
  localStorage.setItem(PASSWORD_KEY, defaultHash);
  localStorage.removeItem(TOKEN_KEY);
}

// Check if logged in
export function isLoggedIn(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

// Login
export function login(password: string): boolean {
  if (verifyPassword(password)) {
    localStorage.setItem(TOKEN_KEY, 'local_auth_token_' + Date.now());
    return true;
  }
  return false;
}

// Logout
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}
