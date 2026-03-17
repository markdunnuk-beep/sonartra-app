import { NextResponse } from 'next/server';

import { getLatestIndividualResultForUser } from '@/lib/server/individual-results';

export async function GET() {
  const response = await getLatestIndividualResultForUser();

  if (response.state === 'error') {
    return NextResponse.json(response, { status: 500 });
  }

  if (response.state === 'unauthenticated') {
    return NextResponse.json(response, { status: 401 });
  }

  return NextResponse.json(response, { status: 200 });
}
