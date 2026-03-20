import { auth, currentUser } from '@clerk/nextjs/server'
import { ProvisionalAdminRole } from '@/lib/admin/domain'

export type AdminAccessSource = 'email_allowlist' | 'none'
export type ProvisionalAccessContext = {
  role: ProvisionalAdminRole
  rationale: 'bootstrap_allowlist'
}

export interface AdminAccessContext {
  isAuthenticated: boolean
  isAllowed: boolean
  email: string | null
  allowlist: string[]
  accessSource: AdminAccessSource
  provisionalRole: ProvisionalAdminRole | null
  provisionalAccess: ProvisionalAccessContext | null
}

export function getConfiguredAdminEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.SONARTRA_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function buildAdminAccessContext({
  isAuthenticated,
  email,
  allowlist,
}: {
  isAuthenticated: boolean
  email: string | null
  allowlist: string[]
}): AdminAccessContext {
  const normalizedEmail = email?.toLowerCase() ?? null
  const matchedAllowlist = normalizedEmail !== null && allowlist.includes(normalizedEmail)

  if (!isAuthenticated) {
    return {
      isAuthenticated: false,
      isAllowed: false,
      email: null,
      allowlist,
      accessSource: 'none',
      provisionalRole: null,
      provisionalAccess: null,
    }
  }

  return {
    isAuthenticated: true,
    isAllowed: matchedAllowlist,
    email,
    allowlist,
    accessSource: matchedAllowlist ? 'email_allowlist' : 'none',
    provisionalRole: matchedAllowlist ? ProvisionalAdminRole.InternalAdmin : null,
    provisionalAccess: matchedAllowlist
      ? {
          role: ProvisionalAdminRole.InternalAdmin,
          rationale: 'bootstrap_allowlist',
        }
      : null,
  }
}

export async function resolveAdminAccess(env: Record<string, string | undefined> = process.env): Promise<AdminAccessContext> {
  const { userId } = await auth()
  const allowlist = getConfiguredAdminEmails(env)

  if (!userId) {
    return buildAdminAccessContext({
      isAuthenticated: false,
      email: null,
      allowlist,
    })
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null

  return buildAdminAccessContext({
    isAuthenticated: true,
    email,
    allowlist,
  })
}
