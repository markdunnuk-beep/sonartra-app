import 'server-only'

import { parseStoredNormalizedAssessmentPackage } from '@/lib/admin/domain/assessment-package'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '@/lib/admin/domain/assessment-package-v2'
import {
  executeAdminAssessmentSimulation,
  toLegacyCompatibleV2Result,
  type AdminAssessmentSimulationExecutionResult,
  type AdminAssessmentSimulationRequest,
} from '@/lib/admin/domain/assessment-simulation'
import { executeAdminAssessmentSimulationV2 } from '@/lib/admin/domain/assessment-simulation-v2-server'

export * from '@/lib/admin/domain/assessment-simulation'

export function executeAdminAssessmentSimulationForPackage(
  storedPackage: unknown,
  schemaVersion: string | null | undefined,
  request: AdminAssessmentSimulationRequest,
): AdminAssessmentSimulationExecutionResult {
  if (schemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
    const simulation = executeAdminAssessmentSimulationV2(storedPackage, {
      responses: request.responses ?? {},
      locale: request.locale ?? null,
      source: request.source,
      scenarioKey: request.scenarioKey ?? null,
    })

    return {
      ok: simulation.ok,
      errors: simulation.result.errors,
      warnings: simulation.result.warnings,
      result: toLegacyCompatibleV2Result({
        responses: request.responses ?? {},
        locale: request.locale ?? null,
        source: request.source,
        scenarioKey: request.scenarioKey ?? null,
      }, simulation.result),
    }
  }

  const legacyPkg = parseStoredNormalizedAssessmentPackage(storedPackage)
  if (!legacyPkg) {
    return {
      ok: false,
      errors: [{ path: 'package', message: 'No valid normalized package is attached to this version yet.' }],
      warnings: [],
      result: null,
    }
  }

  return executeAdminAssessmentSimulation(legacyPkg, request)
}
