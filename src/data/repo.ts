import type { Coach } from '../lib/owners'
import type { Data, Table } from '../lib/types'

export interface Loaded {
  data: Data
  /** Les coachs du club, pour afficher les auteurs. Vide sans serveur. */
  coaches: Coach[]
  /** Vrai quand les données viennent de la copie locale, faute de réseau. */
  offline: boolean
}

export interface Repo {
  load(): Promise<Loaded>
  save(table: Table, item: { id: string }): Promise<void>
  remove(table: Table, id: string): Promise<void>
  renameCoach(id: string, name: string): Promise<void>
}

export const emptyData = (): Data => ({ plays: [], drills: [], sessions: [], members: [], teams: [] })
