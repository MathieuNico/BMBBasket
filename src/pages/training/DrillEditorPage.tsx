import { useCallback, useState } from 'react'
import { CourtChoice, DrawingEditor } from '../../components/DrawingEditor'
import { Header, NotFound, useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import { navigate, releaseGuard, useLeaveGuard } from '../../lib/router'
import { itemFor, newDrill } from '../../lib/training'
import { THEMES, type Drill } from '../../lib/types'
import { useHistory } from '../../lib/useHistory'

interface Props {
  id?: string
  /** Séance à laquelle ajouter le nouvel exercice. */
  sessionId?: string
}

export function DrillEditorPage({ id, sessionId }: Props) {
  const { drills } = useStore()
  const [initial] = useState<Drill | undefined>(() => (id ? drills.find((d) => d.id === id) : newDrill()))
  return initial ? (
    <Editor initial={initial} isNew={!id} sessionId={sessionId} />
  ) : (
    <NotFound back="/entrainement/exercices" text="Cet exercice n’existe plus." />
  )
}

function Editor({ initial, isNew, sessionId }: { initial: Drill; isNew: boolean; sessionId?: string }) {
  const { sessions, save } = useStore()
  const { confirm, toast } = useFeedback()
  const history = useHistory(() => initial)
  const [saving, setSaving] = useState(false)

  const askLeave = useCallback(() => confirm('Quitter sans enregistrer les modifications ?', 'Quitter'), [confirm])
  useLeaveGuard(history.dirty, askLeave)

  const drill = history.value
  const session = sessions.find((s) => s.id === sessionId)
  const back = session
    ? `/entrainement/seance/${session.id}`
    : isNew ? '/entrainement/exercices' : `/entrainement/exercice/${drill.id}`

  const submit = async () => {
    const name = drill.name.trim()
    if (!name) return toast('Donne un nom à l’exercice avant de l’enregistrer.')
    setSaving(true)
    try {
      const saved = { ...drill, name }
      await save('drills', saved)
      if (session) await save('sessions', { ...session, items: [...session.items, itemFor(saved)] })
      releaseGuard()
      navigate(session ? back : `/entrainement/exercice/${drill.id}`, { replace: true })
    } catch (e) {
      toast((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <>
      <Header title={isNew ? 'Exercice' : 'Modifier'} back={back}>
        <button className="button accent" onClick={submit} disabled={saving}>Enregistrer</button>
      </Header>
      <main className="editor">
        <input
          className="name-input"
          placeholder="Nom de l’exercice"
          aria-label="Nom de l’exercice"
          value={drill.name}
          onChange={(e) => history.patch({ name: e.target.value })}
          maxLength={80}
        />
        <div className="row">
          <label>
            Thème
            <select value={drill.theme} onChange={(e) => history.commit({ theme: e.target.value })}>
              {THEMES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Durée (min)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              value={drill.duration || ''}
              onChange={(e) => history.patch({ duration: Math.max(0, Math.min(600, Math.round(Number(e.target.value)))) })}
            />
          </label>
        </div>

        <DrawingEditor
          scene={drill}
          free
          initialTool={isNew ? 'addO' : 'cut'}
          history={history}
          onCommit={history.commit}
          onPatch={history.patch}
        />

        <section className="card form">
          <h2>La fiche</h2>
          <CourtChoice scene={drill} onChange={(court) => history.commit({ court })} />
          <label>
            Organisation et consignes
            <textarea rows={4} value={drill.description} placeholder="Déroulement, rotations, critères de réussite…" onChange={(e) => history.patch({ description: e.target.value })} />
          </label>
          <label>
            Variantes
            <textarea rows={2} value={drill.variants} placeholder="Plus facile, plus difficile…" onChange={(e) => history.patch({ variants: e.target.value })} />
          </label>
          <label>
            Matériel
            <input value={drill.material} placeholder="Ex. : 6 plots, 4 ballons, chasubles" onChange={(e) => history.patch({ material: e.target.value })} />
          </label>
        </section>
      </main>
    </>
  )
}
