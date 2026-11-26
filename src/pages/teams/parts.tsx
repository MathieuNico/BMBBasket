import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import type { Account, useClub } from '../../data/useClub'
import { showCode } from '../../lib/sharing'
import { attendanceOf, sameTeam } from '../../lib/training'
import type { Member, Team } from '../../lib/types'

export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

export type Club = ReturnType<typeof useClub>

/** Lance une action et affiche son éventuelle erreur. */
export function useAction() {
  const { toast } = useFeedback()
  return async (task: () => Promise<unknown>) => {
    try {
      await task()
    } catch (e) {
      toast((e as Error).message)
    }
  }
}

export function ClubCode({ club }: { club: Club }) {
  const { confirm, toast } = useFeedback()
  const run = useAction()
  const invitation = `Inscris-toi sur ${location.origin}${location.pathname} avec le code club ${showCode(club.code)}`

  const send = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'BMB Playbook', text: invitation })
      else {
        await navigator.clipboard.writeText(invitation)
        toast('Invitation copiée')
      }
    } catch (e) {
      // fermer la fenêtre de partage n'est pas une erreur
      if ((e as Error).name !== 'AbortError') toast(`Partage impossible. Code à donner : ${showCode(club.code)}`)
    }
  }

  const change = async () => {
    if (!(await confirm('Changer le code du club ? L’ancien ne permettra plus de s’inscrire. Les comptes déjà inscrits gardent leur accès.', 'Changer'))) return
    run(club.changeCode)
  }

  return (
    <div className="card code-card">
      <p className="muted">Code du club, à donner aux joueurs</p>
      <p className="code">{showCode(club.code)}</p>
      <div className="row">
        <button className="button primary small" onClick={send}><Icon name="share" /> Inviter</button>
        <button className="button ghost small" onClick={change}>Changer le code</button>
      </div>
    </div>
  )
}

export function AccountRow({ account, teams, club }: { account: Account; teams: Team[]; club: Club }) {
  const { confirm } = useFeedback()
  const run = useAction()
  const known = teams.some((t) => t.name === account.team)

  const expel = async () => {
    if (!(await confirm(`Retirer l’accès de ${account.name} ? Pour empêcher une réinscription, change aussi le code du club.`, 'Retirer'))) return
    run(() => club.expel(account.user_id))
  }

  return (
    <li className="account">
      <span>
        <strong>{account.name}</strong>
        <small>{account.email}</small>
      </span>
      <select value={account.team} aria-label={`Équipe de ${account.name}`} onChange={(e) => run(() => club.move(account.user_id, e.target.value))}>
        {!known && <option>{account.team}</option>}
        {teams.map((t) => <option key={t.id}>{t.name}</option>)}
      </select>
      <button className="icon-button" aria-label={`Retirer l’accès de ${account.name}`} onClick={expel}><Icon name="close" /></button>
    </li>
  )
}

/** Joueur de l'effectif, avec son taux de présence. */
export function MemberRow({ member }: { member: Member }) {
  const { sessions, save, remove } = useStore()
  const { confirm, toast } = useFeedback()
  const run = useAction()
  const [name, setName] = useState(member.name)
  const { present, total } = attendanceOf(member.id, sessions.filter((s) => sameTeam(s.team, member.team)))

  const rename = async () => {
    const next = name.trim()
    if (!next || next === member.name) return setName(member.name)
    try {
      await save('members', { ...member, name: next })
    } catch (e) {
      setName(member.name)
      toast((e as Error).message)
    }
  }

  const erase = async () => {
    if (!(await confirm(`Retirer ${member.name} de l’effectif ? Son historique de présences ne sera plus affiché.`, 'Retirer'))) return
    run(() => remove('members', member.id))
  }

  return (
    <li className="member">
      <span>
        <input value={name} aria-label={`Nom de ${member.name}`} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={rename} />
        <small>
          {total ? `Présent ${present} fois sur ${total} (${Math.round((present / total) * 100)} %)` : 'Pas encore pointé'}
        </small>
      </span>
      <button className="icon-button" aria-label={`Retirer ${member.name}`} onClick={erase}><Icon name="trash" /></button>
    </li>
  )
}
