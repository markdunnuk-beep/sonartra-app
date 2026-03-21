import type { SonartraAssessmentPackageV1 } from '@/lib/admin/domain/assessment-package'

export type SonartraPackageContentProvenance = 'package_authored_localized' | 'package_authored_default_locale' | 'system_fallback' | 'blocked'
export type SonartraPackageContentMode = 'language_key' | 'inline'
export type SonartraPackageContentFallbackReason =
  | 'missing_requested_locale'
  | 'missing_requested_language_key'
  | 'missing_default_locale_language_key'
  | 'missing_requested_inline_locale'
  | 'missing_default_inline_content'
  | 'missing_content_reference'

export interface SonartraAssessmentPackageInlineContent {
  default: string
  locales?: Record<string, string>
}

export interface SonartraAssessmentPackageAuthoredContentReference {
  key?: string | null
  inline?: string | SonartraAssessmentPackageInlineContent | null
}

export interface SonartraAssessmentPackageAuthoredSectionContent {
  title?: SonartraAssessmentPackageAuthoredContentReference | null
  body?: SonartraAssessmentPackageAuthoredContentReference | null
}

export interface SonartraAssessmentPackageOutputDimensionNarrativeBandVariant {
  bandKey: string
  title?: SonartraAssessmentPackageAuthoredContentReference | null
  body?: SonartraAssessmentPackageAuthoredContentReference | null
}

export interface SonartraAssessmentPackageOutputDimensionNarrative {
  dimensionId: string
  title?: SonartraAssessmentPackageAuthoredContentReference | null
  body?: SonartraAssessmentPackageAuthoredContentReference | null
  bandNarratives?: SonartraAssessmentPackageOutputDimensionNarrativeBandVariant[]
}

export interface SonartraAssessmentPackageOutputRuleNarrativeVariant {
  bandKey: string
  summaryHeadline?: SonartraAssessmentPackageAuthoredContentReference | null
  summaryBody?: SonartraAssessmentPackageAuthoredContentReference | null
  strengths?: SonartraAssessmentPackageAuthoredSectionContent | null
  watchouts?: SonartraAssessmentPackageAuthoredSectionContent | null
  recommendations?: SonartraAssessmentPackageAuthoredSectionContent | null
}

export interface SonartraAssessmentPackageOutputRuleNarrative {
  summaryHeadline?: SonartraAssessmentPackageAuthoredContentReference | null
  summaryBody?: SonartraAssessmentPackageAuthoredContentReference | null
  strengths?: SonartraAssessmentPackageAuthoredSectionContent | null
  watchouts?: SonartraAssessmentPackageAuthoredSectionContent | null
  recommendations?: SonartraAssessmentPackageAuthoredSectionContent | null
  dimensionNarratives?: SonartraAssessmentPackageOutputDimensionNarrative[]
  variants?: SonartraAssessmentPackageOutputRuleNarrativeVariant[]
}

export interface SonartraAssessmentPackageLocaleContext {
  locale: string
  defaultLocale: string
  localeText: Record<string, string>
  defaultLocaleText: Record<string, string>
  availableLocales: string[]
  requestedLocale: string | null
  localeFallbackUsed: boolean
  localeFallbackPath: string[]
}

export interface SonartraAssessmentPackageResolvedContent {
  text: string | null
  provenance: Exclude<SonartraPackageContentProvenance, 'system_fallback' | 'blocked'> | 'blocked'
  localeUsed: string | null
  mode: SonartraPackageContentMode | null
  languageKeys: string[]
  fallbackPath: SonartraPackageContentFallbackReason[]
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeLocaleText(input: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    const trimmedValue = asTrimmedString(value)
    if (trimmedValue) {
      normalized[key] = trimmedValue
    }
  }
  return normalized
}

export function resolveAssessmentPackageLocaleContext(
  pkg: SonartraAssessmentPackageV1,
  requestedLocale?: string | null,
): SonartraAssessmentPackageLocaleContext {
  const availableLocales = pkg.language.locales.map((entry) => entry.locale)
  const requested = requestedLocale?.trim() || null
  const exactMatch = requested ? pkg.language.locales.find((entry) => entry.locale === requested) ?? null : null
  const defaultMatch = pkg.language.locales.find((entry) => entry.locale === pkg.meta.defaultLocale) ?? null
  const firstMatch = pkg.language.locales[0] ?? null
  const effectiveLocale = exactMatch?.locale ?? defaultMatch?.locale ?? firstMatch?.locale ?? 'en'
  const localeText = exactMatch?.text ?? defaultMatch?.text ?? firstMatch?.text ?? {}
  const defaultLocale = defaultMatch?.locale ?? firstMatch?.locale ?? pkg.meta.defaultLocale ?? effectiveLocale
  const defaultLocaleText = defaultMatch?.text ?? firstMatch?.text ?? localeText
  const localeFallbackPath: string[] = []

  if (requested && !exactMatch) {
    localeFallbackPath.push(`Requested locale \"${requested}\" was unavailable.`)
  }
  if (!exactMatch && defaultMatch && effectiveLocale === defaultMatch.locale) {
    localeFallbackPath.push(`Default locale \"${defaultLocale}\" was used.`)
  }
  if (!exactMatch && !defaultMatch && firstMatch) {
    localeFallbackPath.push(`First available locale \"${firstMatch.locale}\" was used.`)
  }

  return {
    locale: effectiveLocale,
    defaultLocale,
    localeText,
    defaultLocaleText,
    availableLocales,
    requestedLocale: requested,
    localeFallbackUsed: localeFallbackPath.length > 0,
    localeFallbackPath,
  }
}

