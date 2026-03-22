import { NextResponse } from 'next/server';

import { getAuthenticatedIndividualIntelligenceResult } from '@/lib/server/individual-intelligence-result';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const model = await getAuthenticatedIndividualIntelligenceResult();

    if (model.resultStatus === 'unauthenticated') {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    return NextResponse.json(model, { status: 200 });
  } catch (error) {
    console.error('GET /api/results/individual failed:', error);
    return NextResponse.json({ error: 'Unable to load Individual Intelligence result.' }, { status: 500 });
  }
}
