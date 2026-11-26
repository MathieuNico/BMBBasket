import { useCallback, useEffect, useState } from 'react'
import { useFeedback } from '../components/ui'
import { readDraft, removeDraft, writeDraft } from './drafts'
import { useLeaveGuard } from './router'
import type { Data } from './types'
import { useHistory } from './useHistory'

/**
 * Dessin en cours : historique, brouillon automatique et question avant de quitter.
 * `savedAt` est la date de la version enregistrée (vide pour une création).
 */
export function useDrawingDraft<K extends 'plays' | 'drills'>(table: K, key: string, initial: Data[K][number], savedAt: string) {
  type Item = Data[K][number]
  const { confirm } = useFeedback()
  const [draft] = useState(() => readDraft(table, key))
  const history = useHistory<Item>(() => initial, () => draft?.value)
  const [base] = useState(() => draft?.base ?? savedAt)
  const { value, dirty } = history

  useEffect(() => {
    if (dirty) writeDraft(key, { value, base })
    else removeDraft(key)
  }, [key, value, dirty, base])

  const askLeave = useCallback(async () => {
    const leave = await confirm('Quitter sans enregistrer les modifications ?', 'Quitter')
    // quitter volontairement abandonne le brouillon
    if (leave) removeDraft(key)
    return leave
  }, [confirm, key])
  useLeaveGuard(dirty, askLeave)

  return {
    history,
    /** Le brouillon repris à l'ouverture, tant qu'il n'a pas été abandonné. */
    restored: dirty && !!draft,
    /** Une version plus récente a été enregistrée depuis le début du brouillon. */
    outdated: !!draft && savedAt > draft.base,
    forget: () => removeDraft(key),
  }
}
