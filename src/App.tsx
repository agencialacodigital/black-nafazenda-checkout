import { useState } from 'react'
import { Footer, GateMark, Header } from './components/Brand'
import { EmailStep } from './components/EmailStep'
import { OfferResult, ReviewResult } from './components/Results'
import { PRIVACY_URL } from './lib/format'
import { lookup, type PublicOffer } from './lib/api'

type Step = 'email' | 'offer' | 'review'

const STEPS = ['E-mail', 'Oferta']
const stepIndex: Record<Step, number> = { email: 0, offer: 1, review: 1 }

export default function App() {
  const [step, setStep] = useState<Step>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [offer, setOffer] = useState<PublicOffer | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goTo = (s: Step) => {
    setError(null)
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setOffer(null)
    goTo('email')
  }

  async function submitEmail(value: string, nome: string) {
    setBusy(true)
    setError(null)
    const r = await lookup(value)
    setBusy(false)
    if (!r.ok) return setError(r.message)
    setEmail(value)
    setName(nome)
    if (r.data.status === 'offer') {
      setOffer(r.data.offer)
      goTo('offer')
    } else goTo('review')
  }

  const current = stepIndex[step]
  const gold = step === 'offer' && offer?.variant === 'top'

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-farm-deep/60 blur-[120px]" />
        <GateMark className="absolute -bottom-24 -right-32 h-[380px] w-[405px] text-farm/[0.03] sm:-right-16 sm:h-[520px] sm:w-[555px]" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-10 sm:px-0 sm:py-14">
        <p className="eyebrow mb-4 text-center sm:hidden">Black Friday xR Pec</p>

        <div className="rounded-3xl border border-ink-600 bg-ink-800/85 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-10">
          <ol className="mb-8 flex items-center gap-2" aria-label="Etapas da consulta">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 flex-col gap-2" aria-current={i === current ? 'step' : undefined}>
                <span className={`h-[3px] rounded-full transition-colors duration-500 ${i <= current ? (i === current && gold ? 'bg-gold' : 'bg-farm') : 'bg-ink-600'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${i === current ? 'text-white' : 'text-mist-dim'}`}>{label}</span>
              </li>
            ))}
          </ol>

          {step === 'email' && <EmailStep key="email" initialName={name} initialEmail={email} busy={busy} error={error} onSubmit={submitEmail} />}
          {step === 'offer' && offer && <OfferResult key="offer" offer={offer} onAnother={reset} />}
          {step === 'review' && <ReviewResult key="review" onAnother={reset} />}
        </div>
      </main>

      <Footer privacyUrl={PRIVACY_URL} />
    </div>
  )
}
