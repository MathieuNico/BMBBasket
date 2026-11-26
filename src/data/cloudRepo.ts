import { createClient } from '@supabase/supabase-js'
import { TABLES } from '../lib/types'
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

const explain =(message: string) =>
  isNetworkError(message) ? 'Pas de réseau : modification non enregistrée.' : `Erreur du serveur : ${message}`

export const cloudRepo: Repo = {
  async load(): Promise<Loaded> {
    const db = client()
    const [coach, ...results] = await Promise.all([
      db.from('staff').select('user_id').limit(1),
      ...TABLES.map((table) => db.from(table).select('data')),
    ])
    const error = coach.error ?? results.find((r) => r.error)?.error
    if (error) {
      const cache = localStorage.getItem(CACHE)
      if (cache && isNetworkError(error.message)) {
        return { data: { ...emptyData(), ...JSON.parse(cache) }, offline: true }
      }
      throw new Error(explain(error.message))
    }
    if (!coach.data!.length) {
      clearCache()
      throw new Error("Ce compte n'est plus dans la liste des coachs. Vois avec le responsable du club.")
    }
    const data = emptyData()
    TABLES.forEach((table, i) => {
      data[table] = results[i].data!.map((r: any) => r.data)
    })
    try {
      localStorage.setItem(CACHE, JSON.stringify(data))
    } catch {
      // la copie hors ligne est facultative
    }
    return { data, offline: false }
  },
  async save(table, item) {
    const { error } = await client().from(table).upsert({ id: item.id, data: item })
    if (error) throw new Error(explain(error.message))
  },
  async remove(table, id) {
    const { error } = await client().from(table).delete().eq('id', id)
    if (error) throw new Error(explain(error.message))
  },
}
