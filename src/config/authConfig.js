/**
 * TOJA ERP Authentication & Authorization Configuration
 * 
 * Strict access control whitelist and role determination for Super Admin,
 * authorized partners, operations staff, and preview environment testing.
 */

// Super Admin Whitelist: Unrestricted access, bypasses all locks
export const SUPER_ADMIN_EMAILS = [
  'mohameedhasan81@gmail.com'
];

// Authorized Partners & Operations Staff Whitelist for ERP & Preview Testing
export const PARTNER_STAFF_EMAILS = [
  'mohameedhasan81@gmail.com',
  'arnos@toja.com',
  'yossef@toja.com',
  'moustafa@toja.com',
  'mahmoud@toja.com',
  'memo@toja.com',
  'shaqra@toja.com',
  'ahmed@toja.com',
  'partner@toja.com',
  'partners@toja.com',
  'toja.partner@gmail.com',
  'ops@toja.com',
  'admin@toja.com',
  'test@toja.com',
  'demo@toja.com'
];

/**
 * Check if a given user object or email belongs to the Super Admin.
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

/**
 * Check if a given user object or email belongs to an authorized partner or staff member.
 * Case-insensitive comparison with whitespace trimming and domain check.
 *
 * @param {string | { email?: string }} emailOrUser
 * @returns {boolean}
 */
export const isPartnerStaff = (emailOrUser) => {
  if (!emailOrUser) return false;
  const email = typeof emailOrUser === 'string' ? emailOrUser : emailOrUser?.email;
  if (!email || typeof email !== 'string') return false;
  const target = email.trim().toLowerCase();

  // Super admin is always partner staff
  if (isSuperAdmin(target)) return true;

  // Direct email match in partner staff whitelist
  if (PARTNER_STAFF_EMAILS.some(pEmail => pEmail.trim().toLowerCase() === target)) {
    return true;
  }

  // Any official company domain account (@toja.com)
  if (target.endsWith('@toja.com')) {
    return true;
  }

  return false;
};

// Aliases for compatibility
export const isAuthorizedStaff = isPartnerStaff;
export const isAuthorizedStaffEmail = isPartnerStaff;

/**
 * Partner profile details for quick UI identification
 */
export const PARTNER_ACCOUNTS_DIRECTORY = [
  {
    name: 'Ahmed Arnos',
    nameAr: 'أحمد عرنوس',
    email: 'arnos@toja.com',
    role: 'operations',
    category: 'sales',
    roleTitleAr: 'المبيعات والتشغيل والمصانع',
    roleTitleEn: 'Sales & Production Ops'
  },
  {
    name: 'Mohamed Hassan',
    nameAr: 'محمد حسان',
    email: 'mohameedhasan81@gmail.com',
    role: 'admin',
    category: 'marketing',
    roleTitleAr: 'المدير العام والتسويق والإشراف الكامل',
    roleTitleEn: 'Super Admin & Growth'
  },
  {
    name: 'Yossef Sameh',
    nameAr: 'يوسف سامح',
    email: 'yossef@toja.com',
    role: 'operations',
    category: 'creative',
    roleTitleAr: 'الهوية البصرية وتصاميم الميديا وصناعة المحتوى',
    roleTitleEn: 'Creative & Content'
  },
  {
    name: 'Moustafa Ebrahim',
    nameAr: 'مصطفى إبراهيم',
    email: 'moustafa@toja.com',
    role: 'operations',
    category: 'operations_shipping',
    roleTitleAr: 'العمليات والشحن وتجهيز الطلبات والمرتجعات',
    roleTitleEn: 'Logistics & Shipping'
  },
  {
    name: 'Demo Partner',
    nameAr: 'حساب تجريبي للشركاء',
    email: 'partner@toja.com',
    role: 'operations',
    category: 'general',
    roleTitleAr: 'معاينة تجريبية لجميع أقسام السيستم',
    roleTitleEn: 'Partner Preview & Demo Access'
  }
];

