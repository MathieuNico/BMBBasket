import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { FeedbackProvider } from './components/ui'
import { clearCache, supabase } from './data/cloudRepo'
import { StoreProvider, useStore } from './data/store'
import { useRoute } from './lib/router'
import { EditorPage } from './pages/EditorPage'
import { LoginPage } from './pages/LoginPage'
import { MatchesPage } from './pages/MatchesPage'
import { MatchModePage } from './pages/MatchModePage'
import { MatchPage } from './pages/MatchPage'
import { PlayPage } from './pages/PlayPage'
import { PlaysPage } from './pages/PlaysPage'
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
  { path: 'matchs', label: 'Matchs', icon: 'calendar' },
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

  // pas de barre d'onglets pendant le dessin ni en mode match
  const drawing =
    (section === 'systemes' && (id === 'nouveau' || sub === 'modifier')) ||
    (section === 'entrainement' && id === 'exercice' && (sub === 'nouveau' || path[2] === 'modifier'))
  const focused = drawing || sub === 'direct'

  return (
    <>
      {offline && <p className="offline">Hors ligne : dernières données enregistrées sur ce téléphone.</p>}
      {section === 'matchs' ? (
        !id ? <MatchesPage />
        : sub === 'direct' ? <MatchModePage key={id} id={id} />
        : <MatchPage key={id} id={id === 'nouveau' ? undefined : id} />
      ) : section === 'entrainement' ? (
        <Training path={path} />
      ) : section === 'reglages' ? (
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
      {!focused && (
        <nav className="tabs">
          {TABS.map((tab) => (
            <a key={tab.path} href={`#/${tab.path}`} className={tab.path === section ? 'active' : ''}>
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
        setUser(null)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}

export function App() {
  const user = useUser()

  if (supabase && user === undefined) return <p className="splash">Chargement…</p>
  if (supabase && !user) return <LoginPage />

  return (
    <FeedbackProvider>
      <StoreProvider key={user?.id ?? 'local'}>
        <Screens email={user?.email} />
      </StoreProvider>
    </FeedbackProvider>
  )
}
