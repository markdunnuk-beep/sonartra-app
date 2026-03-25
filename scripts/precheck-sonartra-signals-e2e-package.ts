import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validatePackageV2 } from '../lib/server/package-validator-v2'
import { compilePackageToRuntimeContract } from '../lib/server/package-compiler-v2'

const packagePath = resolve(process.cwd(), 'fixtures/packages/sonartra-signals-e2e-v1-cleanroom.json')

const requiredDomains = [
  'behaviour_style',
  'motivators',
  'leadership',
  'conflict',
  'culture',
  'stress',
] as const

const requiredSignals = [
  'behaviour_style_driver',
  'behaviour_style_analyst',
  'behaviour_style_influencer',
  'behaviour_style_stabiliser',
  'motivators_mastery',
  'motivators_achievement',
  'motivators_influence',
  'motivators_stability',
  'leadership_results',
  'leadership_vision',
  'leadership_people',
  'leadership_process',
  'conflict_compete',
  'conflict_collaborate',
  'conflict_compromise',
  'conflict_avoid',
  'conflict_accommodate',
  'culture_performance',
  'culture_control',
  'culture_collaboration',
  'culture_innovation',
  'stress_control',
  'stress_overdrive',
  'stress_withdraw',
  'stress_support',
] as const

const parsed: unknown = JSON.parse(readFileSync(packagePath, 'utf8'))
const validation = validatePackageV2(parsed)

if (!validation.valid || !validation.normalized) {
  console.error(JSON.stringify({ ok: false, stage: 'validatePackageV2', errors: validation.errors }, null, 2))
  process.exit(1)
}

const runtime = compilePackageToRuntimeContract(validation.normalized)
const allMappings = Object.values(runtime.compiledSignalMappings).flat()

const orphanMappings = allMappings.filter((mapping) => !runtime.compiledOptions.some((option) => option.id === mapping.optionId)).length
const duplicateQuestionIds = runtime.compiledQuestions.length - new Set(runtime.compiledQuestions.map((question) => question.id)).size
const duplicateOptionIds = runtime.compiledOptions.length - new Set(runtime.compiledOptions.map((option) => option.id)).size

const summary = {
  metadata: runtime.metadata,
  counts: {
    questionSets: validation.normalized.questionSets.length,
    questions: runtime.compiledQuestions.length,
    options: runtime.compiledOptions.length,
    mappings: allMappings.length,
    uniqueSignals: runtime.signalRegistry.signalKeys.length,
    uniqueDomains: runtime.signalRegistry.domains.length,
  },
  completeness: {
    everyQuestionHasFourOptions: runtime.compiledQuestions.every((question) => question.options.length === 4),
    everyOptionHasMapping: runtime.compiledOptions.every((option) => allMappings.some((mapping) => mapping.optionId === option.id)),
    orphanMappings,
    duplicateQuestionIds,
    duplicateOptionIds,
  },
  requiredCoverage: {
    missingDomains: requiredDomains.filter((domain) => !runtime.signalRegistry.domains.includes(domain)),
    missingSignals: requiredSignals.filter((signal) => !runtime.signalRegistry.signalKeys.includes(signal)),
  },
  output: runtime.outputConfig,
  normalization: runtime.normalizationPrep,
}

const hasCoverageGaps = summary.requiredCoverage.missingDomains.length > 0 || summary.requiredCoverage.missingSignals.length > 0
const hasStructuralIssues = orphanMappings > 0 || duplicateQuestionIds > 0 || duplicateOptionIds > 0

if (hasCoverageGaps || hasStructuralIssues || !summary.completeness.everyQuestionHasFourOptions || !summary.completeness.everyOptionHasMapping) {
  console.error(JSON.stringify({ ok: false, stage: 'compilePackageToRuntimeContract', summary }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, summary }, null, 2))
