import { useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import { uid } from '../../lib/engine'
import { membersOf } from '../../lib/training'
import type { Presence, Session } from '../../lib/types'

const STATUSES: { value: Presence; label: string }[] = [
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excusé' },
]

interface Props {
  session: Session
  onChange(attendance: Session['attendance']): void
}

/** Pointage des joueurs de l'équipe pour une séance. */
export function Attendance({ session, onChange }: Props) {
  const { members, save } = useStore()
  const { toast } = useFeedback()
  const [name, setName] = useState('')
  const team = session.team.trim()

  if (!team) return <p className="muted center">Indique l’équipe de la séance pour pointer les présences.</p>

  const roster = membersOf(members, team)
  const present = roster.filter((m) => session.attendance[m.id] === 'present').length

  const mark = (id: string, value: Presence) => {
    const next = { ...session.attendance }
    // toucher à nouveau le choix actif l'efface
    if (next[id] === value) delete next[id]
    else next[id] = value
    onChange(next)
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await save('members', { id: uid(), name: name.trim(), team, updatedAt: '' })
      setName('')
    } catch (error) {
      toast((error as Error).message)
    }
  }

  return (
    <section>
      {roster.length > 0 ? (
        <>
          <div className="summary">
            <strong>{present} présent{present > 1 ? 's' : ''} sur {roster.length}</strong>
            <button
              className="button ghost small"
              onClick={() => onChange({ ...session.attendance, ...Object.fromEntries(roster.map((m) => [m.id, 'present' as const])) })}
            >
              Tous présents
            </button>
          </div>
          <ul className="list">
            {roster.map((member) => (
              <li key={member.id} className="card attendance">
                <strong>{member.name}</strong>
                <div className="segmented" role="group" aria-label={`Présence de ${member.name}`}>
                  {STATUSES.map((s) => {
                    const active = session.attendance[member.id] === s.value
                    return (
                      <button key={s.value} className={active ? `active ${s.value}` : ''} aria-pressed={active} onClick={() => mark(member.id, s.value)}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">Le pointage est conservé quand tu enregistres la séance.</p>
        </>
      ) : (
        <p className="muted">Aucun joueur dans l’effectif « {team} ». Ajoute-les ci-dessous ou dans l’onglet Effectif.</p>
      )}
      <form className="inline-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ajouter un joueur" aria-label="Nom du joueur à ajouter" maxLength={60} />
        <button className="button primary">Ajouter</button>
      </form>
    </section>
  )
}
