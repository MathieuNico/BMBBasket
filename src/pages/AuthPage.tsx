import { useState, type FormEvent } from 'react'
import { Logo } from '../components/ui'
import { isNetworkError, supabase } from '../data/cloudRepo'

type Mode = 'signin' | 'signup'

function explain(error: { message: string; code?: string; status?: number }) {
  if (isNetworkError(error.message)) return 'Connexion impossible. Vérifie ton réseau.'
  if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) {
    return 'Un compte existe déjà avec cette adresse : connecte-toi.'
  }
  if (error.code === 'signup_disabled') return 'Les inscriptions sont fermées. Préviens ton coach.'
  if (error.code === 'weak_password') return 'Mot de passe trop faible : allonge-le.'
  if (error.status === 429) return 'Trop d’essais. Réessaie dans quelques minutes.'
  if (error.code === 'invalid_credentials' || /invalid login/i.test(error.message)) return 'E-mail ou mot de passe incorrect.'
  return `Impossible de continuer : ${error.message}`
}

/** Connexion et création de compte, pour les coachs comme pour les joueurs. */
export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const switchTo = (next: Mode) => {
    setMode(next)
    setError('')
    setInfo('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const credentials = { email: email.trim(), password }
    const result = mode === 'signin'
      ? await supabase!.auth.signInWithPassword(credentials)
      : await supabase!.auth.signUp(credentials)
    // en cas de succès avec session, l'application change d'écran toute seule
    if (result.error) setError(explain(result.error))
    else if (!result.data.session) {
      switchTo('signin')
      setInfo('Compte créé. Confirme ton adresse avec le lien reçu par e-mail, puis connecte-toi.')
    }
    setBusy(false)
  }

  return (
    <div className="login">
      <Logo />
      <h1>BMB Playbook</h1>
      <form className="card form" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'signin' ? 'active' : ''} aria-pressed={mode === 'signin'} onClick={() => switchTo('signin')}>
            Se connecter
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} aria-pressed={mode === 'signup'} onClick={() => switchTo('signup')}>
            Créer un compte
          </button>
        </div>
        {info && <p role="status">{info}</p>}
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Mot de passe{mode === 'signup' && ' (8 caractères minimum)'}
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={mode === 'signup' ? 8 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        {mode === 'signup' && (
          <p className="muted">Le code du club te sera demandé ensuite. Moins de 15 ans : demande l’accord d’un parent.</p>
        )}
      </form>
    </div>
  )
}
