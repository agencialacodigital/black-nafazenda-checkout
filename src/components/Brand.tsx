import logo from '../assets/nafazenda-logo.svg'

export function Logo({ className = 'h-11' }: { className?: string }) {
  return <img src={logo} alt="NaFazenda.com" className={className} draggable={false} />
}

/** Porteira desenhada com as mesmas proporções do logo, usada como marca d'água discreta. */
export function GateMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 300" aria-hidden="true" className={className} fill="currentColor">
      <rect x="0" y="0" width="34" height="300" rx="2" />
      <rect x="286" y="0" width="34" height="300" rx="2" />
      <rect x="0" y="52" width="320" height="30" />
      <rect x="0" y="136" width="320" height="30" />
      <rect x="0" y="222" width="320" height="30" />
      <path d="M34 62 L286 232 L286 202 L34 32 Z" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8 sm:pt-8">
      <Logo />
      <span className="eyebrow hidden border-l border-gold/40 pl-4 sm:block">Black Friday xR Pec</span>
    </header>
  )
}

export function Footer({ privacyUrl }: { privacyUrl: string }) {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-8 pt-10 text-center text-[11px] font-medium tracking-wide text-mist-dim sm:px-8">
      <span>© {new Date().getFullYear()} NaFazenda.com</span>
      <span className="mx-2 text-ink-600" aria-hidden="true">|</span>
      <a href={privacyUrl} className="underline decoration-ink-600 underline-offset-4 hover:text-white">
        Política de Privacidade
      </a>
    </footer>
  )
}
