import { useCallback, useEffect, useState } from 'react'
import { loadPlayerContent } from '../../data/access'
import { supabase } from '../../data/cloudRepo'
import type { PlayerContent } from '../../lib/sharing'
import { PlayerView } from './PlayerView'

interface Props {
  userId: string
  name: string
  path: string[]
  /** Le compte n'est plus rattaché au club. */
  onRemoved(): void
}

const signOut = () => supabase!.auth.signOut({ scope: 'local' })

/** Espace joueur, en consultation seule. */
export function PlayerApp({ userId, name, path, onRemoved }: Props) {
  const [loaded, setLoaded] = useState<{ value: PlayerContent; offline: boolean }>()
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    try {
      const { value, offline } = await loadPlayerContent(userId)
      if (!value) return onRemoved()
      setLoaded({ value, offline })
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [userId, onRemoved])

  useEffect(() => {
    reload()
    // reprend les nouveautés publiées quand le joueur revient sur l'application
    const refresh = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [reload])

  if (!loaded) {
    if (!failed) return <p className="splash">Chargement…</p>
    return (
      <div className="login">
        <p className="card" role="alert">Impossible de charger l’équipe. Vérifie ton réseau.</p>
        <button className="button primary" onClick={reload}>Réessayer</button>
        <button className="button ghost" onClick={signOut}>Se déconnecter</button>
      </div>
    )
  }

  return (
    <>
      {loaded.offline && <p className="offline">Hors ligne : dernière version enregistrée sur ce téléphone.</p>}
      <PlayerView
        content={loaded.value}
        base="/joueur"
        path={path}
        footer={
          <>
            <p className="muted center">Connecté : {name}</p>
            <button className="button ghost small" onClick={signOut}>Se déconnecter</button>
          </>
        }
      />
    </>
  )
}
