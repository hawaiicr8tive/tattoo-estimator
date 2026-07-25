/**
 * Permission catalog and role defaults.
 *
 * Kept dependency-free (no `next/*`, no Supabase) so it can be imported from
 * server components, route handlers, and client components alike — the Controls
 * UI renders the same catalog the server enforces.
 */

export const PERMISSIONS = [
  'page:dashboard',
  'page:trends',
  'page:research',
  'page:library',
  'page:controls',
  'images:generate',
  'images:bulk',
  'library:curate',
  'users:manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLES = ['admin', 'member', 'guest'] as const
export type Role = (typeof ROLES)[number]

/** Human-facing labels + help text, used to render the permission matrix. */
export const PERMISSION_META: Record<Permission, { label: string; description: string; group: string }> = {
  'page:dashboard':  { group: 'Pages',   label: 'Dashboard',       description: 'Trend cycle dashboard and Fusion Lab.' },
  'page:trends':     { group: 'Pages',   label: 'Trends',          description: 'Ingest and edit trend strand data.' },
  'page:research':   { group: 'Pages',   label: 'AI Research',     description: 'Run AI research and fusion analysis.' },
  'page:library':    { group: 'Pages',   label: 'Library',         description: 'Browse generated image library.' },
  'page:controls':   { group: 'Pages',   label: 'Controls',        description: 'Chaos phrases and prompt library.' },
  'images:generate': { group: 'Actions', label: 'Generate images', description: 'Spend credits on real-time image generation.' },
  'images:bulk':     { group: 'Actions', label: 'Bulk batches',    description: 'Queue and cancel large batch jobs.' },
  'library:curate':  { group: 'Actions', label: 'Curate library',  description: 'Favourite, export, and save images and prompts.' },
  'users:manage':    { group: 'Admin',   label: 'Manage users',    description: 'Invite, edit, and disable other users.' },
}

/**
 * Baseline grants per role. A role is only a starting point — each user can
 * layer `grant`/`revoke` overrides on top (see {@link resolvePermissions}).
 */
export const ROLE_DEFAULTS: Record<Role, readonly Permission[]> = {
  // Full access, including user management.
  admin: PERMISSIONS,
  // Day-to-day operator: every page and single-image generation, but no
  // expensive bulk batches and no user management.
  member: [
    'page:dashboard',
    'page:trends',
    'page:research',
    'page:library',
    'page:controls',
    'images:generate',
    'library:curate',
  ],
  // Read-only viewer: can look at trends and the existing library, but cannot
  // spend money or change any stored data.
  guest: ['page:dashboard', 'page:trends', 'page:library'],
}

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  admin:  { label: 'Admin',  description: 'Full access, including user management.' },
  member: { label: 'Member', description: 'All pages, single-image generation, and library curation. No bulk batches.' },
  guest:  { label: 'Guest',  description: 'Read-only: dashboard, trends, and library.' },
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** The shape {@link resolvePermissions} needs — a subset of `AppUser`. */
export interface PermissionSource {
  role: Role
  /** Extra permissions granted beyond the role baseline. */
  grant?: Permission[]
  /** Permissions removed from the role baseline. `revoke` wins over `grant`. */
  revoke?: Permission[]
}

/**
 * Effective permission set: role baseline, plus `grant`, minus `revoke`.
 *
 * `revoke` is applied last so an explicit denial always wins — that way
 * revoking something a role grants by default can never be silently undone by
 * a stale entry in `grant`.
 */
export function resolvePermissions(user: PermissionSource): Set<Permission> {
  const effective = new Set<Permission>(ROLE_DEFAULTS[user.role] ?? [])
  for (const p of user.grant ?? []) if (isPermission(p)) effective.add(p)
  for (const p of user.revoke ?? []) if (isPermission(p)) effective.delete(p)
  return effective
}

export function hasPermission(user: PermissionSource, permission: Permission): boolean {
  return resolvePermissions(user).has(permission)
}

/** Page permission for a pathname, or null if the path isn't a gated page. */
export function permissionForPath(pathname: string): Permission | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  switch (path) {
    case '/':         return 'page:dashboard'
    case '/data':     return 'page:trends'
    case '/research': return 'page:research'
    case '/library':  return 'page:library'
    case '/controls': return 'page:controls'
    default:          return null
  }
}

/** Nav order, also used to pick where to send someone after a denied page. */
export const PAGE_ORDER: readonly { href: string; permission: Permission; label: string }[] = [
  { href: '/',         permission: 'page:dashboard', label: 'Dashboard' },
  { href: '/data',     permission: 'page:trends',    label: 'Trends' },
  { href: '/research', permission: 'page:research',  label: 'AI Research' },
  { href: '/library',  permission: 'page:library',   label: 'Library' },
  { href: '/controls', permission: 'page:controls',  label: 'Controls' },
]

/**
 * First page this user may see, or null when they may see none — callers should
 * treat null as "show a no-access screen" rather than redirecting in a loop.
 */
export function firstAllowedPage(permissions: Set<Permission>): string | null {
  return PAGE_ORDER.find(p => permissions.has(p.permission))?.href ?? null
}
