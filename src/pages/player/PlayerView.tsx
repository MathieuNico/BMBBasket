import { useState, type ReactNode } from 'react'
import { Thumbnail } from '../../components/Diagram'
import { PlayPlayer } from '../../components/PlayPlayer'
import { byDate, byName, Chips, formatDate, Header, NotFound, normalize } from '../../components/ui'
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

function Tabs({ base, current }: { base: string; current: 'seances' | 'systemes' }) {
  return (
    <nav className="subtabs" aria-label="Contenu de l’équipe">
      <a href={`#${base}`} className={current === 'seances' ? 'active' : ''}>Séances</a>
      <a href={`#${base}/systemes`} className={current === 'systemes' ? 'active' : ''}>Systèmes</a>
    </nav>
  )
}

function SessionLinks({ title, sessions, base }: { title: string; sessions: Session[]; base: string }) {
  if (!sessions.length) return null
  return (
    <section>
      <h2>{title}</h2>
      <ul className="list">
        {sessions.map((s) => (
          <li key={s.id}>
            <a className="card session-card" href={`#${base}/seance/${s.id}`}>
              <span className="session-date">{formatDate(s.date)}{s.time && ` · ${clock(s.time, 0)}`}</span>
              <strong>{s.title || 'Entraînement'}</strong>
              <span>{totalDuration(s.items)} min</span>
            </a>
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
        <button className="button ghost small" aria-expanded={open} onClick={() => setOpen(!open)}>
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
      <Header title={session.title || 'Entraînement'} back={base} />
      <main>
        <div className="card">
          <strong className="session-date">
            {formatDate(session.date)}{session.time && ` · ${clock(session.time, 0)}`}
          </strong>
          <span className="muted">{totalDuration(session.items)} min</span>
          {session.objective && (
            <div className="detail">
              <h3>Objectif</h3>
              <p className="pre">{session.objective}</p>
            </div>
          )}
        </div>
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

  if (!content.plays.length) return <p className="muted center">Aucun système partagé pour le moment.</p>

  return (
    <>
      {content.plays.length > 5 && (
        <input type="search" placeholder="Rechercher un système" value={search} onChange={(e) => setSearch(e.target.value)} />
      )}
      {categories.length > 1 && <Chips options={categories} value={active} onChange={setCategory} />}
      <ul className="grid">
        {shown.map((play) => (
          <li key={play.id}>
            <a className="card play-card" href={`#${base}/systeme/${play.id}`}>
              <Thumbnail scene={playScene(play)} defense={play.defense} />
              <strong>{play.name}</strong>
              <span>{play.category} · {play.steps.length} temps</span>
            </a>
          </li>
        ))}
      </ul>
      {!shown.length && <p className="muted center">Aucun système ne correspond.</p>}
    </>
  )
}

/** Consultation seule : ce que voit un joueur de l'équipe. */
export function PlayerView({ content, base, path, back, banner, footer }: Props) {
  const [kind, id] = path

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
        <Header title={play.name} back={`${base}/systemes`} />
        <main>
          <PlayPlayer key={play.id} scene={playScene(play)} defense={play.defense} />
          <div className="card">
            <span className="tag">{play.category}</span>
            {play.description && <p className="pre">{play.description}</p>}
          </div>
        </main>
      </>
    )
  }

  const plays = kind === 'systemes'
  const { upcoming, past } = byDate(content.sessions)

  return (
    <>
      <Header title={content.team} back={back} />
      <Tabs base={base} current={plays ? 'systemes' : 'seances'} />
      <main>
        {banner}
        {plays ? (
          <Playbook content={content} base={base} />
        ) : content.sessions.length ? (
          <>
            <SessionLinks title="À venir" sessions={upcoming} base={base} />
            <SessionLinks title="Passées" sessions={past} base={base} />
          </>
        ) : (
          <p className="muted center">Aucune séance publiée pour le moment.</p>
        )}
        {footer}
      </main>
    </>
  )
}
