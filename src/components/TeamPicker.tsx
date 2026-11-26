import { useState } from 'react'
import { useStore } from '../data/store'
import { sameTeam } from '../lib/training'
import { TEAMS } from '../lib/types'
import { Icon } from './Icon'

/** Choix de l'équipe en un geste, avec saisie libre au besoin. */
export function TeamPicker({ value, onChange }: { value: string; onChange(team: string): void }) {
  const { teams, members } = useStore()
  const known: string[] = []
  for (const name of [...teams.map((t) => t.name), ...members.map((m) => m.team)]) {
    if (!known.some((k) => sameTeam(k, name))) known.push(name)
  }
  const listed = !value || known.some((k) => sameTeam(k, value))
  const [typing, setTyping] = useState(!listed || !known.length)

  return (
    <fieldset>
      <legend>Équipe</legend>
      {known.length > 0 && (
        <div className="chips wrap">
          {known.sort((a, b) => a.localeCompare(b, 'fr')).map((name) => {
            const active = !typing && sameTeam(name, value)
            return (
              <button
                key={name}
                type="button"
                className={active ? 'chip active' : 'chip'}
                aria-pressed={active}
                onClick={() => {
                  setTyping(false)
                  onChange(name)
                }}
              >
                {name}
              </button>
            )
          })}
          <button
            type="button"
            className={typing ? 'chip active' : 'chip dashed'}
            aria-pressed={typing}
            onClick={() => {
              setTyping(true)
              onChange('')
            }}
          >
            <Icon name="plus" /> Autre
          </button>
        </div>
      )}
      {typing && (
        <>
          <input
            list="team-names"
            className={known.length ? 'team-input' : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ex. : U15F"
            aria-label="Nom de l’équipe"
            maxLength={30}
          />
          <datalist id="team-names">{TEAMS.map((t) => <option key={t} value={t} />)}</datalist>
        </>
      )}
    </fieldset>
  )
}
