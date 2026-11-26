import { DEFENSE, OFFENSE, TABLES, type Data, type Table } from './types'

const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null
const isString = (v: unknown) => typeof v === 'string'
const isPoint = (v: unknown) => isObject(v) && Number.isFinite(v.x) && Number.isFinite(v.y)
const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v)
const isCourt = (v: unknown) => v === 'half' || v === 'full'

/** Les temps ne doivent citer que des joueurs présents sur le terrain. */
const areSteps = (steps: unknown, players: Record<string, unknown>) =>
  Array.isArray(steps) &&
  steps.length > 0 &&
  steps.every(
    (s) =>
      isObject(s) &&
      Array.isArray(s.actions) &&
      s.actions.every(
        (a: unknown) =>
          isObject(a) &&
          a.player in players &&
          (a.target === undefined || a.target in players) &&
          (a.path === undefined || (Array.isArray(a.path) && a.path.every(isPoint))),
      ),
  )

const CHECKS: Record<Table, (item: Record<string, any>) => boolean> = {
  plays: (p) =>
    isString(p.name) &&
    isCourt(p.court) &&
    isObject(p.start) &&
    [...OFFENSE, ...DEFENSE].every((id) => isPoint(p.start[id])) &&
    areSteps(p.steps, p.start),
  matches: (m) => isString(m.opponent) && isString(m.date) && Array.isArray(m.plays),
  drills: (d) =>
    isString(d.name) &&
    isCourt(d.court) &&
    isObject(d.start) &&
    Object.values(d.start).every(isPoint) &&
    Array.isArray(d.balls) &&
    d.balls.every((b: string) => b in d.start) &&
    Array.isArray(d.cones) &&
    d.cones.every(isPoint) &&
    areSteps(d.steps, d.start),
  sessions: (s) => isString(s.team) && isString(s.date) && Array.isArray(s.items) && isObject(s.attendance),
  members: (m) => isString(m.name) && isString(m.team),
}

export function parseBackup(text: string): Data {
  const invalid = new Error("Ce fichier n'est pas une sauvegarde BMB.")
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw invalid
  }
  if (!isObject(data) || !Array.isArray(data.plays) || !Array.isArray(data.matches)) throw invalid

  const out = {} as Record<Table, unknown[]>
  for (const table of TABLES) {
    // les sauvegardes d'avant la partie entraînement n'ont ni exercices ni séances
    const items = data[table] ?? []
    if (!Array.isArray(items) || !items.every((x) => isObject(x) && isUuid(x.id) && CHECKS[table](x))) {
      throw new Error('La sauvegarde est abîmée : rien n’a été importé.')
    }
    out[table] = items
  }
  return out as unknown as Data
}
