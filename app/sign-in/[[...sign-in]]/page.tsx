import { SignIn } from '@clerk/nextjs';

import { PublicNav } from '@/components/layout/PublicNav';

export default function SignInPage() {
  return (
    <div>
      <PublicNav />
      <section className="section flex justify-center">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
      </section>
    </div>
  );
}
