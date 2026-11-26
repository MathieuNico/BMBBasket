import { useState } from 'react'
import { Thumbnail } from '../components/Diagram'
import { Icon } from '../components/Icon'
import { Picker } from '../components/Picker'
import { Header, NotFound, useFeedback } from '../components/ui'
import { useStore } from '../data/store'
import { playScene, uid } from '../lib/engine'
import { navigate, releaseGuard } from '../lib/router'
import { TEAMS, type Match, type MatchPlay } from '../lib/types'
import { useDraft } from '../lib/useDraft'

const newMatch = (): Match => ({
  id: uid(), opponent: '', team: '', date: '', time: '', home: true, notes: '', plays: [], updatedAt: '',
})

export function MatchPage({ id }: { id?: string }) {
  const { matches } = useStore()
  const stored = matches.find((m) => m.id === id)
  const [initial] = useState(() => (id ? stored : newMatch()))
  return initial ? (
    <MatchForm initial={initial} stored={stored} isNew={!id} />
  ) : (
    <NotFound back="/matchs" text="Ce match n’existe plus." />
  )
}

function MatchForm({ initial, stored, isNew }: { initial: Match; stored?: Match; isNew: boolean }) {
  const { plays, save, remove } = useStore()
  const { confirm, toast } = useFeedback()
  const { draft: match, dirty, patch, markSaved } = useDraft(() => initial, stored)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)

  // les systèmes supprimés entre-temps sont ignorés
  const entries = match.plays.flatMap((entry) => {
    const play = plays.find((p) => p.id === entry.playId)
    return play ? [{ entry, play }] : []
  })
  const setEntries = (list: MatchPlay[]) => patch({ plays: list })
  const update = (playId: string, changes: Partial<MatchPlay>) =>
    setEntries(match.plays.map((e) => (e.playId === playId ? { ...e, ...changes } : e)))
  const swap = (i: number, j: number) => {
    const list = entries.map((x) => x.entry)
    ;[list[i], list[j]] = [list[j], list[i]]
    setEntries(list)
  }

  const submit = async (then?: string) => {
    if (!match.opponent.trim()) return toast('Indique le nom de l’adversaire.')
    setSaving(true)
    try {
      const clean = { ...match, opponent: match.opponent.trim(), plays: entries.map((x) => x.entry), updatedAt: new Date().toISOString() }
      await save('matches', clean)
      markSaved(clean)
      releaseGuard()
      if (then) navigate(then)
      else {
        toast('Match enregistré')
        if (isNew) navigate(`/matchs/${clean.id}`, { replace: true })
      }
    } catch (e) {
      toast((e as Error).message)
    }
    setSaving(false)
  }

  const erase = async () => {
    if (!(await confirm(`Supprimer le match contre « ${match.opponent} » ?`, 'Supprimer'))) return
    try {
      await remove('matches', match.id)
      releaseGuard()
      navigate('/matchs', { replace: true })
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const matchMode = () => {
    const path = `/matchs/${match.id}/direct`
    if (dirty) submit(path)
    else navigate(path)
  }

  return (
    <>
      <Header title={isNew ? 'Nouveau match' : 'Préparation'} back="/matchs">
        <button className="button accent" onClick={() => submit()} disabled={saving || (!isNew && !dirty)}>Enregistrer</button>
      </Header>
      <main>
        {entries.length > 0 && (
          <button className="button primary big" onClick={matchMode} disabled={saving}>
            <Icon name="play" /> Mode match
          </button>
        )}

        <section className="card form">
          <label>
            Adversaire
            <input value={match.opponent} onChange={(e) => patch({ opponent: e.target.value })} maxLength={80} />
          </label>
          <label>
            Équipe BMB
            <input list="teams" value={match.team} onChange={(e) => patch({ team: e.target.value })} placeholder="Ex. : U15F" maxLength={30} />
            <datalist id="teams">{TEAMS.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <div className="row">
            <label>
              Date
              <input type="date" value={match.date} onChange={(e) => patch({ date: e.target.value })} />
            </label>
            <label>
              Heure
              <input type="time" value={match.time} onChange={(e) => patch({ time: e.target.value })} />
            </label>
          </div>
          <div className="segmented">
            {[true, false].map((home) => (
              <button key={String(home)} className={match.home === home ? 'active' : ''} aria-pressed={match.home === home} onClick={() => patch({ home })}>
                {home ? 'Domicile' : 'Extérieur'}
              </button>
            ))}
          </div>
          <label>
            Plan de match
            <textarea rows={4} value={match.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Points forts adverses, consignes défensives, rotations…" />
          </label>
        </section>

        <h2>Systèmes du match</h2>
        {entries.length > 0 && <p className="muted">L’étoile met un système en évidence : il apparaît en premier en mode match.</p>}
        <ul className="list">
          {entries.map(({ entry, play }, i) => (
            <li key={play.id} className={entry.key ? 'card entry key' : 'card entry'}>
              <div className="entry-head">
                <Thumbnail scene={playScene(play)} defense={play.defense} />
                <span><strong>{play.name}</strong><small>{play.category}</small></span>
                <button className="icon-button star" aria-pressed={entry.key} aria-label={`Mettre ${play.name} en évidence`} onClick={() => update(play.id, { key: !entry.key })}>
                  <Icon name="star" filled={entry.key} />
                </button>
              </div>
              <input
                value={entry.note}
                aria-label={`Consigne pour ${play.name}`}
                placeholder="Consigne pour ce match (ex. : contre leur n°7)"
                onChange={(e) => update(play.id, { note: e.target.value })}
              />
              <div className="entry-actions">
                <button className="icon-button" aria-label="Monter" disabled={i === 0} onClick={() => swap(i, i - 1)}><Icon name="up" /></button>
                <button className="icon-button" aria-label="Descendre" disabled={i === entries.length - 1} onClick={() => swap(i, i + 1)}><Icon name="down" /></button>
                <button className="icon-button" aria-label="Retirer du match" onClick={() => setEntries(match.plays.filter((e) => e.playId !== play.id))}><Icon name="close" /></button>
              </div>
            </li>
          ))}
        </ul>
        <button className="button ghost" onClick={() => setPicking(true)}><Icon name="plus" /> Ajouter des systèmes</button>
        {!isNew && <button className="button ghost danger-text" onClick={erase}><Icon name="trash" /> Supprimer le match</button>}
      </main>
      {picking && (
        <Picker
          title="Choisir les systèmes"
          choices={plays.map((p) => ({ id: p.id, name: p.name, detail: p.category, scene: playScene(p), defense: p.defense }))}
          chosen={entries.map((x) => x.play.id)}
          empty="Crée d’abord un système dans l’onglet Systèmes."
          onClose={(ids) => {
            setPicking(false)
            const kept = entries.map((x) => x.entry).filter((e) => ids.includes(e.playId))
            const added = ids.filter((i) => !kept.some((e) => e.playId === i)).map((playId) => ({ playId, key: false, note: '' }))
            if (added.length || kept.length !== entries.length) setEntries([...kept, ...added])
          }}
        />
      )}
    </>
  )
}
