import { lerp, pointAt, smooth } from './geometry'
import {
  DEFENSE,
  OFFENSE,
  type Action,
  type Play,
  type PlayerId,
  type PlayerKind,
  type Point,
  type Scene,
  type Step,
} from './types'

/** Dimensions en décimètres (terrain FIBA 28 m × 15 m), panier attaqué en haut. */
export const COURT = { width: 150, half: 140, full: 280, basket: { x: 75, y: 15.75 } }

export const courtHeight = (court: Scene['court']) => (court === 'full' ? COURT.full : COURT.half)

/** Position d'un défenseur individuel face à son attaquant. */
export const marking = (attacker: Point) => lerp(attacker, COURT.basket, 0.24)

/** Positions de tous les joueurs d'une scène. Un joueur référencé existe toujours. */
export type Positions = Record<PlayerId, Point>

export interface State {
  positions: Positions
  /** Porteur de chaque ballon encore en jeu. */
  balls: PlayerId[]
}

export const uid = () => crypto.randomUUID()

export const newStep = (): Step => ({ id: uid(), actions: [], note: '' })

export const playerIds = (positions: Scene['start']) => Object.keys(positions) as PlayerId[]

export function nextPlayerId(start: Scene['start'], kind: PlayerKind): PlayerId {
  let n = 1
  while (start[`${kind}${n}`]) n++
  return `${kind}${n}`
}

/** Retire un joueur, ses ballons et toutes les actions qui le concernent. */
export function removePlayer(scene: Scene, id: PlayerId): Pick<Scene, 'start' | 'balls' | 'steps'> {
  const start = { ...scene.start }
  delete start[id]
  return {
    start,
    balls: scene.balls.filter((b) => b !== id),
    steps: scene.steps.map((s) => ({ ...s, actions: s.actions.filter((a) => a.player !== id && a.target !== id) })),
  }
}

export function defaultPositions(): Positions {
  const offense: Point[] = [
    { x: 75, y: 108 },
    { x: 128, y: 78 },
    { x: 22, y: 78 },
    { x: 136, y: 22 },
    { x: 48, y: 38 },
  ]
  const out = {} as Positions
  offense.forEach((p, i) => {
    out[OFFENSE[i]] = p
    // le défenseur se place entre son joueur et le panier
    out[DEFENSE[i]] = marking(p)
  })
  return out
}

export function newPlay(): Play {
  return {
    id: uid(),
    name: '',
    category: 'Attaque placée',
    description: '',
    court: 'half',
    defense: false,
    start: defaultPositions(),
    ball: 'O1',
    steps: [newStep()],
    updatedAt: new Date().toISOString(),
  }
}

/** Un système vu comme une scène : un seul ballon, pas de plots. */
export const playScene = (play: Play): Scene => ({
  court: play.court,
  start: play.start,
  balls: play.ball ? [play.ball] : [],
  cones: [],
  steps: play.steps,
})

export const isMovement = (a: Action) => a.kind === 'cut' || a.kind === 'dribble' || a.kind === 'screen'

const movementOf = (step: Step, player: PlayerId) =>
  step.actions.find((a) => a.player === player && isMovement(a) && a.path?.length)

const ballActionOf = (step: Step, holder: PlayerId) =>
  step.actions.find((a) => a.player === holder && (a.kind === 'shot' || (a.kind === 'pass' && a.target)))

/** Action jouée par chaque ballon : un joueur qui en tient deux n'en lance qu'un. */
const ballActions = (state: State, step: Step) =>
  state.balls.map((holder, i) => (state.balls.indexOf(holder) === i ? ballActionOf(step, holder) : undefined))

export function applyStep(state: State, step: Step): State {
  const positions = { ...state.positions }
  for (const a of step.actions) {
    if (isMovement(a) && a.path?.length) positions[a.player] = a.path[a.path.length - 1]
  }
  const actions = ballActions(state, step)
  const balls = state.balls.flatMap((holder, i) => {
    const action = actions[i]
    if (!action) return [holder]
    return action.kind === 'shot' ? [] : [action.target!]
  })
  return { positions, balls }
}

/** Situation au début du temps `index`. */
export function stateAt(scene: Scene, index: number): State {
  let state: State = { positions: scene.start as Positions, balls: scene.balls }
  for (let i = 0; i < Math.min(index, scene.steps.length); i++) state = applyStep(state, scene.steps[i])
  return state
}

/** Vrai si l'action a besoin du ballon mais que le joueur ne l'a pas (temps précédent modifié). */
export function isInvalid(state: State, action: Action) {
  return (action.kind === 'pass' || action.kind === 'shot' || action.kind === 'dribble') && !state.balls.includes(action.player)
}

/** Tracé d'une action, tel qu'il est dessiné sur le schéma. */
export function actionLine(state: State, step: Step, action: Action): Point[] {
  if (isMovement(action)) return smooth([state.positions[action.player], ...(action.path ?? [])])
  const dribble = movementOf(step, action.player)
  // après un dribble, la passe ou le tir part de l'arrivée du dribble
  const from = dribble?.kind === 'dribble' ? dribble.path!.at(-1)! : state.positions[action.player]
  if (action.kind === 'shot') return [from, COURT.basket]
  return [from, applyStep(state, step).positions[action.target!]]
}

const clamp = (t: number) => Math.max(0, Math.min(1, t))
const ease = (t: number) => t * t * (3 - 2 * t)

export interface Ball {
  point: Point
  /** Absent quand le ballon est en l'air ou dans le panier. */
  holder: PlayerId | null
}

/** Image de l'animation : temps `index`, avancement `t` entre 0 et 1. */
export function frameAt(scene: Scene, index: number, t: number) {
  const state = stateAt(scene, index)
  const step = scene.steps[index]
  const actions = ballActions(state, step)
  const dribblesFirst = (player: PlayerId) => movementOf(step, player)?.kind === 'dribble'

  const positions = { ...state.positions }
  for (const a of step.actions) {
    if (!isMovement(a) || !a.path?.length) continue
    let local = t
    if (state.balls.includes(a.player) && ballActionOf(step, a.player)) {
      // dribble puis passe, ou passe puis course
      local = a.kind === 'dribble' ? clamp(t / 0.55) : clamp((t - 0.35) / 0.65)
    }
    positions[a.player] = pointAt(actionLine(state, step, a), ease(local))
  }

  const balls: Ball[] = state.balls.map((holder, i) => {
    const held = { point: positions[holder], holder }
    const action = actions[i]
    if (!action) return held
    const receiverMoves = action.kind === 'pass' && !!movementOf(step, action.target!)
    const [from, to] = dribblesFirst(holder) ? [0.55, 1] : receiverMoves ? [0.35, 1] : [0.1, 0.6]
    const local = clamp((t - from) / (to - from))
    if (local <= 0) return held
    const [origin, destination] = actionLine(state, step, action)
    if (local < 1) return { point: lerp(origin, destination, local), holder: null }
    if (action.kind === 'shot') return { point: COURT.basket, holder: null }
    return { point: positions[action.target!], holder: action.target! }
  })

  return { positions, balls }
}
