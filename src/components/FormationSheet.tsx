import { stateAt, newStep, playScene } from '../lib/engine'
import { applyAttack, applyDefense, ATTACKS, DEFENSES, type Formation } from '../lib/formations'
import type { Play } from '../lib/types'
import { Court } from './Court'
import { Diagram } from './Diagram'

interface Props {
  play: Play
  onPick(changes: Partial<Play>): void
  onClose(): void
}

/** Choix d'un placement de départ, avec un aperçu de chacun. */
export function FormationSheet({ play, onPick, onClose }: Props) {
  const section = (title: string, formations: Formation[], apply: typeof applyAttack, defense: boolean) => (
    <section>
      <h2>{title}</h2>
      <ul className="grid formations">
        {formations.map((f) => {
          const changes = apply(play, f)
          const scene = playScene({ ...play, ...changes, steps: [newStep()] })
          return (
            <li key={f.name}>
              <button
                onClick={() => {
                  onPick(changes)
                  onClose()
                }}
              >
                <Court court="half" aria-hidden="true">
                  <Diagram state={stateAt(scene, 0)} defense={defense} />
                </Court>
                <strong>{f.name}</strong>
                <small>{f.detail}</small>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Placements de départ" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-body">
          {section('Attaque', ATTACKS, applyAttack, false)}
          {section('Défense', DEFENSES, applyDefense, true)}
        </div>
        <button className="button ghost" onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}
