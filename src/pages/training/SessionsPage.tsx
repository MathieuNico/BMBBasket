import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { byDate, Chips, formatDate } from '../../components/ui'
import { useStore } from '../../data/store'
import { clock, membersOf, totalDuration } from '../../lib/training'
import type { Session } from '../../lib/types'
import { TrainingHeader } from './TrainingHeader'

function SessionList({ title, sessions }: { title: string; sessions: Session[] }) {
  const { members } = useStore()
  if (!sessions.length) return null
  return (
    <section>
      <h2>{title}</h2>
      <ul className="list">
        {sessions.map((s) => {
          const roster = membersOf(members, s.team)
          const marked = roster.filter((m) => s.attendance[m.id])
          const present = marked.filter((m) => s.attendance[m.id] === 'present').length
          return (
            <li key={s.id}>
              <a className="card session-card" href={`#/entrainement/seance/${s.id}`}>
                <span className="session-date">
                  {formatDate(s.date)}{s.time && ` · ${clock(s.time, 0)}`}
                </span>
                <strong>{[s.team, s.title].filter(Boolean).join(' · ')}</strong>
                <span>
                  {s.items.length} élément{s.items.length > 1 ? 's' : ''} · {totalDuration(s.items)} min
                  {marked.length > 0 && ` · ${present}/${roster.length} présents`}
                </span>
                {s.published && <span className="shared">Visible par les joueurs</span>}
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SessionsPage() {
  const { sessions } = useStore()
  const [team, setTeam] = useState('')
  const teams = [...new Set(sessions.map((s) => s.team))].sort()
  const active = teams.includes(team) ? team : ''
  const { upcoming, past } = byDate(sessions.filter((s) => !active || s.team === active))

  return (
    <>
      <TrainingHeader current="Séances" />
      <main>
        {sessions.length === 0 ? (
          <div className="empty">
            <h2>Aucune séance</h2>
            <p>Prépare ta première séance : exercices, durées et présences.</p>
            <a className="button primary" href="#/entrainement/seance/nouveau">Créer une séance</a>
          </div>
        ) : (
          <>
            {teams.length > 1 && <Chips options={teams} value={active} onChange={setTeam} />}
            <SessionList title="À venir" sessions={upcoming} />
            <SessionList title="Passées" sessions={past} />
            <a className="fab" href="#/entrainement/seance/nouveau">
              <Icon name="plus" /> Séance
            </a>
          </>
        )}
      </main>
    </>
  )
}
