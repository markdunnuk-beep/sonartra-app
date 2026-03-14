import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  return (
    <div>
      <PublicNav />
      <section className="section flex justify-center">
        <Card className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Log in</h1>
          <p className="text-sm text-textSecondary">Access your performance intelligence workspace.</p>
          <Input placeholder="Email" type="email" />
          <Input placeholder="Password" type="password" />
          <Button className="w-full">Log in</Button>
          <a href="#" className="text-sm text-accent">Forgot password?</a>
          <p className="text-sm text-textSecondary">No account? <a href="/signup" className="text-accent">Sign up</a></p>
        </Card>
      </section>
    </div>
  )
}
