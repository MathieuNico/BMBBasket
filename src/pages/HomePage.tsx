import { PendingDraft } from '../components/DraftNotice'
import { Icon, type IconName } from '../components/Icon'
import { PlayCard } from '../components/PlayCard'
import { NextSession } from '../components/SessionCard'
import { byDate, Header, today } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey } from '../lib/drafts'

const ACTIONS: { href: string; label: string; icon: IconName; warm?: boolean }[] = [
  { href: '/systemes/nouveau', label: 'Dessiner un système', icon: 'playbook' },
  { href: '/entrainement/seance/nouveau', label: 'Préparer une séance', icon: 'calendar' },
  { href: '/entrainement/exercice/nouveau', label: 'Créer un exercice', icon: 'whistle', warm: true },
  { href: '/equipes', label: 'Gérer les équipes', icon: 'users', warm: true },
]

/** Premier écran du coach : ce qui arrive et ce qu'on veut faire. */
export function HomePage() {
  const { plays, sessions, teams } = useStore()
  const next = byDate(sessions).upcoming[0]
  const recent = [...plays].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  const steps = [
    { label: 'Ajouter une équipe', href: '/equipes', done: teams.length > 0 },
    { label: 'Dessiner un système', href: '/systemes/nouveau', done: plays.length > 0 },
    { label: 'Préparer une séance', href: '/entrainement/seance/nouveau', done: sessions.length > 0 },
    {
      label: 'Partager avec les joueurs',
      href: plays.length ? '/systemes' : '/entrainement',
      done: plays.some((p) => p.teams?.length) || sessions.some((s) => s.published),
    },
  ]
  const done = steps.filter((s) => s.done).length
  const date = new Date(`${today()}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <Header title="Accueil">
        <a className="icon-button" href="#/reglages" aria-label="Réglages"><Icon name="settings" /></a>
      </Header>
      <main>
        <div className="hello">
          <h2>Bonjour coach</h2>
          <p>{date}</p>
        </div>

        <PendingDraft table="plays" draftKey={draftKey('plays')} href="/systemes/nouveau" />
        <PendingDraft table="drills" draftKey={draftKey('drills')} href="/entrainement/exercice/nouveau" />

        {next && (
          <NextSession
            session={next}
            href={`/entrainement/seance/${next.id}`}
            title={[next.team, next.title].filter(Boolean).join(' · ')}
            detail={next.published ? 'Visible par les joueurs' : 'Pas encore partagée'}
          />
        )}

        <ul className="list tiles">
          {ACTIONS.map((a) => (
            <li key={a.href}>
              <a className="card tile" href={`#${a.href}`}>
                <span className={a.warm ? 'tile-icon warm' : 'tile-icon'}><Icon name={a.icon} /></span>
                {a.label}
              </a>
            </li>
          ))}
        </ul>

        {done < steps.length && (
          <section className="card">
            <div className="section-head">
              <h2>Pour bien démarrer</h2>
              <small>{done} sur {steps.length}</small>
            </div>
            <div className="progress"><i style={{ width: `${(done / steps.length) * 100}%` }} /></div>
            <ul className="list checklist">
              {steps.map((s) => (
                <li key={s.label} className={s.done ? 'done' : ''}>
                  <a href={`#${s.href}`}>
                    <span className="check">{s.done && <Icon name="check" />}</span>
                    {s.label}
                    {s.done && <span className="sr-only"> (fait)</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <div className="section-head">
              <h2>Derniers systèmes</h2>
              <a href="#/systemes">Tout voir</a>
            </div>
            <ul className="grid">
              {recent.map((play) => (
                <li key={play.id}>
                  <PlayCard play={play} href={`/systemes/${play.id}`} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  )
}
