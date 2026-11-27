import { PendingDraft } from '../components/DraftNotice'
import { Icon } from '../components/Icon'
import { ReadOnlyNotice } from '../components/OwnerFilter'
import { PlayPlayer } from '../components/PlayPlayer'
import { ShareChoice } from '../components/ShareChoice'
import { Header, NotFound, useFeedback } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey, removeDraft } from '../lib/drafts'
import { playScene, uid } from '../lib/engine'
import { navigate } from '../lib/router'

export function PlayPage({ id }: { id: string }) {
  const { plays, save, remove, canEdit, authorOf } = useStore()
  const { confirm, toast } = useFeedback()
  const play = plays.find((p) => p.id === id)

  if (!play) return <NotFound back="/systemes" text="Ce système n’existe plus." />

  const editable = canEdit(play)
  const author = authorOf(play)

  const duplicate = async () => {
    // la copie n'est pas publiée : elle est souvent retravaillée avant
    const copy = { ...structuredClone(play), id: uid(), name: `${play.name} (copie)`, teams: [] }
    try {
      await save('plays', copy)
      if (editable) navigate(`/systemes/${copy.id}/modifier`)
      else {
        navigate(`/systemes/${copy.id}`)
        toast('Copié dans tes systèmes')
      }
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const erase = async () => {
    const warning = play.teams?.length ? ' Les joueurs ne pourront plus le consulter.' : ''
    if (!(await confirm(`Supprimer « ${play.name} » ?${warning}`, 'Supprimer'))) return
    try {
      await remove('plays', id)
      removeDraft(draftKey('plays', id))
      navigate('/systemes', { replace: true })
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <>
      <Header title={play.name} subtitle={play.category} back="/systemes">
        {editable && (
          <a className="button soft small" href={`#/systemes/${id}/modifier`}>
            <Icon name="edit" /> Modifier
          </a>
        )}
      </Header>
      <main>
        {editable ? (
          <PendingDraft table="plays" draftKey={draftKey('plays', id)} href={`/systemes/${id}/modifier`} />
        ) : (
          <ReadOnlyNotice author={author} copyLabel="Copier dans mes systèmes" onCopy={duplicate} />
        )}
        <PlayPlayer key={play.id} scene={playScene(play)} defense={play.defense} />
        {play.description && (
          <div className="card">
            <p className="pre">{play.description}</p>
          </div>
        )}
        {editable && (
          <>
            <ShareChoice play={play} />
            <div className="row">
              <button className="button ghost" onClick={duplicate}><Icon name="copy" /> Dupliquer</button>
              <button className="button ghost danger-text" onClick={erase}><Icon name="trash" /> Supprimer</button>
            </div>
          </>
        )}
      </main>
    </>
  )
}
