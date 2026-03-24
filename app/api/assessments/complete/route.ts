import { postCompleteAssessment } from '@/lib/server/complete-assessment-route';

export async function POST(request: Request) {
  return postCompleteAssessment(request);
}
