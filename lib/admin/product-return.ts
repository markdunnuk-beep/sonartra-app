import { AUTHENTICATED_HOME_PATH } from '@/lib/auth-redirects'

export const PRODUCT_USER_DASHBOARD_PATH = '/dashboard'
export const DEFAULT_PUBLIC_HOME_PATH = '/'

export type AdminProductReturnReason =
  | 'active_tenant_context'
  | 'user_dashboard'
  | 'authenticated_home'
  | 'public_home'

export interface AdminProductReturnContext {
  organisationId: string | null
  organisationSlug: string | null
  workspaceSlug: string | null
}

interface SearchParamReader {
  get(name: string): string | null
}

export interface AdminProductReturnResolverInput {
  pathname?: string | null
  searchParams?: SearchParamReader | null
  activeOrganisationId?: string | null
  activeOrganisationSlug?: string | null
  selectedWorkspaceSlug?: string | null
  userDashboardHref?: string | null
  authenticatedProductHref?: string | null
  publicHomeHref?: string | null
}

export interface AdminProductReturnDestination {
  href: string
  reason: AdminProductReturnReason
  context: AdminProductReturnContext
}

const ORGANISATION_ROUTE_PATTERN = /^\/admin\/organisations\/([^/?#]+)/

function normaliseOptionalValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function extractPathScopedOrganisationId(pathname?: string | null): string | null {
  const matched = pathname?.match(ORGANISATION_ROUTE_PATTERN)?.[1]
  return normaliseOptionalValue(matched)
}

function readSearchParam(
  searchParams: AdminProductReturnResolverInput['searchParams'],
  key: string,
): string | null {
  if (!searchParams) {
    return null
  }

  return normaliseOptionalValue(searchParams.get(key))
}

function resolveActiveContext(input: AdminProductReturnResolverInput): AdminProductReturnContext {
  const pathOrganisationId = extractPathScopedOrganisationId(input.pathname)
  const searchOrganisationId = readSearchParam(input.searchParams, 'organisationId')
  const searchOrganisationSlug = readSearchParam(input.searchParams, 'organisationSlug')
  const searchWorkspaceSlug = readSearchParam(input.searchParams, 'workspace') ?? readSearchParam(input.searchParams, 'workspaceSlug')

  const organisationId = pathOrganisationId ?? searchOrganisationId ?? normaliseOptionalValue(input.activeOrganisationId)
  const organisationSlug =
    searchOrganisationSlug ??
    (organisationId !== null && organisationId === normaliseOptionalValue(input.activeOrganisationId)
      ? normaliseOptionalValue(input.activeOrganisationSlug)
      : null)
  const workspaceSlug = searchWorkspaceSlug ?? normaliseOptionalValue(input.selectedWorkspaceSlug)

  return {
    organisationId,
    organisationSlug,
    workspaceSlug,
  }
}

function appendProductContext(href: string, context: AdminProductReturnContext): string {
  const url = new URL(href, 'https://sonartra.local')

  if (context.organisationId) {
    url.searchParams.set('organisationId', context.organisationId)
  }

  if (context.organisationSlug) {
    url.searchParams.set('organisationSlug', context.organisationSlug)
  }

  if (context.workspaceSlug) {
    url.searchParams.set('workspace', context.workspaceSlug)
  }

  const query = url.searchParams.toString()
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
}

export function resolveAdminProductReturnDestination(
  input: AdminProductReturnResolverInput = {},
): AdminProductReturnDestination {
  const context = resolveActiveContext(input)
  const userDashboardHref = input.userDashboardHref === undefined ? PRODUCT_USER_DASHBOARD_PATH : normaliseOptionalValue(input.userDashboardHref)
  const authenticatedProductHref =
    input.authenticatedProductHref === undefined ? AUTHENTICATED_HOME_PATH : normaliseOptionalValue(input.authenticatedProductHref)
  const publicHomeHref = input.publicHomeHref === undefined ? DEFAULT_PUBLIC_HOME_PATH : normaliseOptionalValue(input.publicHomeHref) ?? DEFAULT_PUBLIC_HOME_PATH

  if (context.organisationId || context.organisationSlug || context.workspaceSlug) {
    const scopedBaseHref = userDashboardHref ?? authenticatedProductHref

    if (scopedBaseHref) {
      return {
        href: appendProductContext(scopedBaseHref, context),
        reason: 'active_tenant_context',
        context,
      }
    }
  }

  if (userDashboardHref) {
    return {
      href: userDashboardHref,
      reason: 'user_dashboard',
      context,
    }
  }

  if (authenticatedProductHref) {
    return {
      href: authenticatedProductHref,
      reason: 'authenticated_home',
      context,
    }
  }

  return {
    href: publicHomeHref,
    reason: 'public_home',
    context,
  }
}
