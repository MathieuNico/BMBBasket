import { useEffect, useState } from 'react'
import { frameAt, stateAt } from '../lib/engine'
import type { Scene } from '../lib/types'
import { Court } from './Court'
import { Diagram } from './Diagram'
import { Icon } from './Icon'

const STEP_MS = 1800
const PAUSE = 0.25
const SPEEDS = [0.5, 1, 1.5]

/** Lecture animée d'un schéma, temps par temps. */
export function PlayPlayer({ scene, defense = true }: { scene: Scene; defense?: boolean }) {
  const [{ index: position, t }, setPos] = useState({ index: 0, t: 0 })
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const last = scene.steps.length - 1
  const index = Math.min(position, last)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = (Math.min(now - previous, 100) / STEP_MS) * speed
      previous = now
      setPos((p) => {
        const next = p.t + delta
        // courte pause entre deux temps
        if (p.index < last && next >= 1 + PAUSE) return { index: p.index + 1, t: 0 }
        return { index: p.index, t: p.index === last ? Math.min(next, 1) : next }
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, last])

  useEffect(() => {
    if (playing && index === last && t >= 1) setPlaying(false)
  }, [playing, index, t, last])

  const goTo = (i: number) => {
    setPlaying(false)
    setPos({ index: Math.max(0, Math.min(last, i)), t: 0 })
  }

  const toggle = () => {
    if (!playing && index === last && t >= 1) setPos({ index: 0, t: 0 })
    setPlaying(!playing)
  }

  const frame = frameAt(scene, index, Math.min(t, 1))
  const step = scene.steps[index]

  return (
    <div className="player-view">
      <Court court={scene.court} role="img" aria-label={`Schéma, temps ${index + 1}`}>
        <Diagram
          state={stateAt(scene, index)}
          step={step}
          positions={frame.positions}
          balls={frame.balls}
          cones={scene.cones}
          defense={defense}
          faded={playing}
        />
      </Court>
      <div className="playback">
        {last > 0 && (
          <div className="timeline">
            {scene.steps.map((s, i) => (
              <button key={s.id} className={i === index ? 'active' : i < index ? 'passed' : ''} onClick={() => goTo(i)} aria-label={`Temps ${i + 1}`} />
            ))}
          </div>
        )}
        <div className="transport">
          <span className="counter" aria-label={`Temps ${index + 1} sur ${last + 1}`}>{index + 1} / {last + 1}</span>
          <button onClick={() => goTo(index - 1)} disabled={index === 0 && t === 0} aria-label="Temps précédent">
            <Icon name="prev" />
          </button>
          <button className="play-button" onClick={toggle} aria-label={playing ? 'Pause' : 'Lire'}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button onClick={() => goTo(index + 1)} disabled={index === last} aria-label="Temps suivant">
            <Icon name="next" />
          </button>
          <button className="speed" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} aria-label="Vitesse">
            ×{String(speed).replace('.', ',')}
          </button>
        </div>
      </div>
      {step.note && <p className="step-note">{step.note}</p>}
    </div>
  )
}
