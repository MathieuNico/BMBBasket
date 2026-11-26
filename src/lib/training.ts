import { newStep, uid } from './engine'
import type { Drill, Member, Scene, Session, SessionItem } from './types'

export const newDrill = (): Drill => ({
  id: uid(),
  name: '',
  theme: 'Échauffement',
  duration: 10,
  description: '',
  variants: '',
  material: '',
  court: 'half',
  start: {},
  balls: [],
  cones: [],
  steps: [newStep()],
  updatedAt: '',
})

export const newSession = (date: string, team = ''): Session => ({
  id: uid(),
  team,
  date,
  time: '',
  title: '',
  objective: '',
  notes: '',
  items: [],
  attendance: {},
  updatedAt: '',
})

export const itemFor = (drill: Drill): SessionItem => ({
  id: uid(),
  drillId: drill.id,
  title: drill.name,
  duration: drill.duration,
  note: '',
})

/** Reprend une séance : même déroulé, sans date ni pointage, non partagée. */
export const copySession = (session: Session): Session => ({
  ...structuredClone(session),
  id: uid(),
  date: '',
  attendance: {},
  published: false,
})

export const hasDiagram = (scene: Scene) => Object.keys(scene.start).length > 0 || scene.cones.length > 0

export const totalDuration = (items: SessionItem[]) => items.reduce((sum, i) => sum + (i.duration || 0), 0)

/** Heure « 18:30 » décalée de `minutes`, affichée « 18h45 ». Vide sans heure de début. */
export function clock(start: string, minutes: number) {
  const match = start.match(/^(\d{2}):(\d{2})/)
  if (!match) return ''
  const total = (Number(match[1]) * 60 + Number(match[2]) + minutes) % 1440
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`
}

export const sameTeam = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export const membersOf = (members: Member[], team: string) =>
  members.filter((m) => sameTeam(m.team, team)).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

/** Présences d'un joueur sur les séances où il a été pointé. */
export function attendanceOf(memberId: string, sessions: Session[]) {
  const marks = sessions.map((s) => s.attendance[memberId]).filter(Boolean)
  return { present: marks.filter((m) => m === 'present').length, total: marks.length }
}
