export const INDIVIDUAL_RESULTS_CATEGORY_ALIASES = ['individual', 'behavioural_intelligence'] as const

export function buildIndividualResultsCategorySqlPredicate(columnReference: string): string {
  const normalizedColumn = `LOWER(BTRIM(${columnReference}))`
  const quotedCategories = INDIVIDUAL_RESULTS_CATEGORY_ALIASES.map((category) => `'${category}'`).join(', ')

  return `${columnReference} IS NULL OR ${normalizedColumn} IN (${quotedCategories})`
}
