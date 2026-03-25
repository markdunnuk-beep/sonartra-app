const normaliseCategoryToken = (value: string): string => value.trim().toLowerCase()

export const INDIVIDUAL_ASSESSMENT_DEFINITION_CATEGORIES = [
  'individual',
  'behavioural_intelligence',
] as const

export function buildNormalisedCategoryInclusionSql(columnReference: string, categories: readonly string[]): string {
  const normalisedCategories = categories.map(normaliseCategoryToken)
  const sqlLiteralList = normalisedCategories.map((category) => `'${category.replaceAll("'", "''")}'`).join(', ')

  return `(
         ${columnReference} IS NULL
         OR LOWER(BTRIM(${columnReference})) IN (${sqlLiteralList})
       )`
}

export const INDIVIDUAL_ASSESSMENT_DEFINITION_CATEGORY_SQL = buildNormalisedCategoryInclusionSql(
  'ad.category',
  INDIVIDUAL_ASSESSMENT_DEFINITION_CATEGORIES,
)
