import type { ReactNode } from 'react'
import { playScene } from '../lib/engine'
import type { Play } from '../lib/types'
import { Thumbnail } from './Diagram'

export function PlayCard({ play, href, children }: { play: Play; href: string; children?: ReactNode }) {
  return (
    <a className="card play-card" href={`#${href}`}>
      <Thumbnail scene={playScene(play)} defense={play.defense} />
      <strong>{play.name}</strong>
      <span>{play.category} · {play.steps.length} temps</span>
      {children}
    </a>
  )
}
