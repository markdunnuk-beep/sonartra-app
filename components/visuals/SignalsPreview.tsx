const options = ['Seek broad input', 'Analyse independently', 'Act quickly then adapt', 'Follow established frameworks']

export function SignalsPreview() {
  return (
    <div className="visual-shell rounded-2xl border border-border/80 bg-[#0c1522]/85 p-5">
      <p className="eyebrow">Signals Assessment</p>
      <div className="mt-4 flex items-center justify-between text-xs text-[#9fb3ce]">
        <span>Question 7 of 24</span>
        <span>Progress 29%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10">
        <div className="h-full w-[29%] rounded-full bg-accent/70" />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-[#0f1a29]/80 p-4">
        <p className="text-sm text-[#dbe7f8]">How do you typically approach major decisions?</p>
      </div>

      <div className="mt-4 grid gap-2">
        {options.map((option, index) => (
          <button
            type="button"
            key={option}
            className="rounded-lg border border-white/10 bg-[#111e2f]/75 px-3 py-2.5 text-left text-sm text-[#c7d7ec] transition hover:border-accent/45 hover:bg-[#16263d]"
          >
            <span className="mr-2 text-[#86a6cd]">0{index + 1}</span>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
