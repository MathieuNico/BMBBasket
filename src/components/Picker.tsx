import { useState } from 'react'
import type { Scene } from '../lib/types'
import { Thumbnail } from './Diagram'
import { byName, normalize } from './ui'

export interface Choice {
  id: string
  name: string
  detail: string
  scene: Scene
  defense?: boolean
  /** Auteur, quand ce n'est pas soi. */
  author?: string
}

interface Props {
  title: string
  choices: Choice[]
  chosen: string[]
  empty: string
  onClose(ids: string[]): void
}

/** Panneau pour cocher des systèmes ou des exercices. */
export function Picker({ title, choices, chosen, empty, onClose }: Props) {
  const [ids, setIds] = useState(chosen)
  const [search, setSearch] = useState('')
  const others = choices.some((c) => c.author)
  // on propose d'abord ses propres contenus, s'il y en a
  const [everyone, setEveryone] = useState(() => choices.every((c) => c.author))
  const shown = choices
    .filter((c) => everyone || !c.author)
    .filter((c) => normalize(`${c.name} ${c.detail} ${c.author ?? ''}`).includes(normalize(search.trim())))
    .sort(byName)

  return (
    <div className="overlay" onClick={() => onClose(chosen)}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {others && (
          <div className="segmented">
            <button className={everyone ? '' : 'active'} aria-pressed={!everyone} onClick={() => setEveryone(false)}>Les miens</button>
            <button className={everyone ? 'active' : ''} aria-pressed={everyone} onClick={() => setEveryone(true)}>Tous les coachs</button>
          </div>
        )}
        {choices.length > 5 && (
          <input type="search" placeholder="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        )}
        <ul className="list">
          {shown.map((c) => (
            <li key={c.id}>
              <label className="pick">
                <input
                  type="checkbox"
                  checked={ids.includes(c.id)}
                  onChange={(e) => setIds(e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))}
                />
                <Thumbnail scene={c.scene} defense={c.defense} />
                <span><strong>{c.name}</strong><small>{c.author ? `${c.detail} · par ${c.author}` : c.detail}</small></span>
              </label>
            </li>
          ))}
        </ul>
        {!choices.length && <p className="muted">{empty}</p>}
        {choices.length > 0 && !shown.length && <p className="muted">Rien ne correspond ici.</p>}
        <div className="row">
          <button className="button ghost" onClick={() => onClose(chosen)}>Annuler</button>
          <button className="button primary" onClick={() => onClose(ids)}>Valider</button>
        </div>
      </div>
    </div>
  )
}
