import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { COURT, defaultPositions, playerIds, type Positions } from '../lib/engine'
import { dist, toPath } from '../lib/geometry'
import type { PlayerId, Point, Scene } from '../lib/types'
import { useHistory } from '../lib/useHistory'
import { Court, courtPoint } from './Court'
import { Diagram } from './Diagram'
import { Icon } from './Icon'

const COLORS = [
  { value: '#ffffff', name: 'Blanc' },
  { value: '#fef201', name: 'Jaune' },
  { value: '#ff6b6b', name: 'Rouge' },
]

interface Stroke {
  color: string
  points: Point[]
}

interface Board {
  positions: Positions
  ball: Point
  strokes: Stroke[]
}

function initialBoard(): Board {
  const positions = defaultPositions()
  return { positions, ball: { x: positions.O1.x + 9, y: positions.O1.y + 5 }, strokes: [] }
}

type Gesture = { piece: PlayerId | 'ball'; at: Point } | { stroke: Stroke }

/** Ouverture de l'ardoise ; le bouton « retour » du téléphone la referme. */
export function useBoard() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [open])

  const show = useCallback(() => {
    history.pushState({ board: true }, '')
    setOpen(true)
  }, [])
  const hide = useCallback(() => history.back(), [])

  return { open, show, hide }
}

/** Ardoise de temps mort : on place les joueurs, on gribouille, rien n'est enregistré. */
export function Whiteboard({ onClose }: { onClose(): void }) {
  const board = useHistory<Board>(initialBoard)
  const [court, setCourt] = useState<Scene['court']>('half')
  const [defense, setDefense] = useState(true)
  const [color, setColor] = useState(COLORS[0].value)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const { positions, ball, strokes } = board.value

  const toCourt = (e: PointerEvent) => courtPoint(svg.current!, e, court)

  const down = (e: PointerEvent) => {
    if (!e.isPrimary || e.button > 0) return
    const p = toCourt(e)
    // le doigt posé sur un pion le déplace, ailleurs il dessine
    const pieces = [
      { id: 'ball' as const, at: ball, radius: 6 },
      ...playerIds(positions)
        .filter((id) => defense || id[0] !== 'X')
        .map((id) => ({ id, at: positions[id], radius: 8 })),
    ]
    const piece = pieces
      .filter((x) => dist(p, x.at) <= x.radius)
      .sort((a, b) => dist(p, a.at) - dist(p, b.at))[0]
    e.currentTarget.setPointerCapture(e.pointerId)
    setGesture(piece ? { piece: piece.id, at: piece.at } : { stroke: { color, points: [p] } })
  }

  const move = (e: PointerEvent) => {
    if (!gesture || !e.isPrimary) return
    const p = toCourt(e)
    setGesture(
      'stroke' in gesture
        ? { stroke: { ...gesture.stroke, points: [...gesture.stroke.points, p] } }
        : { ...gesture, at: p },
    )
  }

  const up = (e: PointerEvent) => {
    if (!gesture || !e.isPrimary) return
    setGesture(null)
    if ('stroke' in gesture) {
      if (gesture.stroke.points.length > 1) board.commit({ strokes: [...strokes, gesture.stroke] })
    } else if (gesture.piece === 'ball') board.commit({ ball: gesture.at })
    else board.commit({ positions: { ...positions, [gesture.piece]: gesture.at } })
  }

  const switchCourt = () => {
    const next = court === 'half' ? 'full' : 'half'
    if (next === 'half') {
      // les pions restés dans l'autre moitié reviennent au milieu du terrain
      const inside = (p: Point) => ({ x: p.x, y: Math.min(p.y, COURT.half - 8) })
      const moved = Object.fromEntries(playerIds(positions).map((id) => [id, inside(positions[id])])) as Positions
      board.commit({ positions: moved, ball: inside(ball), strokes: strokes.filter((s) => s.points.some((p) => p.y <= COURT.half)) })
    }
    setCourt(next)
  }

  const dragged = gesture && 'piece' in gesture ? gesture : undefined
  const shown = dragged && dragged.piece !== 'ball' ? { ...positions, [dragged.piece]: dragged.at } : positions
  const shownBall = dragged?.piece === 'ball' ? dragged.at : ball
  const lines = gesture && 'stroke' in gesture ? [...strokes, gesture.stroke] : strokes

  return (
    <div className="board" role="dialog" aria-label="Ardoise">
      <header className="header">
        <button className="icon-button" onClick={onClose} aria-label="Fermer l’ardoise"><Icon name="close" /></button>
        <h1>Ardoise</h1>
        <div className="header-actions">
          <button className="icon-button" onClick={board.undo} disabled={!board.canUndo} aria-label="Annuler"><Icon name="undo" /></button>
          <button className="icon-button" onClick={board.redo} disabled={!board.canRedo} aria-label="Rétablir"><Icon name="redo" /></button>
        </div>
      </header>

      <div className="board-court">
        <Court
          court={court}
          svgRef={svg}
          className="editing"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => setGesture(null)}
          aria-label="Terrain de l’ardoise"
        >
          {lines.map((s, i) => (
            <path key={i} className="stroke" stroke={s.color} d={toPath(s.points)} />
          ))}
          <Diagram state={{ positions: shown, balls: [] }} balls={[{ point: shownBall, holder: null }]} defense={defense} />
        </Court>
      </div>

      <div className="board-tools">
        <div className="swatches" role="group" aria-label="Couleur du stylo">
          {COLORS.map((c) => (
            <button
              key={c.value}
              className={c.value === color ? 'active' : ''}
              style={{ background: c.value }}
              aria-pressed={c.value === color}
              aria-label={c.name}
              onClick={() => setColor(c.value)}
            />
          ))}
          <button className="button ghost small" onClick={() => board.commit({ strokes: [] })} disabled={!strokes.length}>
            Effacer les traits
          </button>
        </div>
        <div className="row">
          <button className="button ghost small" onClick={() => board.commit(initialBoard())}>Tout replacer</button>
          <button className="button ghost small" aria-pressed={defense} onClick={() => setDefense(!defense)}>
            {defense ? 'Sans défense' : 'Avec défense'}
          </button>
          <button className="button ghost small" onClick={switchCourt}>{court === 'half' ? 'Terrain entier' : 'Demi-terrain'}</button>
        </div>
      </div>
    </div>
  )
}
