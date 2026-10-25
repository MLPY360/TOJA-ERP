/**
 * Whitelist of Super Admin Emails with unrestricted system access.
 * Only authenticated users matching these emails can hold the 'admin' role
 * or access the manual role switcher testing controls.
 */
export const SUPER_ADMIN_EMAILS = [
  'mohameedhasan81@gmail.com'
];

/**
 * Check if a given user object or email belongs to a Super Admin.
 * Case-insensitive comparison with whitespace trimming.
 *
 * @param {string | { email?: string }} emailOrUser
 * @returns {boolean}
 */
export const isSuperAdmin = (emailOrUser) => {
  if (!emailOrUser) return false;
  const email = typeof emailOrUser === 'string' ? emailOrUser : emailOrUser?.email;
  if (!email || typeof email !== 'string') return false;
  const target = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.trim().toLowerCase() === target);
};
