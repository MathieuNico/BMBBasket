/** Comptes : rôle, inscription avec le code club, consultation des joueurs. Nécessite le serveur. */
import type { PlayerContent } from '../lib/sharing'
import { isNetworkError, supabase } from './cloudRepo'

export type Access = { role: 'coach' } | { role: 'player'; name: string; team: string } | { role: 'none' }

const ACCESS = 'bmb.access'
const CONTENT = 'bmb.player.cache'

export function forgetAccess() {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(CONTENT)
}

async function call<T>(name: string, args?: Record<string, string>): Promise<T> {
  const { data, error } = await supabase!.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

function remember(key: string, userId: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ userId, value }))
  } catch {
    // la copie hors ligne est facultative
  }
}

/** La réponse du serveur ou, sans réseau, la dernière réponse reçue par ce compte. */
async function cached<T>(key: string, userId: string, load: () => Promise<T>) {
  try {
    const value = await load()
    remember(key, userId, value)
    return { value, offline: false }
  } catch (error) {
    const copy = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (copy?.userId === userId && isNetworkError((error as Error).message)) {
      return { value: copy.value as T, offline: true }
    }
    throw error
  }
}

export const loadAccess = (userId: string) => cached(ACCESS, userId, () => call<Access>('my_access'))

/** Renvoie null quand le compte n'est plus rattaché au club. */
export const loadPlayerContent = (userId: string) =>
  cached(CONTENT, userId, () => call<PlayerContent | null>('player_view'))

/** Équipes du club, ou null si le code est faux. */
export const clubTeams = (code: string) => call<string[] | null>('club_teams', { p_code: code })

export const joinClub = (code: string, name: string, team: string) =>
  call<void>('join_club', { p_code: code, p_name: name, p_team: team })
