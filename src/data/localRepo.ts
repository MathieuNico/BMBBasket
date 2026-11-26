import { TABLES, type Table } from '../lib/types'
import { emptyData, type Repo } from './repo'

const key = (table: Table) => `bmb.${table}`

function read(table: Table): any[] {
  const text = localStorage.getItem(key(table))
  if (!text) return []
  // Des données illisibles déclenchent une erreur : on ne les écrase jamais en silence.
  const data = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('Données locales illisibles.')
  return data
}

function write(table: Table, items: unknown[]) {
  try {
    localStorage.setItem(key(table), JSON.stringify(items))
  } catch {
    throw new Error('Mémoire de l’appareil pleine : enregistrement impossible.')
  }
}

/** Stockage sur l'appareil, utilisé tant que le serveur du club n'est pas configuré. */
export const localRepo: Repo = {
  async load() {
    const data = emptyData()
    for (const table of TABLES) data[table] = read(table)
    return { data, offline: false }
  },
  async save(table, item) {
    const items = read(table)
    const i = items.findIndex((x) => x.id === item.id)
    if (i < 0) items.push(item)
    else items[i] = item
    write(table, items)
  },
  async remove(table, id) {
    write(table, read(table).filter((x) => x.id !== id))
  },
}
