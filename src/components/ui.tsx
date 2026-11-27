import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { navigate } from '../lib/router'
import { Icon, type IconName } from './Icon'

/** Logo du club : dépose le fichier public/logo.png pour remplacer l'écusson par défaut. */
export function Logo() {
  const [missing, setMissing] = useState(false)
  return missing ? (
    <span className="logo-badge">BMB</span>
  ) : (
    <img className="logo" src="/logo.png" alt="BMB" onError={() => setMissing(true)} />
  )
}

interface HeaderProps {
  title: ReactNode
  subtitle?: string
  back?: string
  children?: ReactNode
}

export function Header({ title, subtitle, back, children }: HeaderProps) {
  return (
    <header className="header">
      {back ? (
        <a className="icon-button" href={`#${back}`} aria-label="Retour">
          <Icon name="back" />
        </a>
      ) : (
        <Logo />
      )}
      {typeof title === 'string' ? (
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <small>{subtitle}</small>}
        </div>
      ) : (
        title
      )}
      <div className="header-actions">{children}</div>
    </header>
  )
}

interface EmptyProps {
  icon: IconName
  title: string
  text: string
  children?: ReactNode
}

/** Écran vide : ce qu'on peut faire ici, et le bouton pour commencer. */
export function EmptyState({ icon, title, text, children }: EmptyProps) {
  return (
    <div className="empty">
      <span className="tile-icon"><Icon name={icon} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  )
}

export function Search({ value, onChange, label }: { value: string; onChange(value: string): void; label: string }) {
  return (
    <div className="search">
      <Icon name="search" />
      <input type="search" placeholder={label} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Renvoie vers une autre page. */
export function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to])
  return null
}

export function NotFound({ back, text }: { back: string; text: string }) {
  return (
    <>
      <Header title="Introuvable" back={back} />
      <main><p className="muted center">{text}</p></main>
    </>
  )
}

interface Question {
  message: string
  confirm: string
}

interface Feedback {
  confirm(message: string, confirm: string): Promise<boolean>
  toast(message: string): void
}

const Context = createContext<Feedback | null>(null)

export const useFeedback = () => useContext(Context)!

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [message, setMessage] = useState('')
  const answer = useRef<(yes: boolean) => void>(() => {})
  const timer = useRef(0)

  const confirm = useCallback((message: string, confirm: string) => {
    answer.current(false)
    setQuestion({ message, confirm })
    return new Promise<boolean>((resolve) => (answer.current = resolve))
  }, [])

  const toast = useCallback((text: string) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(''), 3500)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const close = (yes: boolean) => {
    setQuestion(null)
    answer.current(yes)
  }

  const [value] = useState(() => ({ confirm, toast }))

  return (
    <Context.Provider value={value}>
      {children}
      {question && (
        <div className="overlay" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" onClick={(e) => e.stopPropagation()}>
            <p>{question.message}</p>
            <div className="row">
              <button className="button ghost" onClick={() => close(false)}>Annuler</button>
              <button className="button danger" onClick={() => close(true)}>{question.confirm}</button>
            </div>
          </div>
        </div>
      )}
      {message && <div className="toast" role="status">{message}</div>}
    </Context.Provider>
  )
}

export const formatDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
    : 'Date à définir'

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Sépare ce qui arrive (du plus proche au plus loin) de ce qui est passé (du plus récent au plus ancien). */
export function byDate<T extends { date: string; time: string }>(items: T[]) {
  const key = (x: T) => `${x.date || '9999'} ${x.time}`
  const sorted = [...items].sort((a, b) => key(a).localeCompare(key(b)))
  const day = today()
  return {
    upcoming: sorted.filter((x) => !x.date || x.date >= day),
    past: sorted.filter((x) => x.date && x.date < day).reverse(),
  }
}

/** Texte sans accents ni majuscules, pour la recherche. */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr')

export function Chips({ options, value, onChange }: { options: string[]; value: string; onChange(value: string): void }) {
  return (
    <div className="chips">
      {['', ...options].map((o) => (
        <button key={o} className={o === value ? 'chip active' : 'chip'} aria-pressed={o === value} onClick={() => onChange(o)}>
          {o || 'Tous'}
        </button>
      ))}
    </div>
  )
}
