import { useEffect, useState } from 'react'
import type { PublicOffer } from '../lib/api'

const SUPPORT_URL: string | undefined = import.meta.env.VITE_SUPPORT_URL
/** Tempo (s) mostrando a condição antes de redirecionar. */
const REDIRECT_AFTER = 4

function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/** Só segue para links da Lastlink (defesa extra: o link vem do servidor). */
function safeCheckout(url: string): string | null {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'lastlink.com' || u.hostname.endsWith('.lastlink.com')) ? u.toString() : null
  } catch {
    return null
  }
}

interface OfferProps {
  offer: PublicOffer
  onAnother: () => void
}

export function OfferResult({ offer, onAnother }: OfferProps) {
  const gold = offer.variant === 'top'
  const href = safeCheckout(offer.checkoutUrl)
  const [left, setLeft] = useState(REDIRECT_AFTER)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    if (!href || cancelled) return
    if (left <= 0) {
      window.location.assign(href)
      return
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left, href, cancelled])

  return (
    <section className="animate-rise" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] ${gold ? 'text-gold' : 'text-farm'}`}>
          <Check className="h-4 w-4" /> Condição encontrada
        </span>
        {offer.badge && (
          <span className="rounded-full border border-gold/60 bg-gold/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-soft">
            {offer.badge}
          </span>
        )}
      </div>

      <h1 className={`mt-4 text-[24px] font-extrabold uppercase leading-[1.15] tracking-tight sm:text-[32px] ${gold ? 'text-gold-soft' : ''}`}>{offer.headline}</h1>
      <p className="mt-4 text-[15px] font-medium leading-relaxed text-mist">{offer.text}</p>

      <div className={`mt-7 rounded-2xl border p-6 ${gold ? 'border-gold/50 bg-gold/[0.05]' : 'border-farm-line bg-farm-deep/40'}`}>
        <p className="text-[13px] font-semibold text-mist-dim">
          De <span className="line-through decoration-mist-dim/70">{offer.listPrice}</span> por
        </p>
        <p className="mt-1 text-[40px] font-extrabold leading-none tracking-tight sm:text-[48px]">{offer.price}</p>
        <p className="mt-3 text-[15px] font-semibold text-mist">
          ou <span className={gold ? 'text-gold-soft' : 'text-farm-bright'}>{offer.installments}</span>
        </p>
      </div>

      {href ? (
        <>
          <a href={href} rel="noopener noreferrer" className={`${gold ? 'btn-gold' : 'btn-primary'} mt-5`}>
            {offer.cta}
            <span aria-hidden="true" className="sheen animate-sheen" />
          </a>
          <p className="mt-4 text-center text-[12.5px] font-medium text-mist-dim" role="status">
            {cancelled ? 'Redirecionamento pausado.' : `Levando você ao checkout em ${left}s…`}
          </p>
          <div className="mt-4 flex items-center justify-center gap-6">
            {!cancelled && (
              <button type="button" onClick={() => setCancelled(true)} className="link-quiet">Pausar</button>
            )}
            <button type="button" onClick={onAnother} className="link-quiet">Consultar outro e-mail</button>
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-gold/40 bg-gold/[0.06] px-4 py-3 text-[13px] font-medium text-gold-soft">
          Não foi possível abrir o checkout agora. Tente novamente em instantes.
        </p>
      )}
    </section>
  )
}

export function ReviewResult({ onAnother }: { onAnother: () => void }) {
  return (
    <section className="animate-rise" aria-live="polite">
      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3 2" /></svg>
        Conferência rápida
      </span>
      <h1 className="mt-4 text-[24px] font-extrabold uppercase leading-[1.15] tracking-tight sm:text-[32px]">Precisamos conferir seu cadastro</h1>
      <p className="mt-4 text-[15px] font-medium leading-relaxed text-mist">
        Encontramos algo no seu cadastro que nossa equipe precisa verificar antes de liberar a sua condição. Para a sua segurança, não liberamos nenhuma oferta automaticamente neste caso. Fale com a nossa equipe e resolvemos rápido.
      </p>
      {SUPPORT_URL && (
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-7">Falar com a equipe</a>
      )}
      <div className="mt-6 text-center">
        <button type="button" onClick={onAnother} className="link-quiet">Consultar outro e-mail</button>
      </div>
    </section>
  )
}
