import { useCallback, useEffect, useState } from 'react'
import { newCode } from '../lib/sharing'
import { isNetworkError, supabase } from './cloudRepo'

export interface Account {
  user_id: string
  email: string | null
  name: string
  team: string
}

const check = <T>({ data, error }: { data: T; error: { message: string } | null }) => {
  if (error) {
    throw new Error(isNetworkError(error.message) ? 'Pas de réseau.' : `Erreur du serveur : ${error.message}`)
  }
  return data
}

/** Code du club et comptes des joueurs, gérés par les coachs. Vide sans serveur. */
export function useClub() {
  const [code, setCode] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!supabase) return
    try {
      const [club, profiles] = await Promise.all([
        supabase.from('club').select('code').single(),
        supabase.from('profiles').select('user_id,email,name,team'),
      ])
      setCode(check(club)!.code)
      setAccounts(check(profiles) as Account[])
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    code,
    accounts,
    error,
    async changeCode() {
      const next = newCode()
      check(await supabase!.from('club').update({ code: next }).eq('id', true))
      setCode(next)
    },
    async move(userId: string, team: string) {
      check(await supabase!.from('profiles').update({ team }).eq('user_id', userId))
      await reload()
    },
    async expel(userId: string) {
      check(await supabase!.from('profiles').delete().eq('user_id', userId))
      await reload()
    },
  }
}