function getInlineLocalizedText(
  inline: string | SonartraAssessmentPackageInlineContent,
  locale: string,
  defaultLocale: string,
): { localized: string | null, defaultValue: string | null } {
  if (typeof inline === 'string') {
    const trimmed = asTrimmedString(inline)
    return {
      localized: locale === defaultLocale ? trimmed : null,
      defaultValue: trimmed,
    }
  }

  const localized = asTrimmedString(inline.locales?.[locale])
  const defaultValue = asTrimmedString(inline.locales?.[defaultLocale]) ?? asTrimmedString(inline.default)
  return { localized, defaultValue }
}

export function resolveAssessmentPackageAuthoredContent(
  reference: SonartraAssessmentPackageAuthoredContentReference | null | undefined,
  localeContext: SonartraAssessmentPackageLocaleContext,
): SonartraAssessmentPackageResolvedContent {
  const fallbackPath: SonartraPackageContentFallbackReason[] = []

  if (!reference || (!reference.key && !reference.inline)) {
    return {
      text: null,
      provenance: 'blocked',
      localeUsed: null,
      mode: null,
      languageKeys: [],
      fallbackPath: ['missing_content_reference'],
    }
  }

  const languageKeys = reference.key ? [reference.key] : []
  const requestedValue = reference.key ? asTrimmedString(localeContext.localeText[reference.key]) : null
  if (requestedValue) {
    return {
      text: requestedValue,
      provenance: 'package_authored_localized',
      localeUsed: localeContext.locale,
      mode: 'language_key',
      languageKeys,
      fallbackPath,
    }
  }
  if (reference.key) {
    fallbackPath.push(localeContext.locale === localeContext.defaultLocale ? 'missing_requested_language_key' : 'missing_requested_language_key')
  }

  const inline = reference.inline ?? null
  if (inline) {
    const { localized, defaultValue } = getInlineLocalizedText(inline, localeContext.locale, localeContext.defaultLocale)
    if (localized) {
      return {
        text: localized,
        provenance: 'package_authored_localized',
        localeUsed: localeContext.locale,
        mode: 'inline',
        languageKeys,
        fallbackPath,
      }
    }
    fallbackPath.push('missing_requested_inline_locale')

    if (reference.key) {
      const defaultValueForKey = asTrimmedString(localeContext.defaultLocaleText[reference.key])
      if (defaultValueForKey) {
        return {
          text: defaultValueForKey,
          provenance: 'package_authored_default_locale',
          localeUsed: localeContext.defaultLocale,
          mode: 'language_key',
          languageKeys,
          fallbackPath,
        }
      }
      fallbackPath.push('missing_default_locale_language_key')
    }

    if (defaultValue) {
      return {
        text: defaultValue,
        provenance: 'package_authored_default_locale',
        localeUsed: localeContext.defaultLocale,
        mode: 'inline',
        languageKeys,
        fallbackPath,
      }
    }
    fallbackPath.push('missing_default_inline_content')
  } else if (reference.key) {
    const defaultValueForKey = asTrimmedString(localeContext.defaultLocaleText[reference.key])
    if (defaultValueForKey) {
      return {
        text: defaultValueForKey,
        provenance: 'package_authored_default_locale',
        localeUsed: localeContext.defaultLocale,
        mode: 'language_key',
        languageKeys,
        fallbackPath,
      }
    }
    fallbackPath.push('missing_default_locale_language_key')
  }

  return {
    text: null,
    provenance: 'blocked',
    localeUsed: null,
    mode: null,
    languageKeys,
    fallbackPath,
  }
}

export function normalizeAuthoredInlineContent(input: unknown): string | SonartraAssessmentPackageInlineContent | null {
  const simple = asTrimmedString(input)
  if (simple) {
    return simple
  }

  if (!isRecord(input)) {
    return null
  }

  const defaultValue = asTrimmedString(input.default)
  const localesInput = isRecord(input.locales) ? input.locales : null
  const locales = localesInput ? normalizeLocaleText(localesInput) : undefined
  if (!defaultValue && (!locales || Object.keys(locales).length === 0)) {
    return null
  }

  return {
    default: defaultValue ?? Object.values(locales ?? {})[0] ?? '',
    ...(locales && Object.keys(locales).length > 0 ? { locales } : {}),
  }
}
