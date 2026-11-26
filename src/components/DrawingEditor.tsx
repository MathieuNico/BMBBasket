import { useRef, useState, type PointerEvent } from 'react'
import {
  actionLine,
  applyStep,
  COURT,
  courtHeight,
  isInvalid,
  isMovement,
  newStep,
  nextPlayerId,
  playerIds,
  removePlayer,
  stateAt,
  uid,
  type Positions,
} from '../lib/engine'
import { dist, distanceToLine, length, simplify, toPath } from '../lib/geometry'
import type { Action, ActionKind, PlayerId, PlayerKind, Point, Scene, Step } from '../lib/types'
import { Court } from './Court'
import { Diagram } from './Diagram'
import { Icon } from './Icon'
import { PlayPlayer } from './PlayPlayer'
import { useFeedback } from './ui'

type ElementTool = 'move' | 'addO' | 'addX' | 'addC' | 'cone' | 'ball'
type Tool = ElementTool | ActionKind | 'erase'

interface ToolInfo {
  id: Tool
  label: string
  hint: string
  icon: string
}

/** Outils qui construisent la situation de départ (premier temps uniquement). */
const ELEMENTS: ToolInfo[] = [
  { id: 'move', label: 'Placer', hint: 'Fais glisser un joueur ou un plot pour le placer.', icon: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3' },
  { id: 'addO', label: 'Joueur', hint: 'Touche le terrain pour ajouter un joueur.', icon: 'M12 5a7 7 0 100 14 7 7 0 000-14zM12 9v6M9 12h6' },
  { id: 'addX', label: 'Défens.', hint: 'Touche le terrain pour ajouter un défenseur.', icon: 'M6 6l12 12M18 6L6 18' },
  { id: 'addC', label: 'Coach', hint: 'Touche le terrain pour placer un coach.', icon: 'M5 5h14v14H5zM15 10a4 4 0 100 4' },
  { id: 'cone', label: 'Plot', hint: 'Touche le terrain pour poser un plot.', icon: 'M12 4l6 15H6zM4 20h16' },
  { id: 'ball', label: 'Ballon', hint: 'Touche un joueur pour lui donner ou lui retirer un ballon.', icon: 'M12 4a8 8 0 100 16 8 8 0 000-16zM4 12h16M12 4v16' },
]

const ACTIONS: ToolInfo[] = [
  { id: 'cut', label: 'Course', hint: 'Pars d’un joueur et dessine sa course avec le doigt.', icon: 'M4 20L19 5M11 5h8v8' },
  { id: 'dribble', label: 'Dribble', hint: 'Pars d’un porteur de ballon et dessine son dribble.', icon: 'M4 20c1-5 5-1 6-5s5-1 6-5l3-5M13 5h6v6' },
  { id: 'pass', label: 'Passe', hint: 'Touche le receveur. Avec plusieurs ballons, glisse du passeur au receveur.', icon: 'M4 20l3-3M10 14l3-3M16 8l3-3M12 5h7v7' },
  { id: 'screen', label: 'Écran', hint: 'Pars d’un joueur et dessine jusqu’à l’endroit de l’écran.', icon: 'M5 19L16 8M11 4l9 9' },
  { id: 'shot', label: 'Tir', hint: 'Touche un porteur de ballon pour le faire tirer.', icon: 'M5 19C5 9 10 6 17 8M13 4l5 4-4 5' },
  { id: 'erase', label: 'Gomme', hint: 'Touche une flèche pour l’effacer.', icon: 'M9 20h11M5 15l9-9 5 5-8 8H9z' },
]

const isElement = (tool: Tool) => ELEMENTS.some((t) => t.id === tool)

interface Drag {
  player?: PlayerId
  cone?: string
  points: Point[]
}

interface Props {
  scene: Scene
  /** Exercices : joueurs, plots et ballons librement ajoutés. */
  free?: boolean
  defense?: boolean
  initialTool: Tool
  /** Modification annulable. */
  onCommit(changes: Partial<Scene>): void
  /** Saisie de texte. */
  onPatch(changes: Partial<Scene>): void
  history: { canUndo: boolean; canRedo: boolean; undo(): void; redo(): void }
}

/** Dessin d'un schéma, temps par temps, au doigt. */
export function DrawingEditor({ scene, free, defense = true, initialTool, onCommit, onPatch, history }: Props) {
  const { toast } = useFeedback()
  const [position, setIndex] = useState(0)
  const [selected, setSelected] = useState<Tool>(initialTool)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [preview, setPreview] = useState(false)
  const svg = useRef<SVGSVGElement>(null)

  // annuler peut retirer le temps affiché
  const index = Math.min(position, scene.steps.length - 1)
  const step = scene.steps[index]
  const tool: Tool = index > 0 && isElement(selected) ? 'cut' : selected
  const state = stateAt(scene, index)
  const visible = playerIds(state.positions).filter((id) => defense || id[0] !== 'X')
  const holders = [...new Set(state.balls)]

  const stepsWith = (changes: Partial<Step>) => scene.steps.map((s) => (s.id === step.id ? { ...s, ...changes } : s))
  const setActions = (actions: Action[]) => onCommit({ steps: stepsWith({ actions }) })
  /** Remplace la passe ou le tir d'un joueur sur ce temps. */
  const setBallAction = (action: Action) =>
    setActions([...step.actions.filter((a) => !(a.player === action.player && (a.kind === 'pass' || a.kind === 'shot'))), action])

  const toCourt = (e: PointerEvent): Point => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
    const clamp = (v: number, max: number) => Math.round(Math.max(-4, Math.min(max + 4, v)) * 10) / 10
    return { x: clamp(p.x, COURT.width), y: clamp(p.y, courtHeight(scene.court)) }
  }

  const nearest = <T,>(p: Point, items: T[], where: (item: T) => Point, radius: number): T | undefined =>
    items
      .map((item) => ({ item, d: dist(p, where(item)) }))
      .filter((x) => x.d <= radius)
      .sort((a, b) => a.d - b.d)[0]?.item

  const playerAt = (p: Point, positions: Positions, among: PlayerId[] = visible, radius = 11) =>
    nearest(p, among, (id) => positions[id], radius)

  const erase = (p: Point) => {
    if (free && index === 0) {
      const player = playerAt(p, state.positions, visible, 6.5)
      if (player) return onCommit(removePlayer(scene, player))
      const cone = nearest(p, scene.cones, (c) => c, 6)
      if (cone) return onCommit({ cones: scene.cones.filter((c) => c.id !== cone.id) })
    }
    const near = step.actions
      .filter((a) => defense || a.player[0] !== 'X')
      .map((a) => ({ a, d: distanceToLine(p, actionLine(state, step, a)) }))
      .filter((x) => x.d <= 7)
      .sort((a, b) => a.d - b.d)[0]
    if (near) setActions(step.actions.filter((a) => a.id !== near.a.id))
  }

  const down = (e: PointerEvent) => {
    if (!e.isPrimary || e.button > 0) return
    const p = toCourt(e)

    if (tool === 'erase') return erase(p)
    if (tool === 'addO' || tool === 'addX' || tool === 'addC') {
      const kind = tool.slice(3) as PlayerKind
      return onCommit({ start: { ...scene.start, [nextPlayerId(scene.start, kind)]: p } })
    }
    if (tool === 'cone') return onCommit({ cones: [...scene.cones, { id: uid(), ...p }] })
    if (tool === 'ball') {
      const player = playerAt(p, state.positions)
      if (!player) return
      const balls = scene.balls.includes(player) ? scene.balls.filter((b) => b !== player) : [...scene.balls, player]
      return onCommit({ balls })
    }
    if (tool === 'shot') {
      if (!holders.length) return toast('Personne n’a le ballon à ce temps.')
      const player = playerAt(p, state.positions, holders)
      if (!player) return toast('Touche un porteur de ballon.')
      return setBallAction({ id: uid(), kind: 'shot', player })
    }

    let next: Drag
    if (tool === 'move') {
      const player = playerAt(p, state.positions)
      const cone = player ? undefined : nearest(p, scene.cones, (c) => c, 8)
      if (!player && !cone) return
      next = { player, cone: cone?.id, points: [player ? state.positions[player] : { x: cone!.x, y: cone!.y }, p] }
    } else if (tool === 'pass') {
      if (!holders.length) return toast('Personne n’a le ballon à ce temps.')
      next = { points: [p, p] }
    } else {
      const player = playerAt(p, state.positions)
      if (!player) return
      if (tool === 'dribble' && !holders.includes(player)) return toast('Il faut avoir un ballon pour dribbler.')
      next = { player, points: [state.positions[player], p] }
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(next)
  }

  const move = (e: PointerEvent) => {
    if (!drag || !e.isPrimary) return
    const p = toCourt(e)
    setDrag({ ...drag, points: [...drag.points, p] })
  }

  /** Passeur désigné par le point de départ du geste. */
  const passerFrom = (p: Point) => (holders.length === 1 ? holders[0] : playerAt(p, state.positions, holders))

  const up = (e: PointerEvent) => {
    if (!drag || !e.isPrimary) return
    setDrag(null)
    const p = toCourt(e)

    if (tool === 'pass') {
      const passer = passerFrom(drag.points[0])
      if (!passer) return toast('Glisse d’un porteur de ballon vers le receveur.')
      // les systèmes ne se passent le ballon qu'entre attaquants
      const targets = visible.filter((id) => id !== passer && (free || id[0] === 'O'))
      const after = applyStep(state, step).positions
      // on accepte de viser le receveur à son départ comme à son arrivée
      const target = playerAt(p, after, targets) ?? playerAt(p, state.positions, targets)
      if (!target) return toast('Termine le geste sur le receveur.')
      return setBallAction({ id: uid(), kind: 'pass', player: passer, target })
    }

    if (tool === 'move') {
      const moved = dist(p, drag.points[0]) >= 3
      if (drag.cone) {
        if (moved) onCommit({ cones: scene.cones.map((c) => (c.id === drag.cone ? { ...c, ...p } : c)) })
      } else if (moved) onCommit({ start: { ...scene.start, [drag.player!]: p } })
      // dans un système, toucher un attaquant lui donne l'unique ballon
      else if (!free && drag.player![0] === 'O' && scene.balls[0] !== drag.player) onCommit({ balls: [drag.player!] })
      return
    }

    const player = drag.player!
    const path = simplify([...drag.points, p], 2.5)
    if (length(path) < 8) return
    const others = step.actions.filter((a) => !(a.player === player && isMovement(a)))
    setActions([...others, { id: uid(), kind: tool as ActionKind, player, path: path.slice(1) }])
  }

  const goTo = (i: number) => {
    setIndex(i)
    setPreview(false)
  }

  const addStep = () => {
    const steps = [...scene.steps]
    steps.splice(index + 1, 0, newStep())
    onCommit({ steps })
    goTo(index + 1)
  }

  const removeStep = () => {
    if (scene.steps.length === 1) return onCommit({ steps: [newStep()] })
    onCommit({ steps: scene.steps.filter((s) => s.id !== step.id) })
    setIndex(Math.max(0, index - 1))
  }

  // aperçu en direct pendant qu'on fait glisser un élément
  const dragged = tool === 'move' ? drag?.points.at(-1) : undefined
  const positions = dragged && drag?.player ? { ...state.positions, [drag.player]: dragged } : state.positions
  const cones = dragged && drag?.cone ? scene.cones.map((c) => (c.id === drag.cone ? { ...c, ...dragged } : c)) : scene.cones

  let draft: Point[] | undefined
  if (drag && tool === 'pass') {
    const passer = passerFrom(drag.points[0])
    if (passer) draft = [state.positions[passer], drag.points.at(-1)!]
  } else if (drag && tool !== 'move') draft = drag.points

  const elements = free ? ELEMENTS : ELEMENTS.slice(0, 1)
  const tools = [...elements, ...ACTIONS]
  let hint = tools.find((t) => t.id === tool)!.hint
  if (!free && tool === 'move') hint = 'Fais glisser un joueur pour le placer. Touche un attaquant pour lui donner le ballon.'
  if (!free && tool === 'pass') hint = 'Touche le joueur qui reçoit la passe.'
  if (free && tool === 'erase' && index === 0) hint = 'Touche une flèche, un joueur ou un plot pour l’effacer.'
  const invalid = step.actions.some((a) => isInvalid(state, a))

  const button = (t: ToolInfo) => (
    <button
      key={t.id}
      className={t.id === tool ? 'active' : ''}
      aria-pressed={t.id === tool}
      // la situation de départ se règle au premier temps
      disabled={index > 0 && isElement(t.id)}
      onClick={() => setSelected(t.id)}
    >
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d={t.icon} /></svg>
      <span>{t.label}</span>
    </button>
  )

  return (
    <>
      <div className="step-bar">
        <div className="step-dots">
          {scene.steps.map((s, i) => (
            <button key={s.id} className={i === index ? 'active' : ''} onClick={() => goTo(i)} aria-label={`Temps ${i + 1}`}>
              {i + 1}
            </button>
          ))}
          <button className="add" onClick={addStep} aria-label="Ajouter un temps">
            <Icon name="plus" />
          </button>
        </div>
        <button className="button small primary" onClick={() => setPreview(!preview)}>
          <Icon name={preview ? 'edit' : 'play'} /> {preview ? 'Dessiner' : 'Lire'}
        </button>
      </div>

      {preview ? (
        <PlayPlayer scene={scene} defense={defense} />
      ) : (
        <>
          <Court
            court={scene.court}
            svgRef={svg}
            className={`editing tool-${tool}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => setDrag(null)}
            aria-label={`Terrain, temps ${index + 1}`}
          >
            <Diagram state={{ ...state, positions }} step={step} cones={cones} defense={defense} />
            {draft && <path className="draft" d={toPath(draft)} />}
          </Court>

          <p className={invalid ? 'hint warning' : 'hint'}>
            {invalid ? 'Une action (en rouge) part d’un joueur qui n’a plus le ballon : efface-la ou corrige un temps précédent.' : hint}
          </p>

          <div className={free ? 'toolbar two-rows' : 'toolbar'} role="toolbar" aria-label="Outils de dessin">
            {tools.map(button)}
          </div>

          <div className="row">
            <button className="button ghost small" onClick={history.undo} disabled={!history.canUndo}><Icon name="undo" /> Annuler</button>
            <button className="button ghost small" onClick={history.redo} disabled={!history.canRedo}><Icon name="redo" /> Rétablir</button>
            <button className="button ghost small danger-text" onClick={removeStep}>
              <Icon name="trash" /> {scene.steps.length === 1 ? 'Vider' : 'Supprimer'}
            </button>
          </div>

          <label>
            Consigne du temps {index + 1}
            <textarea
              rows={2}
              value={step.note}
              placeholder="Ex. : le 5 attend que le 1 soit à hauteur avant de rouler"
              onChange={(e) => onPatch({ steps: stepsWith({ note: e.target.value }) })}
            />
          </label>
        </>
      )}
    </>
  )
}

interface CourtChoiceProps {
  scene: Scene
  onChange(court: Scene['court']): void
}

export function CourtChoice({ scene, onChange }: CourtChoiceProps) {
  const { toast } = useFeedback()
  const choose = (court: Scene['court']) => {
    const points = [
      ...playerIds(scene.start).map((id) => scene.start[id]!),
      ...scene.cones,
      ...scene.steps.flatMap((s) => s.actions.flatMap((a) => a.path ?? [])),
    ]
    if (court === 'half' && points.some((p) => p.y > COURT.half + 5)) {
      return toast('Des éléments sont dans l’autre moitié : ramène-les avant de passer en demi-terrain.')
    }
    if (court !== scene.court) onChange(court)
  }
  return (
    <fieldset>
      <legend>Terrain</legend>
      <div className="segmented">
        {(['half', 'full'] as const).map((court) => (
          <button key={court} className={scene.court === court ? 'active' : ''} aria-pressed={scene.court === court} onClick={() => choose(court)}>
            {court === 'half' ? 'Demi-terrain' : 'Terrain entier'}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
