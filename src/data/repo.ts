import type { Data, Table } from '../lib/types'

export interface Loaded {
  data: Data
  /** Vrai quand les données viennent de la copie locale, faute de réseau. */
  offline: boolean
}

export interface Repo {
  load(): Promise<Loaded>
  save(table: Table, item: { id: string }): Promise<void>
  remove(table: Table, id: string): Promise<void>
}

export const emptyData = (): Data => ({ plays: [], matches: [], drills: [], sessions: [], members: [] })
