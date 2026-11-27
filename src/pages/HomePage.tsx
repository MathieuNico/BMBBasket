import { CoachName } from '../components/CoachName'
import { PendingDraft } from '../components/DraftNotice'
import { Icon, type IconName } from '../components/Icon'
import { showCoach } from '../components/OwnerFilter'
import { PlayCard } from '../components/PlayCard'
import { NextSession } from '../components/SessionCard'
import { byDate, Header, today } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey } from '../lib/drafts'
import { coachName, needsName } from '../lib/owners'
import { navigate } from '../lib/router'

const ACTIONS: { href: string; label: string; icon: IconName; warm?: boolean }[] = [
  { href: '/systemes/nouveau', label: 'Dessiner un système', icon: 'playbook' },
  { href: '/entrainement/seance/nouveau', label: 'Préparer une séance', icon: 'calendar' },
  { href: '/entrainement/exercice/nouveau', label: 'Créer un exercice', icon: 'whistle', warm: true },
  { href: '/equipes', label: 'Gérer les équipes', icon: 'users', warm: true },
]

/** Premier écran du coach : ce qui arrive et ce qu'on veut faire. */
export function HomePage() {
  const store = useStore()
  const { teams, drills, me, coaches, isMine } = store
  const plays = store.plays.filter(isMine)
  const sessions = store.sessions.filter(isMine)
  const next = byDate(sessions).upcoming[0]
  const recent = [...plays].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  const myself = coaches.find((c) => c.id === me)
  const others = coaches.filter((c) => c.id !== me)
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
          <h2>Bonjour {myself && !needsName(myself) ? myself.name : 'coach'}</h2>
          <p>{date}</p>
        </div>

        {needsName(myself) && (
          <section className="card">
            <h2>Comment t’appelles-tu ?</h2>
            <p className="muted">Les autres coachs verront ce nom sur tes systèmes et tes séances.</p>
            <CoachName />
          </section>
        )}

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
              <h2>Mes derniers systèmes</h2>
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

        {others.length > 0 && (
          <section>
            <h2>Les autres coachs</h2>
            <ul className="list">
              {others.map((coach) => {
                const count = (items: { ownerId?: string }[]) => items.filter((x) => x.ownerId === coach.id).length
                return (
                  <li key={coach.id}>
                    <button
                      className="card coach-link"
                      onClick={() => {
                        showCoach(coach.id)
                        navigate('/systemes')
                      }}
                    >
                      <span className="avatar" aria-hidden="true">{coachName(coach).slice(0, 2).toUpperCase()}</span>
                      <span className="session-info">
                        <strong>{coachName(coach)}</strong>
                        <small>
                          {count(store.plays)} système(s) · {count(drills)} exercice(s) · {count(store.sessions)} séance(s)
                        </small>
                      </span>
                      <span className="chevron"><Icon name="next" /></span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  )
}
