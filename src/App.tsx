import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { FeedbackProvider, NotFound } from './components/ui'
import { forgetAccess } from './data/access'
import { clearCache, supabase } from './data/cloudRepo'
import { StoreProvider, useStore } from './data/store'
import { clearDrafts } from './lib/drafts'
import { navigate, releaseGuard, useRoute } from './lib/router'
import { playerContent } from './lib/sharing'
import { AuthPage } from './pages/AuthPage'
import { EditorPage } from './pages/EditorPage'
import { Member } from './pages/Member'
import { PlayPage } from './pages/PlayPage'
import { PlayersPage } from './pages/PlayersPage'
import { PlaysPage } from './pages/PlaysPage'
import { PlayerView } from './pages/player/PlayerView'
import { SettingsPage } from './pages/SettingsPage'
import { DrillEditorPage } from './pages/training/DrillEditorPage'
import { DrillPage } from './pages/training/DrillPage'
import { DrillsPage } from './pages/training/DrillsPage'
import { RosterPage } from './pages/training/RosterPage'
import { SessionPage } from './pages/training/SessionPage'
import { SessionsPage } from './pages/training/SessionsPage'

const TABS = [
  { path: 'systemes', label: 'Systèmes', icon: 'playbook' },
  { path: 'entrainement', label: 'Entraînement', icon: 'whistle' },
  { path: 'joueurs', label: 'Joueurs', icon: 'share' },
  { path: 'reglages', label: 'Réglages', icon: 'settings' },
] as const

function Training({ path }: { path: string[] }) {
  const [kind, id, sub] = path
  if (kind === 'exercices') return <DrillsPage />
  if (kind === 'effectif') return <RosterPage />
  if (kind === 'seance' && id) return <SessionPage key={id} id={id === 'nouveau' ? undefined : id} />
  if (kind === 'exercice' && id === 'nouveau') return <DrillEditorPage key="new" sessionId={sub} />
  if (kind === 'exercice' && id) {
    return sub === 'modifier' ? <DrillEditorPage key={id} id={id} /> : <DrillPage key={id} id={id} />
  }
  return <SessionsPage />
}

/** Ce que verront les joueurs d'une équipe, calculé à partir des données du coach. */
function Preview({ path }: { path: string[] }) {
  const store = useStore()
  const [id, ...rest] = path
  const team = store.teams.find((t) => t.id === id)
  if (!team) return <NotFound back="/joueurs" text="Cette équipe n’a plus d’accès." />
  return (
    <PlayerView
      content={playerContent(store, team.name)}
      base={`/apercu/${team.id}`}
      path={rest}
      back="/joueurs"
      banner={<p className="warning-box">Aperçu : voici ce que voient les joueurs {team.name}.</p>}
    />
  )
}

function Screens({ email }: { email?: string }) {
  const [section = 'systemes', ...path] = useRoute()
  const [id, sub] = path
  const { status, error, offline, reload } = useStore()

  if (status === 'loading') return <p className="splash">Chargement…</p>
  if (status === 'error') {
    return (
      <div className="login">
        <p className="card">{error}</p>
        <button className="button primary" onClick={reload}>Réessayer</button>
        {supabase && <button className="button ghost" onClick={() => supabase!.auth.signOut({ scope: 'local' })}>Se déconnecter</button>}
      </div>
    )
  }

  if (section === 'apercu') return <Preview path={path} />

  // pas de barre d'onglets pendant le dessin
  const drawing =
    (section === 'systemes' && (id === 'nouveau' || sub === 'modifier')) ||
    (section === 'entrainement' && id === 'exercice' && (sub === 'nouveau' || path[2] === 'modifier'))
  // après connexion, ou sur une ancienne adresse, on revient aux systèmes
  const current = TABS.some((t) => t.path === section) ? section : 'systemes'

  return (
    <>
      {offline && <p className="offline">Hors ligne : dernières données enregistrées sur ce téléphone.</p>}
      {current === 'entrainement' ? (
        <Training path={path} />
      ) : current === 'joueurs' ? (
        <PlayersPage />
      ) : current === 'reglages' ? (
        <SettingsPage email={email} />
      ) : id === 'nouveau' ? (
        <EditorPage key="new" />
      ) : sub === 'modifier' ? (
        <EditorPage key={id} id={id} />
      ) : id ? (
        <PlayPage key={id} id={id} />
      ) : (
        <PlaysPage />
      )}
      {!drawing && (
        <nav className="tabs">
          {TABS.map((tab) => (
            <a key={tab.path} href={`#/${tab.path}`} className={tab.path === current ? 'active' : ''}>
              <Icon name={tab.icon} />
              {tab.label}
            </a>
          ))}
        </nav>
      )}
    </>
  )
}

interface User {
  id: string
  email: string
}

const USER = 'bmb.user'

/** Exige une connexion quand le serveur du club est configuré. */
function useUser() {
  const [user, setUser] = useState<User | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    const remember = (u: { id: string; email?: string }) => {
      const next = { id: u.id, email: u.email ?? '' }
      localStorage.setItem(USER, JSON.stringify(next))
      setUser((old) => (old?.id === next.id ? old : next))
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) return remember(data.session.user)
      // sans réseau la session ne peut pas être renouvelée : on garde l'accès à la copie locale
      const saved = localStorage.getItem(USER)
      setUser(error?.name === 'AuthRetryableFetchError' && saved ? JSON.parse(saved) : null)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) remember(session.user)
      else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(USER)
        clearCache()
        clearDrafts()
        forgetAccess()
        // le compte suivant ne doit pas arriver sur la page du précédent
        releaseGuard()
        navigate('/', { replace: true })
        setUser(null)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}

export function App() {
  const [section = '', ...path] = useRoute()
  const user = useUser()

  if (supabase && user === undefined) return <p className="splash">Chargement…</p>
  if (supabase && !user) return <AuthPage />

  const coach = (
    <FeedbackProvider>
      <StoreProvider key={user?.id ?? 'local'}>
        <Screens email={user?.email} />
      </StoreProvider>
    </FeedbackProvider>
  )
  // sans serveur il n'y a pas de comptes : l'application reste sur l'appareil
  if (!user) return coach

  return (
    <Member key={user.id} userId={user.id} email={user.email} path={section === 'joueur' ? path : []} coach={coach} />
  )
}
