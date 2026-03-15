export const navLinks = [
  { href: '/platform', label: 'Platform' },
  { href: '/signals', label: 'Signals' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/contact', label: 'Contact' },
]

export const layerData = [
  {
    title: 'Individual Intelligence',
    description:
      'Maps behavioural architecture, motivators, and pressure patterns to predict role fit and execution quality.',
  },
  {
    title: 'Team Intelligence',
    description:
      'Quantifies leadership balance, conflict vectors, and cognitive spread across operating teams.',
  },
  {
    title: 'Organisational Intelligence',
    description:
      'Surfaces macro performance risks, cultural tension points, and alignment gaps across business units.',
  },
]

export const measurePillars = ['Behaviour Style', 'Motivators', 'Leadership', 'Conflict', 'Culture', 'Stress']

export const testimonials = [
  { quote: 'Sonartra gave us a sharper view of leadership risk than any engagement survey.', name: 'COO, Fintech Scale-up' },
  { quote: 'The outputs were immediately usable in workforce planning and succession reviews.', name: 'Chief People Officer, Health Group' },
  { quote: 'Signals translated behaviour into decisions. That changed how we staffed critical projects.', name: 'VP Operations, Enterprise SaaS' },
]

export const caseStudies = [
  { company: 'Northline Capital', challenge: 'Leadership misalignment across regional teams', outcome: '18% faster strategic decision cycle', metric: '18%' },
  { company: 'Aster Biotech', challenge: 'Escalating conflict during scale phase', outcome: '32% reduction in cross-team escalation incidents', metric: '32%' },
  { company: 'Helio Systems', challenge: 'Unclear behavioural fit for mission-critical roles', outcome: '24% improvement in high-stakes project delivery', metric: '24%' },
]

export const assessmentQuestions = [
  'I prefer making decisions from structured evidence rather than intuition alone.',
  'In ambiguous situations, I naturally move toward action.',
  'I challenge assumptions early when strategy is unclear.',
  'I maintain composure when timelines compress unexpectedly.',
  'I adapt my communication style to different stakeholder groups.',
  'I am motivated by measurable performance outcomes.',
  'I seek alignment before execution when teams are under pressure.',
  'I can sustain delivery quality under prolonged workload.',
  'I quickly detect tension between team culture and strategic direction.',
]

export const dashboardSummary = {
  stats: [
    { label: 'Assessment Status', value: 'Completed', detail: 'Updated 2h ago' },
    { label: 'Dominant Behaviour Style', value: 'Strategist', detail: 'Secondary: Integrator' },
    { label: 'Leadership Architecture', value: 'Precision Driver', detail: 'High accountability' },
    { label: 'Stress Risk Index', value: 'Moderate', detail: '62 / 100' },
  ],
  strengths: ['Strategic pattern recognition', 'Execution discipline', 'Clear decision framing'],
  watchouts: ['Can over-index on speed under pressure', 'Low tolerance for ambiguous ownership', 'May under-communicate context'],
  environment: ['Clear mandate and decision rights', 'High accountability norms', 'Cross-functional strategic visibility'],
}

export const individualResults = {
  profile: {
    dominant: 'Strategist',
    secondary: 'Integrator',
    summary:
      'Profile indicates a strategy-first operator with strong execution discipline. Performance peaks in structured, high-accountability environments with transparent decision ownership.',
  },
  motivators: [
    { label: 'Achievement', value: 88 },
    { label: 'Autonomy', value: 82 },
    { label: 'Influence', value: 69 },
    { label: 'Stability', value: 58 },
    { label: 'Collaboration', value: 74 },
  ],
  radar: [
    { name: 'Behaviour', score: 84 },
    { name: 'Motivators', score: 78 },
    { name: 'Leadership', score: 81 },
    { name: 'Conflict', score: 67 },
    { name: 'Culture', score: 73 },
    { name: 'Stress', score: 62 },
  ],
}

export const organisationResults = {
  stats: [
    { label: 'Assessments Completed', value: '126' },
    { label: 'Team Behaviour Balance', value: '72 / 100' },
    { label: 'Leadership Distribution', value: 'Skewed to Operators' },
    { label: 'Culture Risk Signal', value: 'Medium-High' },
  ],
  members: [
    { name: 'Ari Chen', style: 'Strategist', leadership: 'Architect', risk: 'Low', alignment: 'High' },
    { name: 'Mina Ortiz', style: 'Operator', leadership: 'Executor', risk: 'Moderate', alignment: 'Medium' },
    { name: 'Ravi Nadar', style: 'Catalyst', leadership: 'Mobiliser', risk: 'High', alignment: 'Medium' },
    { name: 'Liam Carter', style: 'Integrator', leadership: 'Coordinator', risk: 'Low', alignment: 'High' },
  ],
}
