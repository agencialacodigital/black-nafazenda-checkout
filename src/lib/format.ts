export const normalizeEmailInput = (v: string) => v.trim().toLowerCase()

export const looksLikeEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmailInput(v)) && v.trim().length <= 254

export const PRIVACY_URL: string = (import.meta.env.VITE_PRIVACY_URL as string | undefined) || '#politica-de-privacidade'
