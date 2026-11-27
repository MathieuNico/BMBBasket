import { ReadOnlyNotice } from '../../components/OwnerFilter'
import { when } from '../../components/SessionCard'
import { SessionItemCard } from '../../components/SessionItemCard'
import { Header, useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import { navigate } from '../../lib/router'
import { clock, copySession, membersOf, totalDuration } from '../../lib/training'
import type { Session } from '../../lib/types'

/** La séance d'un autre coach : on la lit, on peut la copier, rien d'autre. */
export function SessionConsultation({ session }: { session: Session }) {
  const { drills, members, save, authorOf } = useStore()
  const { toast } = useFeedback()
  const roster = membersOf(members, session.team)
  const marked = roster.filter((m) => session.attendance[m.id])
  const present = marked.filter((m) => session.attendance[m.id] === 'present').length

  const copy = async () => {
    // les notes de l'auteur ne suivent pas la copie
    const mine = { ...copySession(session), notes: '' }
    try {
      await save('sessions', mine)
      navigate(`/entrainement/seance/${mine.id}`)
      toast('Copiée : choisis sa date')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <>
      <Header
        title={[session.team, session.title].filter(Boolean).join(' · ')}
        subtitle={`${when(session)} · ${totalDuration(session.items)} min`}
        back="/entrainement"
      />
      <main>
        <ReadOnlyNotice author={authorOf(session)} copyLabel="Copier dans mes séances" onCopy={copy} />
        {session.objective && (
          <div className="card">
            <h3>Objectif</h3>
            <p className="pre">{session.objective}</p>
          </div>
        )}
        <ol className="list">
          {session.items.map((item, i) => (
            <SessionItemCard
              key={item.id}
              item={item}
              drill={drills.find((d) => d.id === item.drillId)}
              start={clock(session.time, totalDuration(session.items.slice(0, i)))}
            />
          ))}
        </ol>
        {session.notes && (
          <div className="card">
            <h3>Notes réservées aux coachs</h3>
            <p className="pre">{session.notes}</p>
          </div>
        )}
        {marked.length > 0 && <p className="card muted">Présences : {present} sur {roster.length}</p>}
      </main>
    </>
  )
}
