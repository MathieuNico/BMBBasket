import { useEffect, useState } from 'react'
import { Nav, type NavItem } from './components/Nav'
import { FeedbackProvider, NotFound, Splash } from './components/ui'
import { forgetAccess } from './data/access'
import { clearCache, supabase } from './data/cloudRepo'
import { StoreProvider, useStore } from './data/store'
import { clearDrafts } from './lib/drafts'
import { navigate, releaseGuard, useRoute } from './lib/router'
import { playerContent } from './lib/sharing'
import { AuthPage } from './pages/AuthPage'
import { EditorPage } from './pages/EditorPage'
import { Member } from './pages/Member'
import { HomePage } from './pages/HomePage'
import { PlayPage } from './pages/PlayPage'
import { PlaysPage } from './pages/PlaysPage'
import { PlayerView } from './pages/player/PlayerView'
import { SettingsPage } from './pages/SettingsPage'
import { DrillEditorPage } from './pages/training/DrillEditorPage'
import { DrillPage } from './pages/training/DrillPage'
import { TeamPage } from './pages/teams/TeamPage'
import { TeamsPage } from './pages/teams/TeamsPage'
import { DrillsPage } from './pages/training/DrillsPage'
import { SessionPage } from './pages/training/SessionPage'
import { SessionsPage } from './pages/training/SessionsPage'

const TABS: NavItem[] = [
  { id: 'accueil', href: '/accueil', label: 'Accueil', icon: 'home' },
  { id: 'systemes', href: '/systemes', label: 'Systèmes', icon: 'playbook' },
  { id: 'entrainement', href: '/entrainement', label: 'Entraînement', icon: 'whistle' },
  { id: 'equipes', href: '/equipes', label: 'Équipes', icon: 'users' },
  { id: 'reglages', href: '/reglages', label: 'Réglages', icon: 'settings', desktopOnly: true },
]

function Training({ path }: { path: string[] }) {
  const [kind, id, sub] = path
  if (kind === 'exercices') return <DrillsPage />
  if (kind === 'seance' && id) return <SessionPage key={id} id={id === 'nouveau' ? undefined : id} />
  if (kind === 'exercice' && id === 'nouveau') return <DrillEditorPage key="new" sessionId={sub} />
  if (kind === 'exercice' && id) {
    return sub === 'modifier' ? <DrillEditorPage key={id} id={id} /> : <DrillPage key={id} id={id} />
  }
  return <SessionsPage />
}

function Systems({ path }: { path: string[] }) {
  const [id, sub] = path
  if (id === 'nouveau') return <EditorPage key="new" />
  if (id && sub === 'modifier') return <EditorPage key={id} id={id} />
  if (id) return <PlayPage key={id} id={id} />
  return <PlaysPage />
}

/** Ce que verront les joueurs d'une équipe, calculé à partir des données du coach. */
function Preview({ path }: { path: string[] }) {
  const store = useStore()
  const [id, ...rest] = path
  const team = store.teams.find((t) => t.id === id)
  if (!team) return <NotFound back="/equipes" text="Cette équipe n’existe plus." />
  return (
    <PlayerView
      content={playerContent(store, team.name)}
      base={`/apercu/${team.id}`}
      path={rest}
      back={`/equipes/${team.id}`}
      banner={<p className="warning-box">Aperçu : voici ce que voient les joueurs {team.name}.</p>}
    />
  )
}

function Screens({ email }: { email?: string }) {
  const [section = 'accueil', ...path] = useRoute()
  const { status, error, offline, reload } = useStore()

  if (status === 'loading') return <Splash />
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

  // anciennes adresses, ou retour de connexion
  const alias = section === 'joueurs' ? 'equipes' : section
  const current = TABS.some((t) => t.id === alias) ? alias : 'accueil'
  // pas de navigation pendant le dessin
  const drawing =
    (current === 'systemes' && (path[0] === 'nouveau' || path[1] === 'modifier')) ||
    (current === 'entrainement' && path[0] === 'exercice' && (path[1] === 'nouveau' || path[2] === 'modifier'))

  return (
    <div className={drawing ? 'shell' : 'shell with-nav'}>
      {offline && <p className="offline">Hors ligne : dernières données enregistrées sur ce téléphone.</p>}
      {current === 'systemes' ? (
        <Systems path={path} />
      ) : current === 'entrainement' ? (
        <Training path={path} />
      ) : current === 'equipes' ? (
        path[0] ? <TeamPage key={path[0]} id={path[0]} /> : <TeamsPage />
      ) : current === 'reglages' ? (
        <SettingsPage email={email} />
      ) : (
        <HomePage />
      )}
      {!drawing && <Nav items={TABS} current={current} />}
    </div>
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

  if (supabase && user === undefined) return <Splash />
  if (supabase && !user) return <AuthPage />

  const coach = (
    <FeedbackProvider>
      <StoreProvider key={user?.id ?? 'local'} userId={user?.id}>
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
