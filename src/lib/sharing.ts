import { sameTeam } from './training'
import type { Data, Drill, Play, Session } from './types'

/** Ce qu'un joueur peut consulter. Le serveur applique la même règle (supabase/migrations). */
export interface PlayerContent {
  team: string
  plays: Play[]
  sessions: Session[]
  drills: Drill[]
}

// sans 0/O ni 1/I, faciles à confondre en recopiant
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 10

export const newCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)), (n) => ALPHABET[n % ALPHABET.length]).join('')

/** Code saisi à la main : majuscules, sans espaces ni tirets. */
export const cleanCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const isCode = (code: string) => code.length === CODE_LENGTH

export const showCode = (code: string) => `${code.slice(0, 5)}-${code.slice(5)}`

export const isSharedWith = (play: Play, team: string) => (play.teams ?? []).some((t) => sameTeam(t, team))

/** Contenu publié pour une équipe, débarrassé de ce qui est réservé aux coachs. */
export function playerContent(data: Data, team: string): PlayerContent {
  const sessions = data.sessions
    .filter((s) => s.published && sameTeam(s.team, team))
    // le pointage et les notes ne sortent jamais
    .map((s) => ({ ...s, notes: '', attendance: {} }))
  const used = new Set(sessions.flatMap((s) => s.items.map((i) => i.drillId)))
  return {
    team,
    plays: data.plays.filter((p) => isSharedWith(p, team)).map(({ teams: _, ...play }) => play),
    sessions,
    drills: data.drills.filter((d) => used.has(d.id)),
  }
}
