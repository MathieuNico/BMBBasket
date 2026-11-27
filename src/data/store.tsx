import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { canEdit, coachName, isMine, OWNED_TABLES, type Coach, type Owned } from '../lib/owners'
import type { Data, Table } from '../lib/types'
import { cloudRepo, supabase } from './cloudRepo'
import { localRepo } from './localRepo'
import { emptyData } from './repo'

const repo = supabase ? cloudRepo : localRepo
export const isCloud = !!supabase

type Item<T extends Table> = Data[T][number]

interface Store extends Data {
  status: 'loading' | 'ready' | 'error'
  error: string
  offline: boolean
  /** Identifiant du coach connecté. Absent sans serveur. */
  me?: string
  coaches: Coach[]
  isMine(item: Owned): boolean
  canEdit(item: Owned): boolean
  /** Nom de l'auteur quand ce n'est pas soi. */
  authorOf(item: Owned): string | undefined
  rename(name: string): Promise<void>
  reload(): Promise<void>
  save<T extends Table>(table: T, item: Item<T>): Promise<void>
  remove(table: Table, id: string): Promise<void>
}

const Context = createContext<Store | null>(null)

export const useStore = () => useContext(Context)!

type Stored = { id: string } & Owned

const upsert = (items: Stored[], item: Stored) =>
  items.some((x) => x.id === item.id) ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item]

export function StoreProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  const [data, setData] = useState<Data>(emptyData)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [status, setStatus] = useState<Store['status']>('loading')
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)

  const reload = useCallback(async () => {
    try {
      const loaded = await repo.load()
      setData(loaded.data)
      setCoaches(loaded.coaches)
      setOffline(loaded.offline)
      setStatus('ready')
    } catch (e) {
      setError((e as Error).message)
      // un rafraîchissement raté ne doit pas fermer la page en cours (saisie non enregistrée)
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [])

  useEffect(() => {
    reload()
    // reprend les modifications des autres coachs quand on revient sur l'application
    const refresh = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    // en mode local, suit les modifications faites dans un autre onglet
    window.addEventListener('storage', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [reload])

  const store = useMemo<Store>(
    () => ({
      ...data,
      status,
      error,
      offline,
      me: userId,
      coaches,
      reload,
      isMine: (item) => isMine(item, userId),
      canEdit: (item) => canEdit(item, userId, coaches),
      authorOf(item) {
        if (isMine(item, userId)) return undefined
        const author = coaches.find((c) => c.id === item.ownerId)
        return author ? coachName(author) : 'un ancien coach'
      },
      async rename(name) {
        if (!userId) return
        await repo.renameCoach(userId, name)
        setCoaches((list) => list.map((c) => (c.id === userId ? { ...c, name } : c)))
      },
      async save(table, item) {
        const saved = { ...item, updatedAt: new Date().toISOString() }
        await repo.save(table, saved)
        setData((d) => {
          const items = d[table] as Stored[]
          const owned = (OWNED_TABLES as readonly Table[]).includes(table)
          const previous = items.find((x) => x.id === saved.id)
          // un nouveau contenu (copie comprise) appartient à celui qui l'enregistre
          const next = owned ? { ...saved, ownerId: previous ? previous.ownerId : userId } : saved
          return { ...d, [table]: upsert(items, next) }
        })
      },
      async remove(table, id) {
        await repo.remove(table, id)
        setData((d) => ({ ...d, [table]: (d[table] as Stored[]).filter((x) => x.id !== id) }))
      },
    }),
    [data, coaches, userId, status, error, offline, reload],
  )

  return <Context.Provider value={store}>{children}</Context.Provider>
}
