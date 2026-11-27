import { PendingDraft } from '../../components/DraftNotice'
import { Icon } from '../../components/Icon'
import { ReadOnlyNotice } from '../../components/OwnerFilter'
import { PlayPlayer } from '../../components/PlayPlayer'
import { Header, NotFound, useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import { draftKey, removeDraft } from '../../lib/drafts'
import { uid } from '../../lib/engine'
import { navigate } from '../../lib/router'
import { hasDiagram } from '../../lib/training'
import type { Drill } from '../../lib/types'

export function DrillDetails({ drill }: { drill: Drill }) {
  const parts = [
    ['Organisation et consignes', drill.description],
    ['Variantes', drill.variants],
    ['Matériel', drill.material],
  ].filter(([, text]) => text.trim())

  return (
    <>
      {parts.map(([title, text]) => (
        <div key={title} className="detail">
          <h3>{title}</h3>
          <p className="pre">{text}</p>
        </div>
      ))}
    </>
  )
}

export function DrillPage({ id }: { id: string }) {
  const { drills, sessions, save, remove, canEdit, authorOf } = useStore()
  const { confirm, toast } = useFeedback()
  const drill = drills.find((d) => d.id === id)

  if (!drill) return <NotFound back="/entrainement/exercices" text="Cet exercice n’existe plus." />

  const editable = canEdit(drill)
  const author = authorOf(drill)

  const duplicate = async () => {
    const copy = { ...structuredClone(drill), id: uid(), name: `${drill.name} (copie)` }
    try {
      await save('drills', copy)
      if (editable) navigate(`/entrainement/exercice/${copy.id}/modifier`)
      else {
        navigate(`/entrainement/exercice/${copy.id}`)
        toast('Copié dans tes exercices')
      }
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const erase = async () => {
    const used = sessions.filter((s) => s.items.some((i) => i.drillId === id)).length
    const warning = used ? ` Il figure dans ${used} séance${used > 1 ? 's' : ''} du club, qui n’en garderont que le nom.` : ''
    if (!(await confirm(`Supprimer « ${drill.name} » ?${warning}`, 'Supprimer'))) return
    try {
      await remove('drills', id)
      removeDraft(draftKey('drills', id))
      navigate('/entrainement/exercices', { replace: true })
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <>
      <Header title={drill.name} subtitle={`${drill.theme} · ${drill.duration} min`} back="/entrainement/exercices">
        {editable && (
          <a className="button soft small" href={`#/entrainement/exercice/${id}/modifier`}>
            <Icon name="edit" /> Modifier
          </a>
        )}
      </Header>
      <main>
        {editable ? (
          <PendingDraft table="drills" draftKey={draftKey('drills', id)} href={`/entrainement/exercice/${id}/modifier`} />
        ) : (
          <ReadOnlyNotice author={author} copyLabel="Copier dans mes exercices" onCopy={duplicate} />
        )}
        {hasDiagram(drill) && <PlayPlayer key={drill.id} scene={drill} />}
        {(drill.description + drill.variants + drill.material).trim() && (
          <div className="card">
            <DrillDetails drill={drill} />
          </div>
        )}
        {editable && (
          <div className="row">
            <button className="button ghost" onClick={duplicate}><Icon name="copy" /> Dupliquer</button>
            <button className="button ghost danger-text" onClick={erase}><Icon name="trash" /> Supprimer</button>
          </div>
        )}
      </main>
    </>
  )
}
