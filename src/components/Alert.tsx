export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 min-h-[1.25rem] text-[13px] font-medium text-[#ff8a85]">
      {children}
    </p>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: React.ReactNode }) {
  const color = tone === 'warn' ? 'border-gold/40 bg-gold/[0.06] text-gold-soft' : 'border-farm-line bg-farm-deep/40 text-mist'
  return (
    <div role="status" className={`rounded-xl border px-4 py-3 text-[13px] font-medium leading-relaxed ${color}`}>
      {children}
    </div>
  )
}

export function Spinner() {
  return <span aria-hidden="true" className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#06150a]/30 border-t-[#06150a]" />
}
