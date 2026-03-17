import { auth, currentUser } from '@clerk/nextjs/server';

import { queryDb, withTransaction } from '@/lib/db';

interface DbUserRow {
  id: string;
  external_auth_id: string | null;
  email: string;
}

export interface AuthenticatedAppUser {
  clerkUserId: string;
  dbUserId: string;
  email: string;
}

export async function resolveAuthenticatedAppUser(): Promise<AuthenticatedAppUser | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const existing = await queryDb<DbUserRow>(
    `SELECT id, external_auth_id, email
     FROM users
     WHERE external_auth_id = $1
     LIMIT 1`,
    [userId]
  );

  if (existing.rows[0]) {
    return {
      clerkUserId: userId,
      dbUserId: existing.rows[0].id,
      email: existing.rows[0].email,
    };
  }

  const clerkUser = await currentUser();
  const emailAddress = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress;

  if (!emailAddress) {
    throw new Error('Authenticated Clerk user is missing an email address.');
  }

  const firstName = clerkUser?.firstName ?? null;
  const lastName = clerkUser?.lastName ?? null;

  const upserted = await withTransaction(async (client) => {
    const result = await client.query<DbUserRow>(
      `INSERT INTO users (external_auth_id, email, first_name, last_name, account_type)
       VALUES ($1, $2, $3, $4, 'individual')
       ON CONFLICT (email)
       DO UPDATE SET
         external_auth_id = EXCLUDED.external_auth_id,
         first_name = COALESCE(EXCLUDED.first_name, users.first_name),
         last_name = COALESCE(EXCLUDED.last_name, users.last_name),
         updated_at = NOW()
       RETURNING id, external_auth_id, email`,
      [userId, emailAddress, firstName, lastName]
    );

    return result.rows[0];
  });

  return {
    clerkUserId: userId,
    dbUserId: upserted.id,
    email: upserted.email,
  };
}
