import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { loadAccess, type Access } from '../data/access'
import { supabase } from '../data/cloudRepo'
import { JoinPage } from './JoinPage'
import { PlayerApp } from './player/PlayerApp'

interface Props {
  userId: string
  email: string
  path: string[]
  /** Application complète, réservée aux coachs. */
  coach: ReactNode
}

/** Oriente un compte connecté selon son rôle : coach, joueur, ou pas encore rattaché. */
export function Member({ userId, email, path, coach }: Props) {
  const [access, setAccess] = useState<Access>()
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setError('')
    try {
      setAccess((await loadAccess(userId)).value)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  if (error) {
    return (
      <div className="login">
        <p className="card" role="alert">Impossible de vérifier ton accès. Vérifie ton réseau puis réessaie. ({error})</p>
        <button className="button primary" onClick={reload}>Réessayer</button>
        <button className="button ghost" onClick={() => supabase!.auth.signOut({ scope: 'local' })}>Se déconnecter</button>
      </div>
    )
  }
  if (!access) return <p className="splash">Chargement…</p>
  if (access.role === 'coach') return coach
  if (access.role === 'player') {
    return <PlayerApp userId={userId} name={access.name} path={path} onRemoved={reload} />
  }
  return <JoinPage email={email} onJoined={reload} />
}
