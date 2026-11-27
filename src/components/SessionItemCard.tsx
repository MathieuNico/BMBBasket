import { useState } from 'react'
import { DrillDetails } from '../pages/training/DrillPage'
import { hasDiagram } from '../lib/training'
import type { Drill, SessionItem } from '../lib/types'
import { Thumbnail } from './Diagram'
import { PlayPlayer } from './PlayPlayer'

/** Élément d'une séance en consultation. */
export function SessionItemCard({ item, drill, start }: { item: SessionItem; drill?: Drill; start: string }) {
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
