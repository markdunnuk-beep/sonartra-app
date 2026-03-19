const options = ['Seek broad input', 'Analyse independently', 'Act quickly then adapt', 'Follow established frameworks']

export function SignalsPreview() {
  return (
    <div className="visual-shell interactive-surface rounded-[1.375rem] bg-[#0c1522]/82 p-5 sm:p-6">
      <p className="eyebrow">Signals Assessment</p>
      <div className="mt-5 flex items-center justify-between text-xs text-[#9fb3ce]">
        <span>Question 7 of 24</span>
        <span>Progress 29%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/8">
        <div className="h-full w-[29%] rounded-full bg-accent/65" />
      </div>

      <div className="mt-5 rounded-[1rem] border border-white/[0.08] bg-[#0f1a29]/72 p-4">
        <p className="text-sm leading-6 text-[#dbe7f8]">How do you typically approach major decisions?</p>
      </div>

      <div className="mt-4 grid gap-2.5">
        {options.map((option, index) => (
          <button
            type="button"
            key={option}
            className="interaction-control rounded-[0.95rem] border border-white/[0.08] bg-[#111e2f]/68 px-3.5 py-3 text-left text-sm text-[#c7d7ec] hover:border-accent/30 hover:bg-[#16263d]/88"
          >
            <span className="mr-2 text-[#86a6cd]">0{index + 1}</span>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
