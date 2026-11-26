import { useState, type ReactNode } from 'react'
import { Thumbnail } from '../../components/Diagram'
import { Nav, type NavItem } from '../../components/Nav'
import { PlayCard } from '../../components/PlayCard'
import { PlayPlayer } from '../../components/PlayPlayer'
import { NextSession, SessionCard, when } from '../../components/SessionCard'
import { byDate, byName, Chips, EmptyState, Header, NotFound, normalize, Search } from '../../components/ui'
import { playScene } from '../../lib/engine'
import type { PlayerContent } from '../../lib/sharing'
import { clock, hasDiagram, totalDuration } from '../../lib/training'
import type { Drill, Session, SessionItem } from '../../lib/types'
import { DrillDetails } from '../training/DrillPage'

interface Props {
  content: PlayerContent
  /** Début des adresses : « /joueur », ou l'aperçu d'un coach. */
  base: string
  path: string[]
  /** Retour vers l'espace coach, pendant un aperçu. */
  back?: string
  banner?: ReactNode
  footer?: ReactNode
}

const title = (session: Session) => session.title || 'Entraînement'

function SessionLinks({ heading, sessions, base }: { heading: string; sessions: Session[]; base: string }) {
  if (!sessions.length) return null
  return (
    <section>
      <h2>{heading}</h2>
      <ul className="list">
        {sessions.map((s) => (
          <li key={s.id}>
            <SessionCard session={s} href={`${base}/seance/${s.id}`} title={title(s)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Item({ item, drill, start }: { item: SessionItem; drill?: Drill; start: string }) {
  const [open, setOpen] = useState(false)
  const name = drill?.name ?? item.title
  return (
    <li className="card entry">
      <div className="entry-head">
        {drill && hasDiagram(drill) && <Thumbnail scene={drill} />}
        <span>
          <strong>{name || 'Temps libre'}</strong>
          <small>{[start, `${item.duration} min`, drill?.theme].filter(Boolean).join(' · ')}</small>
        </span>
      </div>
      {item.note && <p className="step-note pre">{item.note}</p>}
      {drill && (
        <button className="button soft small" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Masquer' : 'Voir l’exercice'}
        </button>
      )}
      {open && drill && (
        <div className="entry-detail">
          {hasDiagram(drill) && <PlayPlayer scene={drill} />}
          <DrillDetails drill={drill} />
        </div>
      )}
    </li>
  )
}

function SessionView({ session, content, base }: { session: Session; content: PlayerContent; base: string }) {
  return (
    <>
      <Header title={title(session)} subtitle={`${when(session)} · ${totalDuration(session.items)} min`} back={base} />
      <main>
        {session.objective && (
          <div className="card">
            <h3>Objectif</h3>
            <p className="pre">{session.objective}</p>
          </div>
        )}
        <ol className="list">
          {session.items.map((item, i) => (
            <Item
              key={item.id}
              item={item}
              drill={content.drills.find((d) => d.id === item.drillId)}
              start={clock(session.time, totalDuration(session.items.slice(0, i)))}
            />
          ))}
        </ol>
        {!session.items.length && <p className="muted center">Le déroulé n’est pas encore détaillé.</p>}
      </main>
    </>
  )
}

function Playbook({ content, base }: { content: PlayerContent; base: string }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const categories = [...new Set(content.plays.map((p) => p.category))].sort()
  const active = categories.includes(category) ? category : ''
  const shown = content.plays
    .filter((p) => !active || p.category === active)
    .filter((p) => normalize(`${p.name} ${p.description}`).includes(normalize(search.trim())))
    .sort(byName)

  if (!content.plays.length) {
    return <EmptyState icon="playbook" title="Pas encore de système" text="Les systèmes partagés par ton coach apparaîtront ici." />
  }

  return (
    <>
      {content.plays.length > 5 && <Search label="Rechercher un système" value={search} onChange={setSearch} />}
      {categories.length > 1 && <Chips options={categories} value={active} onChange={setCategory} />}
      <ul className="grid">
        {shown.map((play) => (
          <li key={play.id}>
            <PlayCard play={play} href={`${base}/systeme/${play.id}`} />
          </li>
        ))}
      </ul>
      {!shown.length && <p className="muted center">Aucun système ne correspond.</p>}
    </>
  )
}

function Sessions({ content, base }: { content: PlayerContent; base: string }) {
  if (!content.sessions.length) {
    return <EmptyState icon="calendar" title="Pas encore de séance" text="Les séances publiées par ton coach apparaîtront ici." />
  }
  const { upcoming, past } = byDate(content.sessions)
  const [next, ...later] = upcoming
  return (
    <>
      {next && (
        <NextSession
          session={next}
          href={`${base}/seance/${next.id}`}
          title={title(next)}
          detail={`${totalDuration(next.items)} min`}
        />
      )}
      <SessionLinks heading="Ensuite" sessions={later} base={base} />
      <SessionLinks heading="Passées" sessions={past} base={base} />
    </>
  )
}

/** Consultation seule : ce que voit un joueur de l'équipe. */
export function PlayerView({ content, base, path, back, banner, footer }: Props) {
  const [kind, id] = path
  const plays = kind === 'systemes' || kind === 'systeme'
  const tabs: NavItem[] = [
    { id: 'seances', href: base, label: 'Séances', icon: 'calendar' },
    { id: 'systemes', href: `${base}/systemes`, label: 'Systèmes', icon: 'playbook' },
  ]

  const screen = () => {
    if (kind === 'seance') {
      const session = content.sessions.find((s) => s.id === id)
      return session ? (
        <SessionView key={session.id} session={session} content={content} base={base} />
      ) : (
        <NotFound back={base} text="Cette séance n’est plus partagée." />
      )
    }

    if (kind === 'systeme') {
      const play = content.plays.find((p) => p.id === id)
      if (!play) return <NotFound back={`${base}/systemes`} text="Ce système n’est plus partagé." />
      return (
        <>
          <Header title={play.name} subtitle={play.category} back={`${base}/systemes`} />
          <main>
            <PlayPlayer key={play.id} scene={playScene(play)} defense={play.defense} />
            {play.description && (
              <div className="card">
                <p className="pre">{play.description}</p>
              </div>
            )}
          </main>
        </>
      )
    }

    return (
      <>
        <Header title={plays ? 'Systèmes' : 'Séances'} subtitle={content.team} back={back} />
        <main>
          {banner}
          {plays ? <Playbook content={content} base={base} /> : <Sessions content={content} base={base} />}
          {footer}
        </main>
      </>
    )
  }

  return (
    <div className="shell with-nav">
      {screen()}
      <Nav items={tabs} current={plays ? 'systemes' : 'seances'} />
    </div>
  )
}
