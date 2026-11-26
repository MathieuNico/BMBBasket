import { useState } from 'react'
import { RestoredNotice } from '../components/DraftNotice'
import { CourtChoice, DrawingEditor } from '../components/DrawingEditor'
import { FormationSheet } from '../components/FormationSheet'
import { Header, NotFound, useFeedback } from '../components/ui'
import { useStore } from '../data/store'
import { draftKey } from '../lib/drafts'
import { newPlay, playScene } from '../lib/engine'
import { navigate, releaseGuard } from '../lib/router'
import { CATEGORIES, type Play, type Scene } from '../lib/types'
import { useDrawingDraft } from '../lib/useDrawingDraft'

/** Traduit une modification du dessin vers le format d'un système. */
function toPlay({ balls, cones: _, start, ...changes }: Partial<Scene>): Partial<Play> {
  return {
    ...changes,
    ...(start && { start: start as Play['start'] }),
    ...(balls && { ball: balls[0] ?? null }),
  }
}

export function EditorPage({ id }: { id?: string }) {
  const { plays } = useStore()
  const [initial] = useState<Play | undefined>(() => (id ? plays.find((p) => p.id === id) : newPlay()))
  return initial ? <Editor initial={initial} isNew={!id} /> : <NotFound back="/systemes" text="Ce système n’existe plus." />
}

function Editor({ initial, isNew }: { initial: Play; isNew: boolean }) {
  const { plays, save } = useStore()
  const { toast } = useFeedback()
  const savedAt = plays.find((p) => p.id === initial.id)?.updatedAt
  const { history, restored, outdated, forget } = useDrawingDraft(
    'plays',
    draftKey('plays', isNew ? undefined : initial.id),
    initial,
    isNew ? '' : (savedAt ?? ''),
  )
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)

  const play = history.value
  const scene = playScene(play)

  const submit = async () => {
    const name = play.name.trim()
    if (!name) return toast('Donne un nom au système avant de l’enregistrer.')
    setSaving(true)
    try {
      await save('plays', { ...play, name })
      forget()
      releaseGuard()
      navigate(`/systemes/${play.id}`, { replace: true })
    } catch (e) {
      toast((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <>
      <Header
        back={isNew ? '/systemes' : `/systemes/${initial.id}`}
        title={
          <input
            className="name-input"
            placeholder="Nom du système"
            aria-label="Nom du système"
            value={play.name}
            onChange={(e) => history.patch({ name: e.target.value })}
            maxLength={80}
          />
        }
      >
        <button className="button accent" onClick={submit} disabled={saving}>Enregistrer</button>
      </Header>
      <main className="editor">
        <DrawingEditor
          scene={scene}
          defense={play.defense}
          initialTool={isNew ? 'move' : 'cut'}
          history={history}
          onCommit={(changes) => history.commit(toPlay(changes))}
          onPatch={(changes) => history.patch(toPlay(changes))}
          onFormations={() => setPicking(true)}
          notice={restored && <RestoredNotice outdated={outdated} onDiscard={history.reset} />}
        />

        <section className="card form">
          <h2>Le système</h2>
          <label>
            Catégorie
            <select value={play.category} onChange={(e) => history.commit({ category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <CourtChoice scene={scene} onChange={(court) => history.commit({ court })} />
          <label className="switch">
            <input type="checkbox" checked={play.defense} onChange={(e) => history.commit({ defense: e.target.checked })} />
            Afficher les défenseurs
          </label>
          <label>
            Description
            <textarea rows={3} value={play.description} placeholder="Quand l’utiliser, ce qu’on cherche…" onChange={(e) => history.patch({ description: e.target.value })} />
          </label>
        </section>
      </main>
      {picking && <FormationSheet play={play} onPick={history.commit} onClose={() => setPicking(false)} />}
    </>
  )
}
