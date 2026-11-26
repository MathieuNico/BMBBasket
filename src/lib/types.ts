/** Attaquants d'un système (les exercices peuvent en avoir davantage). */
export const OFFENSE = ['O1', 'O2', 'O3', 'O4', 'O5'] as const
export const DEFENSE = ['X1', 'X2', 'X3', 'X4', 'X5'] as const

/** O = attaquant, X = défenseur, C = coach, suivi d'un numéro. */
export type PlayerKind = 'O' | 'X' | 'C'
export type PlayerId = `${PlayerKind}${number}`

export interface Point {
  x: number
  y: number
}

export interface Cone extends Point {
  id: string
}

export type ActionKind = 'cut' | 'dribble' | 'screen' | 'pass' | 'shot'

export interface Action {
  id: string
  kind: ActionKind
  player: PlayerId
  /** Trajet d'un déplacement, sans le point de départ (déduit des temps précédents). */
  path?: Point[]
  /** Receveur d'une passe. */
  target?: PlayerId
}

export interface Step {
  id: string
  actions: Action[]
  note: string
}

/** Tout ce qui se dessine et s'anime sur le terrain. */
export interface Scene {
  court: 'half' | 'full'
  start: Partial<Record<PlayerId, Point>>
  /** Porteur de chaque ballon au départ. */
  balls: PlayerId[]
  cones: Cone[]
  steps: Step[]
}

export const CATEGORIES = [
  'Attaque placée',
  'Contre-attaque',
  'Remise en jeu fond',
  'Remise en jeu touche',
  'Attaque de zone',
  'Défense',
  'Press',
  'Exercice',
] as const

export interface Play {
  id: string
  name: string
  category: string
  description: string
  court: 'half' | 'full'
  defense: boolean
  start: Record<PlayerId, Point>
  ball: PlayerId | null
  steps: Step[]
  /** Équipes dont les joueurs peuvent consulter ce système. Absent ou vide : réservé aux coachs. */
  teams?: string[]
  updatedAt: string
}

export const THEMES = [
  'Échauffement',
  'Tir',
  'Passe',
  'Dribble',
  'Défense',
  'Rebond',
  'Contre-attaque',
  'Jeu réduit',
  'Jeu collectif',
  'Physique',
  'Retour au calme',
] as const

/** Exercice de la bibliothèque. */
export interface Drill extends Scene {
  id: string
  name: string
  theme: string
  /** Durée habituelle, en minutes. */
  duration: number
  description: string
  variants: string
  material: string
  updatedAt: string
}

export interface SessionItem {
  id: string
  /** Absent pour un temps libre (pause, match…). */
  drillId?: string
  /** Nom conservé même si l'exercice est supprimé de la bibliothèque. */
  title: string
  duration: number
  note: string
}

export type Presence = 'present' | 'absent' | 'excused'

export interface Session {
  id: string
  team: string
  date: string
  time: string
  title: string
  objective: string
  /** Réservé aux coachs. */
  notes: string
  items: SessionItem[]
  /** Pointage par identifiant de joueur, réservé aux coachs. */
  attendance: Record<string, Presence>
  /** Visible par les joueurs de l'équipe. */
  published?: boolean
  updatedAt: string
}

/** Joueur de l'effectif. */
export interface Member {
  id: string
  name: string
  team: string
  updatedAt: string
}

/** Équipe du club, à laquelle les joueurs se rattachent. */
export interface Team {
  id: string
  name: string
  updatedAt: string
}

export const TEAMS = ['U9', 'U11F', 'U11M', 'U13F', 'U13M', 'U15F', 'U15M', 'U18F', 'U18M', 'Seniors F', 'Seniors M']

export interface Data {
  plays: Play[]
  drills: Drill[]
  sessions: Session[]
  members: Member[]
  teams: Team[]
}

export type Table = keyof Data

export const TABLES: Table[] = ['plays', 'drills', 'sessions', 'members', 'teams']
