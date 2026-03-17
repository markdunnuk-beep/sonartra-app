const TRACE_PREFIX = '[assessment-flow-trace]'

type TraceValue = string | number | boolean | null | undefined

export function traceAssessmentFlow(stage: string, payload: Record<string, TraceValue> = {}) {
  console.info(TRACE_PREFIX, { stage, ...payload })
}

