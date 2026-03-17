interface UserIdentityInput {
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
}

export function deriveUserDisplayName(input: UserIdentityInput): string {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const emailAddress = input.emailAddress?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (emailAddress) {
    return emailAddress;
  }

  return 'Authenticated user';
}
