export const PermissionKeys = {
  // Admin Management
  ADMIN_READ: 'admin:read',
  ADMIN_CREATE: 'admin:create',
  ADMIN_UPDATE: 'admin:update',
  ADMIN_DELETE: 'admin:delete',
  ADMIN_SUSPEND: 'admin:suspend',
  ADMIN_ACTIVATE: 'admin:activate',
  ADMIN_RESTORE: 'admin:restore',
  ADMIN_RESET_PASSWORD: 'admin:reset_password',
  ADMIN_FORCE_LOGOUT: 'admin:force_logout',
  ADMIN_ASSIGN_ROLES: 'admin:assign_roles',

  // Role Management
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_CLONE: 'roles:clone',
  ROLES_ASSIGN_PERMISSIONS: 'roles:assign_permissions',

  // Permission Management
  PERMISSIONS_READ: 'permissions:read',

  // Users Management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_BAN: 'users:ban',

  // Streams Management
  STREAMS_READ: 'streams:read',
  STREAMS_TERMINATE: 'streams:terminate',
  STREAMS_MODERATE: 'streams:moderate',

  // Finance & Payouts
  FINANCE_READ: 'finance:read',
  WITHDRAWALS_APPROVE: 'withdrawals:approve',
  WITHDRAWALS_REJECT: 'withdrawals:reject',

  // System & Settings
  SETTINGS_WRITE: 'settings:write',

  // Audit Management
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',

  // Login History Management
  LOGIN_HISTORY_READ: 'login_history:read',
  LOGIN_HISTORY_EXPORT: 'login_history:export',

  // Session Management
  SESSIONS_READ: 'sessions:read',
  SESSIONS_REVOKE: 'sessions:revoke',

  // ─── Phase 2: Creators (11) ───────────────────────────────────────────────
  CREATORS_READ: 'creators:read',
  CREATORS_WRITE: 'creators:write',
  CREATORS_REVIEW: 'creators:review',
  CREATORS_APPROVE: 'creators:approve',
  CREATORS_REJECT: 'creators:reject',
  CREATORS_VERIFY: 'creators:verify',
  CREATORS_SUSPEND: 'creators:suspend',
  CREATORS_UNSUSPEND: 'creators:unsuspend',
  CREATORS_BAN: 'creators:ban',
  CREATORS_MANAGE_NOTES: 'creators:manage_notes',
  CREATORS_EXPORT: 'creators:export',

  // ─── Phase 2: Categories (4) ──────────────────────────────────────────────
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',

  // ─── Phase 3: Finance & Wallet (14) ───────────────────────────────────────
  WALLETS_READ: 'wallet:read',
  WALLETS_FREEZE: 'wallet:freeze',
  WALLETS_ADJUST: 'wallet:adjust',
  TRANSACTIONS_READ: 'transactions:read',
  TRANSACTIONS_EXPORT: 'transactions:export',
  COIN_PACKAGES_READ: 'coin_packages:read',
  COIN_PACKAGES_CREATE: 'coin_packages:create',
  COIN_PACKAGES_UPDATE: 'coin_packages:update',
  COIN_PACKAGES_DELETE: 'coin_packages:delete',
  PROMOTIONS_MANAGE: 'promotions:manage',
  FINANCE_REPORTS: 'finance:reports',
  FINANCE_RECONCILE: 'finance:reconcile',
  FINANCE_REFUND: 'finance:refund',
  FINANCE_SETTINGS: 'finance:settings',

  // ─── Phase 4: Streaming & Rooms ───────────────────────────────────────────
  ROOMS_READ: 'rooms:read',
  ROOMS_MODERATE: 'rooms:moderate',
  SCHEDULING_READ: 'scheduling:read',
  SCHEDULING_WRITE: 'scheduling:write',

  // ─── Phase 4: Gifts ───────────────────────────────────────────────────────
  GIFTS_READ: 'gifts:read',
  GIFTS_CREATE: 'gifts:create',
  GIFTS_UPDATE: 'gifts:update',
  GIFTS_DELETE: 'gifts:delete',

  // ─── Phase 4: Chat & Video Calls ──────────────────────────────────────────
  CHAT_REQUESTS_READ: 'chat_requests:read',
  CHAT_MODERATE: 'chat:moderate',
  VIDEO_CALLS_READ: 'video_calls:read',
  VIDEO_CALLS_MODERATE: 'video_calls:moderate',

  // ─── Phase 4: Games & Leaderboards ────────────────────────────────────────
  GAMES_READ: 'games:read',
  GAMES_CREATE: 'games:create',
  GAMES_UPDATE: 'games:update',
  GAMES_DELETE: 'games:delete',
  LEADERBOARDS_READ: 'leaderboards:read',

  // ─── Phase 4: Notifications, Earnings & Withdrawals ───────────────────────
  NOTIFICATIONS_SEND: 'notifications:send',
  EARNINGS_READ: 'earnings:read',
} as const;

export type PermissionKey =
  (typeof PermissionKeys)[keyof typeof PermissionKeys];
