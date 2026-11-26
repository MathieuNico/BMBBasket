import { useState, type FormEvent } from 'react'
import { Logo } from '../components/ui'
import { clubTeams, joinClub } from '../data/access'
import { isNetworkError, supabase } from '../data/cloudRepo'
import { cleanCode, isCode } from '../lib/sharing'

const explain = (error: unknown) => {
  const { message } = error as Error
  if (isNetworkError(message)) return 'Connexion impossible. Vérifie ton réseau.'
  if (message.includes('code_invalide')) return 'Le code du club a changé : demande le nouveau à ton coach.'
  return `Impossible de continuer : ${message}`
}

/** Rattachement d'un nouveau compte : le code du club, puis son prénom et son équipe. */
export function JoinPage({ email, onJoined }: { email: string; onJoined(): void }) {
  const [input, setInput] = useState('')
  const [teams, setTeams] = useState<string[]>()
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const code = cleanCode(input)

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (e) {
      setError(explain(e))
    }
    setBusy(false)
  }

  const checkCode = (e: FormEvent) => {
    e.preventDefault()
    if (!isCode(code)) return setError('Le code du club compte 10 caractères.')
    run(async () => {
      const found = await clubTeams(code)
      if (!found) setError('Code du club incorrect.')
      else if (!found.length) setError('Aucune équipe n’est encore créée : préviens ton coach.')
      else setTeams(found)
    })
  }

  const join = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !team) return setError('Indique ton prénom et ton équipe.')
    run(async () => {
      await joinClub(code, name.trim(), team)
      onJoined()
    })
  }

  return (
    <div className="login">
      <Logo />
      <form className="card form" onSubmit={teams ? join : checkCode}>
        <h2>Rejoindre le club</h2>
        {teams ? (
          <>
            <label>
              Prénom et initiale
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom N." maxLength={60} autoFocus />
            </label>
            <label>
              Mon équipe
              <select value={team} onChange={(e) => setTeam(e.target.value)}>
                <option value="">Choisir…</option>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label>
            Code du club
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="XXXXX-XXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>{teams ? 'Rejoindre' : 'Valider le code'}</button>
        <p className="muted">Connecté avec {email}. Tu es coach ? Demande au responsable de t’ajouter à la liste.</p>
      </form>
      <button className="button ghost" onClick={() => supabase!.auth.signOut({ scope: 'local' })}>Se déconnecter</button>
    </div>
  )
}
