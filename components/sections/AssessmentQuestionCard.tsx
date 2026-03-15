import { AssessmentOptionGroup } from '@/components/assessment/AssessmentOptionGroup'
import { AssessmentPrompt } from '@/components/assessment/AssessmentPrompt'
import { Card } from '@/components/ui/Card'

export function AssessmentQuestionCard({
  question,
  onSelect,
  selected,
}: {
  question: string
  onSelect: (value: string) => void
  selected?: string
}) {
  return (
    <Card className="space-y-6 border-border/70 bg-panel/92 sm:space-y-7">
      <AssessmentPrompt question={question} helper="Choose the response that most closely matches your default operating pattern." />
      <AssessmentOptionGroup onSelect={onSelect} selected={selected} />
    </Card>
  )
}
