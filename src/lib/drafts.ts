import { isValidItem } from './backup'
import type { Data } from './types'

/** Dessins non enregistrés, gardés sur l'appareil au cas où la page serait fermée. */
type DrawingTable = 'plays' | 'drills'

export interface Draft<T> {
  value: T
  /** Date de la version enregistrée sur laquelle le brouillon a été commencé. */
  base: string
}

const PREFIX = 'bmb.draft.'

/** `id` est absent pour une création ; `context` distingue un exercice créé depuis une séance. */
export const draftKey = (table: DrawingTable, id?: string, context?: string) =>
  `${PREFIX}${table}.${id ?? (context ? `new.${context}` : 'new')}`

export function readDraft<K extends DrawingTable>(table: K, key: string): Draft<Data[K][number]> | undefined {
  try {
    const draft = JSON.parse(localStorage.getItem(key) ?? 'null')
    // un brouillon illisible ou d'un ancien format est ignoré
    return draft && typeof draft.base === 'string' && isValidItem(table, draft.value) ? draft : undefined
  } catch {
    return undefined
  }
}

export function writeDraft<T>(key: string, draft: Draft<T>) {
  try {
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // mémoire pleine : le brouillon est facultatif
  }
}

export const removeDraft = (key: string) => localStorage.removeItem(key)

export const clearDrafts = () =>
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach(removeDraft)
