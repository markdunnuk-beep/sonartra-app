import { SignIn } from '@clerk/nextjs';

import { PublicNav } from '@/components/layout/PublicNav';
import { getGenericAuthFallbackRedirectUrl } from '@/lib/auth-redirects';

export default function SignInPage() {
  return (
    <div>
      <PublicNav />
      <section className="section flex justify-center">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl={getGenericAuthFallbackRedirectUrl()} />
      </section>
    </div>
  );
}
