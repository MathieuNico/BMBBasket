import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { Chips, useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import { uid } from '../../lib/engine'
import { attendanceOf, membersOf, sameTeam } from '../../lib/training'
import { TEAMS, type Member } from '../../lib/types'
import { TrainingHeader } from './TrainingHeader'

function Row({ member }: { member: Member }) {
  const { sessions, save, remove } = useStore()
  const { confirm, toast } = useFeedback()
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
    try {
      await remove('members', member.id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <li className="card member">
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

export function RosterPage() {
  const { members, save } = useStore()
  const { toast } = useFeedback()
  const teams = [...new Set(members.map((m) => m.team))].sort()
  const [filter, setFilter] = useState('')
  const [team, setTeam] = useState('')
  const [names, setNames] = useState('')
  const [saving, setSaving] = useState(false)
  const active = teams.includes(filter) ? filter : ''
  // l'ajout vise par défaut l'équipe affichée
  const target = team.trim() || active

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const list = names.split('\n').map((n) => n.trim()).filter(Boolean)
    if (!target) return toast('Indique l’équipe.')
    if (!list.length) return toast('Écris au moins un nom.')
    setSaving(true)
    // on reprend l'orthographe d'une équipe existante
    const spelled = teams.find((t) => sameTeam(t, target)) ?? target
    let done = 0
    try {
      for (const name of list) {
        await save('members', { id: uid(), name: name.slice(0, 60), team: spelled, updatedAt: '' })
        done++
      }
      toast(`${done} joueur${done > 1 ? 's' : ''} ajouté${done > 1 ? 's' : ''}`)
    } catch (error) {
      toast((error as Error).message)
    }
    // les noms pas encore enregistrés restent dans le champ
    setNames(list.slice(done).join('\n'))
    setSaving(false)
  }

  return (
    <>
      <TrainingHeader current="Effectif" />
      <main>
        {teams.length > 1 && <Chips options={teams} value={active} onChange={setFilter} />}
        {teams
          .filter((t) => !active || t === active)
          .map((t) => {
            const roster = membersOf(members, t)
            return (
              <section key={t}>
                <h2>{t} · {roster.length} joueur{roster.length > 1 ? 's' : ''}</h2>
                <ul className="list">
                  {roster.map((m) => <Row key={`${m.id}-${m.name}`} member={m} />)}
                </ul>
              </section>
            )
          })}
        <form className="card form" onSubmit={add}>
          <h2>Ajouter des joueurs</h2>
          <label>
            Équipe
            <input list="teams" value={team} onChange={(e) => setTeam(e.target.value)} placeholder={active || 'Ex. : U15F'} maxLength={30} />
            <datalist id="teams">{TEAMS.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label>
            Noms, un par ligne
            <textarea rows={5} value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Prénom N.\nPrénom N.'} />
          </label>
          <button className="button primary" disabled={saving}>Ajouter à l’effectif</button>
          <p className="muted">Le prénom et l’initiale du nom suffisent.</p>
        </form>
      </main>
    </>
  )
}
