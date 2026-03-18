export type {
  ArchetypeConfidence,
  ArchetypeKey,
  ArchetypeResolverInput,
  ArchetypeSummary,
  BehaviourRanking,
} from '@/lib/interpretation/archetypes/archetype-types'
export { buildArchetypeResolverInput } from '@/lib/interpretation/archetypes/section-normalisation'
export { resolveBehaviourRanking, isBalancedBehaviourProfile } from '@/lib/interpretation/archetypes/resolve-behaviour-ranking'
export { resolveArchetypeFromInput, resolveArchetypeSummary, resolveOptionalArchetypeSummary } from '@/lib/interpretation/archetypes/resolve-archetype'
