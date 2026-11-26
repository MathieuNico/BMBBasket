import { actionLine, isInvalid, playerIds, stateAt, type Ball, type State } from '../lib/engine'
import { dist, pointAtDistance, length, toPath, trim, wavy } from '../lib/geometry'
import type { Action, Cone, Point, Scene, Step } from '../lib/types'
import { Court } from './Court'

function ArrowHead({ line }: { line: Point[] }) {
  const tip = line[line.length - 1]
  const back = pointAtDistance(line, Math.max(0, length(line) - 4))
  const angle = (Math.atan2(tip.y - back.y, tip.x - back.x) * 180) / Math.PI
  return <polygon className="arrow-head" points="1.5,0 -5,-3.4 -5,3.4" transform={`translate(${tip.x} ${tip.y}) rotate(${angle})`} />
}

function ScreenBar({ line }: { line: Point[] }) {
  const tip = line[line.length - 1]
  const back = pointAtDistance(line, Math.max(0, length(line) - 4))
  const l = dist(tip, back) || 1
  const nx = (-(tip.y - back.y) / l) * 6
  const ny = ((tip.x - back.x) / l) * 6
  return <line className="action-line screen-bar" x1={tip.x - nx} y1={tip.y - ny} x2={tip.x + nx} y2={tip.y + ny} />
}

function ActionShape({ state, step, action }: { state: State; step: Step; action: Action }) {
  let line = actionLine(state, step, action)
  if (action.kind === 'pass') line = trim(line, 7, 7)
  if (action.kind === 'shot') line = trim(line, 7, 4)
  if (line.length < 2) return null
  const drawn = action.kind === 'dribble' ? wavy(line) : line
  return (
    <g className={`action action-${action.kind} ${isInvalid(state, action) ? 'invalid' : ''}`}>
      <path className="action-line" d={toPath(drawn)} />
      {action.kind === 'screen' ? <ScreenBar line={line} /> : <ArrowHead line={line} />}
    </g>
  )
}

interface Props {
  state: State
  /** Temps dont les actions sont dessinées. */
  step?: Step
  positions?: State['positions']
  balls?: Ball[]
  cones?: Cone[]
  /** Affiche les défenseurs. */
  defense?: boolean
  faded?: boolean
}

export function Diagram({ state, step, positions = state.positions, balls, cones = [], defense = true, faded }: Props) {
  const shownBalls = balls ?? state.balls.map((holder) => ({ holder, point: positions[holder] }))
  const players = playerIds(positions).filter((id) => defense || id[0] !== 'X')
  // les attaquants sont dessinés par-dessus les autres
  players.sort((a, b) => 'XCO'.indexOf(a[0]) - 'XCO'.indexOf(b[0]))
  return (
    <g>
      {cones.map((c) => (
        <g key={c.id} className="cone" transform={`translate(${c.x} ${c.y})`}>
          <path d="M0 -4.5L4 3.5H-4Z" />
        </g>
      ))}
      {step && (
        <g className={faded ? 'actions faded' : 'actions'}>
          {step.actions
            .filter((a) => defense || a.player[0] !== 'X')
            .map((a) => (
              <ActionShape key={a.id} state={state} step={step} action={a} />
            ))}
        </g>
      )}
      {players.map((id) => {
        const transform = `translate(${positions[id].x} ${positions[id].y})`
        const hasBall = shownBalls.some((b) => b.holder === id)
        const number = id.slice(1)
        if (id[0] === 'X') {
          return (
            <g key={id} className="player defender" transform={transform}>
              <path d="M-4.2 -4.2L4.2 4.2M4.2 -4.2L-4.2 4.2" />
              <text x={7.5} y={-3}>{number}</text>
            </g>
          )
        }
        return (
          <g key={id} className={`player ${id[0] === 'C' ? 'coach' : 'attacker'} ${hasBall ? 'has-ball' : ''}`} transform={transform}>
            {id[0] === 'C' ? <rect x={-5.5} y={-5.5} width={11} height={11} rx={2} /> : <circle r={6} />}
            <text y={0.4}>{id[0] === 'C' ? 'C' : number}</text>
          </g>
        )
      })}
      {shownBalls.map((ball, i) => {
        // un joueur qui tient deux ballons les porte de part et d'autre
        const second = ball.holder && shownBalls.findIndex((b) => b.holder === ball.holder) !== i
        const dx = ball.holder ? (second ? -5 : 5) : 0
        const dy = ball.holder ? 4.5 : 0
        return (
          <g key={i} className="ball" transform={`translate(${ball.point.x + dx} ${ball.point.y + dy})`}>
            <circle r={3.1} />
            <path d="M-3.1 0H3.1M0 -3.1V3.1" />
          </g>
        )
      })}
    </g>
  )
}

/** Vignette : la situation de départ et le premier temps. */
export function Thumbnail({ scene, defense = true }: { scene: Scene; defense?: boolean }) {
  return (
    <Court court={scene.court} aria-hidden="true">
      <Diagram state={stateAt(scene, 0)} step={scene.steps[0]} cones={scene.cones} defense={defense} />
    </Court>
  )
}
