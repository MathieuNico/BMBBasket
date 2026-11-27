import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { AuthorBadge, useOwnerFilter } from '../../components/OwnerFilter'
import { SessionCard } from '../../components/SessionCard'
import { byDate, Chips, EmptyState } from '../../components/ui'
import { useStore } from '../../data/store'
import { membersOf } from '../../lib/training'
import type { Session } from '../../lib/types'
import { TrainingHeader } from './TrainingHeader'

function SessionList({ title, sessions }: { title: string; sessions: Session[] }) {
  const { members, isMine } = useStore()
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
              <SessionCard
                session={s}
                href={`/entrainement/seance/${s.id}`}
                title={[s.team, s.title].filter(Boolean).join(' · ')}
                detail={marked.length ? `${present}/${roster.length} présents` : undefined}
                badge={
                  isMine(s) ? (
                    <span className={s.published ? 'badge success' : 'badge'}>{s.published ? 'Partagée' : 'Non partagée'}</span>
                  ) : (
                    <AuthorBadge item={s} />
                  )
                }
              />
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
  const owner = useOwnerFilter('sessions', sessions)
  const teams = [...new Set(owner.visible.map((s) => s.team))].sort()
  const active = teams.includes(team) ? team : ''
  const { upcoming, past } = byDate(owner.visible.filter((s) => !active || s.team === active))

  return (
    <>
      <TrainingHeader current="Séances" />
      <main>
        {owner.filter}
        {owner.visible.length === 0 ? (
          owner.active === 'mine' || owner.active === 'all' ? (
            <EmptyState icon="calendar" title="Aucune séance" text="Prépare ta première séance : exercices, durées et présences.">
              <a className="button primary" href="#/entrainement/seance/nouveau">Créer une séance</a>
            </EmptyState>
          ) : (
            <EmptyState icon="calendar" title="Rien pour le moment" text="Ce coach n’a pas encore préparé de séance." />
          )
        ) : (
          <>
            {teams.length > 1 && <Chips options={teams} value={active} onChange={setTeam} />}
            <SessionList title="À venir" sessions={upcoming} />
            <SessionList title="Passées" sessions={past} />
          </>
        )}
        <a className="fab" href="#/entrainement/seance/nouveau">
          <Icon name="plus" /> Séance
        </a>
      </main>
    </>
  )
}
