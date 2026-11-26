import { useState, type FormEvent } from 'react'
import { Logo } from '../components/ui'
import { supabase } from '../data/cloudRepo'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error) {
      setError(result.error.status === 400 ? 'E-mail ou mot de passe incorrect.' : 'Connexion impossible. Vérifie ton réseau.')
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <Logo />
      <h1>BMB Playbook</h1>
      <form className="card form" onSubmit={signIn}>
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Mot de passe
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        <p className="muted">Accès réservé aux coachs du club.</p>
      </form>
    </div>
  )
}
