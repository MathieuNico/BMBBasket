import type { ReactNode } from 'react'
import { clock, totalDuration } from '../lib/training'
import type { Session } from '../lib/types'
import { Icon } from './Icon'
import { formatDate } from './ui'

const asDate = (date: string) => new Date(`${date}T12:00:00`)

/** Pavé « 26 nov. » d'une séance. */
function DateTile({ date }: { date: string }) {
  return (
    <span className="date-tile" aria-hidden="true">
      {date ? (
        <>
          <b>{asDate(date).getDate()}</b>
          <span>{asDate(date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
        </>
      ) : (
        <Icon name="calendar" />
      )}
    </span>
  )
}

/** « jeu. 26 novembre · 18h00 » */
export const when = (session: Session) =>
  [formatDate(session.date), clock(session.time, 0)].filter(Boolean).join(' · ')

interface Props {
  session: Session
  href: string
  title: string
  badge?: ReactNode
  detail?: string
}

export function SessionCard({ session, href, title, badge, detail }: Props) {
  return (
    <a className="card session-card" href={`#${href}`}>
      <DateTile date={session.date} />
      <span className="session-info">
        <strong>{title}</strong>
        <small>
          {[clock(session.time, 0), `${totalDuration(session.items)} min`, detail].filter(Boolean).join(' · ')}
          <span className="sr-only"> — {formatDate(session.date)}</span>
        </small>
        {badge}
      </span>
      <span className="chevron"><Icon name="next" /></span>
    </a>
  )
}

interface HeroProps {
  session: Session
  href: string
  title: string
  detail: string
}

/** La prochaine séance, mise en avant. */
export function NextSession({ session, href, title, detail }: HeroProps) {
  return (
    <div className="hero">
      <span className="kicker">Prochaine séance</span>
      <strong>{when(session)}</strong>
      <span>{title}</span>
      <span>{detail}</span>
      <a className="button" href={`#${href}`}>Voir la séance</a>
    </div>
  )
}
