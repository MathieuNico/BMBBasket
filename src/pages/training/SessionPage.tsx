import { useState } from 'react'
import { Thumbnail } from '../../components/Diagram'
import { PendingDraft } from '../../components/DraftNotice'
import { Icon } from '../../components/Icon'
import { Picker } from '../../components/Picker'
import { PlayPlayer } from '../../components/PlayPlayer'
import { TeamPicker } from '../../components/TeamPicker'
import { Header, NotFound, today, useFeedback } from '../../components/ui'
import { useStore } from '../../data/store'
import { draftKey } from '../../lib/drafts'
import { uid } from '../../lib/engine'
import { navigate, releaseGuard } from '../../lib/router'
import { clock, copySession, hasDiagram, itemFor, newSession, sameTeam, totalDuration } from '../../lib/training'
import type { Drill, Session, SessionItem } from '../../lib/types'
import { useDraft } from '../../lib/useDraft'
import { Attendance } from './Attendance'
import { SessionConsultation } from './SessionConsultation'
import { DrillDetails } from './DrillPage'

export function SessionPage({ id }: { id?: string }) {
  const { sessions, canEdit } = useStore()
  const stored = sessions.find((s) => s.id === id)
  const [initial] = useState(() => (id ? stored : newSession(today())))
  if (stored && !canEdit(stored)) return <SessionConsultation session={stored} />
  return initial ? (
    <SessionForm initial={initial} stored={stored} isNew={!id} />
  ) : (
    <NotFound back="/entrainement" text="Cette séance n’existe plus." />
  )
}

interface ItemProps {
  item: SessionItem
  drill?: Drill
  number: number
  start: string
  first: boolean
  last: boolean
  onChange(changes: Partial<SessionItem>): void
  onMove(offset: -1 | 1): void
  onRemove(): void
}

function Item({ item, drill, number, start, first, last, onChange, onMove, onRemove }: ItemProps) {
  const [open, setOpen] = useState(false)
  const name = drill?.name ?? item.title

  return (
    <li className="card entry">
      <div className="entry-head">
        {drill && hasDiagram(drill) ? <Thumbnail scene={drill} /> : <b className="entry-number">{number}</b>}
        <span>
          {item.drillId ? (
            <strong>{name}</strong>
          ) : (
            <input value={item.title} aria-label="Nom du temps libre" placeholder="Ex. : Pause" onChange={(e) => onChange({ title: e.target.value })} />
          )}
          <small>
            {[start, drill?.theme, item.drillId && !drill && 'exercice supprimé de la bibliothèque'].filter(Boolean).join(' · ')}
          </small>
        </span>
        <label className="duration">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={600}
            value={item.duration || ''}
            aria-label={`Durée de ${name} en minutes`}
            onChange={(e) => onChange({ duration: Math.max(0, Math.min(600, Math.round(Number(e.target.value)))) })}
          />
          min
        </label>
      </div>
      <input
        value={item.note}
        aria-label={`Consigne pour ${name}`}
        placeholder="Consigne (visible par les joueurs)"
        onChange={(e) => onChange({ note: e.target.value })}
      />
      <div className="entry-actions">
        {drill && (
          <button className="button ghost small see" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Masquer' : 'Voir l’exercice'}
          </button>
        )}
        <button className="icon-button" aria-label="Monter" disabled={first} onClick={() => onMove(-1)}><Icon name="up" /></button>
        <button className="icon-button" aria-label="Descendre" disabled={last} onClick={() => onMove(1)}><Icon name="down" /></button>
        <button className="icon-button" aria-label={`Retirer ${name}`} onClick={onRemove}><Icon name="close" /></button>
      </div>
      {open && drill && (
        <div className="entry-detail">
          {hasDiagram(drill) && <PlayPlayer scene={drill} />}
          <DrillDetails drill={drill} />
        </div>
      )}
    </li>
  )
}

