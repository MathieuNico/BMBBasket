import { createClient } from '@supabase/supabase-js'
import { OWNED_TABLES } from '../lib/owners'
import { TABLES, type Table } from '../lib/types'
import { emptyData, type Loaded, type Repo } from './repo'

const url = import.meta.env.VITE_SUPABASE_URL
const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Client Supabase, ou null quand l'application tourne sans serveur. */
export const supabase = url && publicKey ? createClient(url, publicKey) : null

const CACHE = 'bmb.cache'

export const clearCache = () => localStorage.removeItem(CACHE)

const client = () => {
  if (!supabase) throw new Error('Serveur non configuré.')
  return supabase
}

// « Load failed » est le message de Safari sur iPhone
export const isNetworkError = (message: string) => /fetch|network|load failed/i.test(message)

const explain = (message: string) =>
  isNetworkError(message) ? 'Pas de réseau : modification non enregistrée.' : `Erreur du serveur : ${message}`

const isOwned = (table: Table) => (OWNED_TABLES as readonly Table[]).includes(table)

export const cloudRepo: Repo = {
  async load(): Promise<Loaded> {
    const db = client()
    const [staff, ...results] = await Promise.all([
      db.from('staff').select('user_id,name'),
      ...TABLES.map((table) => db.from(table).select(isOwned(table) ? 'data,owner_id' : 'data')),
    ])
    const error = staff.error ?? results.find((r) => r.error)?.error
    if (error) {
      const cache = JSON.parse(localStorage.getItem(CACHE) ?? 'null')
      if (cache?.data && isNetworkError(error.message)) {
        return { data: { ...emptyData(), ...cache.data }, coaches: cache.coaches ?? [], offline: true }
      }
      throw new Error(explain(error.message))
    }
    // seuls les coachs voient la liste des coachs
    if (!staff.data!.length) {
      clearCache()
      throw new Error("Ce compte n'est plus dans la liste des coachs. Vois avec le responsable du club.")
    }
    const coaches = staff.data!.map((r: any) => ({ id: r.user_id, name: r.name ?? '' }))
    const data = emptyData()
    TABLES.forEach((table, i) => {
      data[table] = results[i].data!.map((r: any) => (r.owner_id ? { ...r.data, ownerId: r.owner_id } : r.data))
    })
    try {
      localStorage.setItem(CACHE, JSON.stringify({ data, coaches }))
    } catch {
      // la copie hors ligne est facultative
    }
    return { data, coaches, offline: false }
  },
  async save(table, item) {
    // l'auteur est fixé par le serveur : il ne fait pas partie du contenu envoyé
    const { ownerId: _, ...content } = item as { id: string; ownerId?: string }
    const { error } = await client().from(table).upsert({ id: item.id, data: content })
    if (error) {
      throw new Error(/row-level security/i.test(error.message) ? 'Seul son auteur peut le modifier.' : explain(error.message))
    }
  },
  async remove(table, id) {
    // la base ignore sans erreur une suppression interdite : on vérifie ce qui a été effacé
    const { data, error } = await client().from(table).delete().eq('id', id).select('id')
    if (error) throw new Error(explain(error.message))
    if (isOwned(table) && !data.length) throw new Error('Suppression impossible : déjà supprimé, ou réservé à son auteur.')
  },
  async renameCoach(id, name) {
    const { error } = await client().from('staff').update({ name }).eq('user_id', id)
    if (error) throw new Error(explain(error.message))
  },
}
