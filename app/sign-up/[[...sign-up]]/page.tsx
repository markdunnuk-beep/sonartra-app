import { SignUp } from '@clerk/nextjs';

import { PublicNav } from '@/components/layout/PublicNav';

export default function SignUpPage() {
  return (
    <div>
      <PublicNav />
      <section className="section flex justify-center">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/assessment" />
      </section>
    </div>
  );
}
