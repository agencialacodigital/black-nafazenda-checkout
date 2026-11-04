import { useState } from 'react'
import { FieldError, Spinner } from './Alert'
import { looksLikeEmail } from '../lib/format'
import { PRIVACY_URL } from '../lib/format'

interface Props {
  initialName?: string
  initialEmail?: string
  busy: boolean
  error: string | null
  onSubmit: (email: string, name: string) => void
}

const validName = (v: string) => v.trim().length >= 2

export function EmailStep({ initialName = '', initialEmail = '', busy, error, onSubmit }: Props) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [touched, setTouched] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const invalid = touched && !looksLikeEmail(email)
  const nameInvalid = nameTouched && !validName(name)
  const message = invalid ? 'Digite um e-mail válido, por exemplo nome@email.com.' : error

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        setNameTouched(true)
        if (validName(name) && looksLikeEmail(email) && !busy) onSubmit(email.trim(), name.trim())
      }}
      className="animate-rise"
    >
      <h1 className="text-[26px] font-extrabold uppercase leading-[1.12] tracking-tight sm:text-[34px]">
        Sua condição especial de <span className="text-farm">Black Friday</span> está aqui!
      </h1>
      <p className="mt-4 text-[15px] font-medium leading-relaxed text-mist">
        A NaFazenda preparou condições especiais para você fazer parte do xR Pec. Informe seu nome e e-mail e descubra a oferta disponível para você.
      </p>

      <div className="mt-8">
        <label htmlFor="nome" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.16em] text-white">
          Seu nome
        </label>
        <input
          id="nome"
          name="name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={120}
          placeholder="Digite seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name && setNameTouched(true)}
          aria-invalid={nameInvalid}
          aria-describedby="nome-msg"
          disabled={busy}
          className="field"
        />
        <FieldError id="nome-msg">{nameInvalid ? 'Digite seu nome para continuar.' : ''}</FieldError>
      </div>

      <div className="mt-3">
        <label htmlFor="email" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.16em] text-white">
          Seu melhor e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Digite o e-mail utilizado nas suas compras"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setTouched(true)}
          aria-invalid={invalid || !!error}
          aria-describedby="email-msg"
          disabled={busy}
          className="field"
        />
        <FieldError id="email-msg">{message}</FieldError>
      </div>

      <button type="submit" disabled={busy} className="btn-primary mt-3">
        {busy && <Spinner />}
        {busy ? 'Consultando…' : 'Consultar minha condição'}
        {!busy && <span aria-hidden="true" className="sheen animate-sheen" />}
      </button>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-[12px] font-medium text-mist-dim">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-farm" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
        <span>
          Consulta individual e segura.{' '}
          <a href={PRIVACY_URL} className="underline decoration-ink-600 underline-offset-4 hover:text-white">
            Política de Privacidade
          </a>
        </span>
      </p>
    </form>
  )
}
