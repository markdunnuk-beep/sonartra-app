import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function SignupPage() {
  return (
    <div>
      <PublicNav />
      <section className="section flex justify-center">
        <Card className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-textSecondary">Set up your Sonartra workspace in minutes.</p>
          <Input placeholder="Full name" />
          <Input placeholder="Email" type="email" />
          <Input placeholder="Password" type="password" />
          <Input placeholder="Organisation (optional)" />
          <Button className="w-full">Create account</Button>
        </Card>
      </section>
    </div>
  )
}
