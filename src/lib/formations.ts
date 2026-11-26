import { marking } from './engine'
import { dist } from './geometry'
import { DEFENSE, OFFENSE, type Play, type Point } from './types'

/** Placements de départ des joueurs 1 à 5, panier en haut. */
export interface Formation {
  name: string
  detail: string
  positions: Point[]
}

const at = (...coordinates: [number, number][]): Point[] => coordinates.map(([x, y]) => ({ x, y }))

export const ATTACKS: Formation[] = [
  { name: '4 dehors, 1 dedans', detail: 'Meneur, deux ailes, un coin, un poste bas', positions: at([75, 108], [128, 78], [22, 78], [136, 22], [48, 38]) },
  { name: '5 dehors', detail: 'Meneur, deux ailes, deux coins', positions: at([75, 102], [127, 78], [23, 78], [144, 16], [6, 16]) },
  { name: 'Horns', detail: 'Deux joueurs aux coudes, deux dans les coins', positions: at([75, 108], [143, 17], [7, 17], [99, 62], [51, 62]) },
  { name: '1-4 haut', detail: 'Quatre joueurs sur la ligne des lancers francs', positions: at([75, 112], [137, 62], [13, 62], [99, 60], [51, 60]) },
  { name: 'Carré (fond)', detail: 'Remise en jeu ligne de fond', positions: at([100, 2], [100, 58], [50, 58], [50, 24], [100, 24]) },
  { name: 'Colonne (fond)', detail: 'Remise en jeu ligne de fond', positions: at([100, 2], [99, 22], [99, 35], [99, 48], [99, 61]) },
]

export const DEFENSES: Formation[] = [
  { name: 'Individuelle', detail: 'Chaque défenseur entre son joueur et le panier', positions: [] },
  { name: 'Zone 2-3', detail: 'Deux devant, trois derrière', positions: at([56, 70], [94, 70], [28, 34], [122, 34], [75, 30]) },
  { name: 'Zone 3-2', detail: 'Trois devant, deux derrière', positions: at([75, 78], [114, 62], [36, 62], [99, 28], [51, 28]) },
  { name: 'Zone 1-3-1', detail: 'Une pointe, trois au milieu, un au fond', positions: at([75, 84], [116, 50], [34, 50], [75, 20], [75, 50]) },
  { name: 'Zone 2-1-2', detail: 'Deux devant, un au centre, deux derrière', positions: at([52, 70], [98, 70], [46, 26], [104, 26], [75, 46]) },
]

const isMarking = (start: Play['start']) => OFFENSE.every((id, i) => dist(start[DEFENSE[i]], marking(start[id])) < 3)

/** Place l'attaque. Une défense individuelle suit ; une zone ou un placement retouché ne bouge pas. */
export function applyAttack(play: Play, formation: Formation): Partial<Play> {
  const start = { ...play.start }
  const follow = isMarking(play.start)
  OFFENSE.forEach((id, i) => {
    start[id] = formation.positions[i]
    if (follow) start[DEFENSE[i]] = marking(start[id])
  })
  return { start, ball: 'O1' }
}

export function applyDefense(play: Play, formation: Formation): Partial<Play> {
  const start = { ...play.start }
  DEFENSE.forEach((id, i) => {
    start[id] = formation.positions[i] ?? marking(start[OFFENSE[i]])
  })
  return { start, defense: true }
}
