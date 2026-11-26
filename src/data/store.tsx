import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  reload(): Promise<void>
  save<T extends Table>(table: T, item: Item<T>): Promise<void>
  remove(table: Table, id: string): Promise<void>
}

const Context = createContext<Store | null>(null)

export const useStore = () => useContext(Context)!

const upsert = <T extends { id: string }>(items: T[], item: T) =>
  items.some((x) => x.id === item.id) ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item]

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(emptyData)
  const [status, setStatus] = useState<Store['status']>('loading')
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)

  const reload = useCallback(async () => {
    try {
      const loaded = await repo.load()
      setData(loaded.data)
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
      reload,
      async save(table, item) {
        const saved = { ...item, updatedAt: new Date().toISOString() }
        await repo.save(table, saved)
        setData((d) => ({ ...d, [table]: upsert<{ id: string }>(d[table], saved) }))
      },
      async remove(table, id) {
        await repo.remove(table, id)
        setData((d) => ({ ...d, [table]: (d[table] as { id: string }[]).filter((x) => x.id !== id) }))
      },
    }),
    [data, status, error, offline, reload],
  )

  return <Context.Provider value={store}>{children}</Context.Provider>
}
