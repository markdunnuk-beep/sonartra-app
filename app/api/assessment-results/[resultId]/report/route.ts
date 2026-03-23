import { resolveAssessmentReportRoute } from './route-handler'

export async function GET(request: Request, { params }: { params: { resultId: string } }) {
  return resolveAssessmentReportRoute(request, params)
}