function SessionForm({ initial, stored, isNew }: { initial: Session; stored?: Session; isNew: boolean }) {
  const { drills, teams, save, remove, authorOf } = useStore()
  const { confirm, toast } = useFeedback()
  const { draft: session, dirty, patch, markSaved } = useDraft(() => initial, stored)
  const [part, setPart] = useState<'plan' | 'attendance'>('plan')
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)

  const { items } = session
  const knownTeam = teams.some((t) => sameTeam(t.name, session.team))
  const setItems = (list: SessionItem[]) => patch({ items: list })
  const total = totalDuration(items)
  const drillOf = (item: SessionItem) => drills.find((d) => d.id === item.drillId)
  const material = [...new Set(items.map((i) => drillOf(i)?.material.trim()).filter(Boolean))]

  const move = (i: number, offset: -1 | 1) => {
    const list = [...items]
    ;[list[i], list[i + offset]] = [list[i + offset], list[i]]
    setItems(list)
  }

  const submit = async (then?: string) => {
    if (!session.team.trim()) return toast('Indique l’équipe de la séance.')
    setSaving(true)
    try {
      const clean = { ...session, team: session.team.trim(), title: session.title.trim(), updatedAt: new Date().toISOString() }
      await save('sessions', clean)
      markSaved(clean)
      releaseGuard()
      if (then) navigate(then)
      else {
        toast('Séance enregistrée')
        if (isNew) navigate(`/entrainement/seance/${clean.id}`, { replace: true })
      }
    } catch (e) {
      toast((e as Error).message)
    }
    setSaving(false)
  }

  const createDrill = () => {
    const path = `/entrainement/exercice/nouveau/${session.id}`
    // la séance doit exister pour que l'exercice puisse y être ajouté
    if (isNew || dirty) submit(path)
    else navigate(path)
  }

  const duplicate = async () => {
    const copy = copySession(session)
    try {
      await save('sessions', copy)
      releaseGuard()
      navigate(`/entrainement/seance/${copy.id}`)
      toast('Copie créée : choisis sa date')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const erase = async () => {
    if (!(await confirm('Supprimer cette séance et son pointage ?', 'Supprimer'))) return
    try {
      await remove('sessions', session.id)
      releaseGuard()
      navigate('/entrainement', { replace: true })
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <>
      <Header title={isNew ? 'Nouvelle séance' : 'Séance'} subtitle={session.team || undefined} back="/entrainement" />
      <main>
        <section className="card form">
          <TeamPicker value={session.team} onChange={(team) => patch({ team })} />
          <div className="row">
            <label>
              Date
              <input type="date" value={session.date} onChange={(e) => patch({ date: e.target.value })} />
            </label>
            <label>
              Début
              <input type="time" value={session.time} onChange={(e) => patch({ time: e.target.value })} />
            </label>
          </div>
          <label>
            Thème
            <input value={session.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex. : jeu rapide" maxLength={80} />
          </label>
          <label>
            Objectif
            <textarea rows={2} value={session.objective} onChange={(e) => patch({ objective: e.target.value })} placeholder="Ce que les joueurs doivent savoir faire à la fin" />
          </label>
        </section>

        <section className="card">
          <label className="switch">
            Visible par les joueurs
            <input type="checkbox" checked={!!session.published} onChange={(e) => patch({ published: e.target.checked })} />
          </label>
          <p className="muted">
            {!session.published ? (
              'Réservée aux coachs.'
            ) : !knownTeam ? (
              <>Les joueurs ne peuvent pas rejoindre cette équipe : ajoute-la dans l’onglet <a className="link" href="#/equipes">Équipes</a>.</>
            ) : (
              'Ils voient le déroulé et les exercices, jamais les présences ni tes notes.'
            )}
          </p>
        </section>

        <div className="segmented">
          <button className={part === 'plan' ? 'active' : ''} aria-pressed={part === 'plan'} onClick={() => setPart('plan')}>Déroulé</button>
          <button className={part === 'attendance' ? 'active' : ''} aria-pressed={part === 'attendance'} onClick={() => setPart('attendance')}>Présences</button>
        </div>

        {part === 'attendance' ? (
          <Attendance session={session} onChange={(attendance) => patch({ attendance })} />
        ) : (
          <>
            {items.length > 0 && (
              <p className="summary">
                <strong>{total} min au total</strong>
                {session.time && <span className="muted">Fin à {clock(session.time, total)}</span>}
              </p>
            )}
            <ol className="list">
              {items.map((item, i) => (
                <Item
                  key={item.id}
                  item={item}
                  drill={drillOf(item)}
                  number={i + 1}
                  start={clock(session.time, totalDuration(items.slice(0, i)))}
                  first={i === 0}
                  last={i === items.length - 1}
                  onChange={(changes) => setItems(items.map((x) => (x.id === item.id ? { ...x, ...changes } : x)))}
                  onMove={(offset) => move(i, offset)}
                  onRemove={() => setItems(items.filter((x) => x.id !== item.id))}
                />
              ))}
            </ol>
            <PendingDraft
              table="drills"
              draftKey={draftKey('drills', undefined, session.id)}
              href={`/entrainement/exercice/nouveau/${session.id}`}
            />
            <button className="button primary" onClick={() => setPicking(true)}><Icon name="plus" /> Ajouter des exercices</button>
            <div className="row">
              <button className="button ghost" onClick={createDrill} disabled={saving}>Nouvel exercice</button>
              <button className="button ghost" onClick={() => setItems([...items, { id: uid(), title: '', duration: 5, note: '' }])}>Temps libre</button>
            </div>
            {material.length > 0 && (
              <div className="card">
                <h2>Matériel à prévoir</h2>
                <ul className="material">{material.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            <label>
              Notes réservées aux coachs
              <textarea rows={3} value={session.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Groupes, remarques…" />
            </label>
          </>
        )}

        {!isNew && (
          <div className="row">
            <button className="button ghost" onClick={duplicate} disabled={dirty}><Icon name="copy" /> Dupliquer</button>
            <button className="button ghost danger-text" onClick={erase}><Icon name="trash" /> Supprimer</button>
          </div>
        )}
      </main>
      {(isNew || dirty) && (
        <div className="savebar">
          <button className="button primary" onClick={() => submit()} disabled={saving}>Enregistrer la séance</button>
        </div>
      )}
      {picking && (
        <Picker
          title="Ajouter des exercices"
          choices={drills.map((d) => ({ id: d.id, name: d.name, detail: `${d.theme} · ${d.duration} min`, scene: d, author: authorOf(d) }))}
          chosen={[]}
          empty="Ta bibliothèque est vide : utilise « Nouvel exercice »."
          onClose={(ids) => {
            setPicking(false)
            const added = ids.flatMap((id) => drills.filter((d) => d.id === id).map(itemFor))
            if (added.length) setItems([...items, ...added])
          }}
        />
      )}
    </>
  )
}
