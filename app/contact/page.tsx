import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'

export default function ContactPage() {
  return <div><PublicNav /><section className="section flex justify-center"><Card className="w-full max-w-2xl space-y-4"><h1 className="text-2xl font-semibold">Request a Demo</h1><div className="grid gap-3 md:grid-cols-2"><Input placeholder="Name" /><Input placeholder="Email" type="email" /></div><Input placeholder="Company" /><TextArea placeholder="What performance challenge are you solving?" /><Button>Submit Request</Button><p className="text-sm text-textSecondary">Running a strategic pilot? <a href="#" className="text-accent">Apply for pilot programme</a>.</p></Card></section></div>
}
