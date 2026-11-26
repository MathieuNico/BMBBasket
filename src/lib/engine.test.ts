import { beforeEach, describe, expect, it, vi } from 'vitest'
import { draftKey, readDraft, writeDraft } from './drafts'
import { actionLine, COURT, frameAt, isInvalid, marking, newPlay, newStep, nextPlayerId, playScene, removePlayer, stateAt } from './engine'
import { applyAttack, applyDefense, ATTACKS, DEFENSES } from './formations'
import { length, pointAt, simplify, trim } from './geometry'
import { parseBackup } from './backup'
import { attendanceOf, clock, copySession, itemFor, newDrill, newSession } from './training'
import type { Drill, Play } from './types'

function pickAndRoll(): Play {
  const play = newPlay()
  play.steps = [
    {
      ...newStep(),
      actions: [
        { id: 'a', kind: 'dribble', player: 'O1', path: [{ x: 100, y: 90 }] },
        { id: 'b', kind: 'pass', player: 'O1', target: 'O5' },
        { id: 'c', kind: 'cut', player: 'O5', path: [{ x: 70, y: 30 }] },
      ],
    },
    { ...newStep(), actions: [{ id: 'd', kind: 'shot', player: 'O5' }] },
  ]
  return play
}

/** Deux files avec chacune un ballon, plus un coach. */
function twoBalls(): Drill {
  return {
    ...newDrill(),
    name: 'Deux ballons',
    start: { O1: { x: 30, y: 90 }, O2: { x: 120, y: 90 }, O12: { x: 30, y: 110 }, C1: { x: 75, y: 60 } },
    balls: ['O1', 'O2'],
    cones: [{ id: 'k', x: 50, y: 50 }],
    steps: [
      {
        ...newStep(),
        actions: [
          { id: 'a', kind: 'pass', player: 'O1', target: 'C1' },
          { id: 'b', kind: 'shot', player: 'O2' },
        ],
      },
    ],
  }
}

describe('moteur de jeu', () => {
  it('enchaîne les positions et le ballon d’un temps à l’autre', () => {
    const scene = playScene(pickAndRoll())
    const second = stateAt(scene, 1)
    expect(second.positions.O1).toEqual({ x: 100, y: 90 })
    expect(second.positions.O5).toEqual({ x: 70, y: 30 })
    expect(second.balls).toEqual(['O5'])
    expect(stateAt(scene, 2).balls).toEqual([])
  })

  it('fait partir la passe de la fin du dribble vers l’arrivée du receveur', () => {
    const scene = playScene(pickAndRoll())
    const line = actionLine(stateAt(scene, 0), scene.steps[0], scene.steps[0].actions[1])
    expect(line).toEqual([{ x: 100, y: 90 }, { x: 70, y: 30 }])
  })

  it('anime le dribble puis la passe', () => {
    const scene = playScene(pickAndRoll())
    expect(frameAt(scene, 0, 0).balls[0].holder).toBe('O1')
    expect(frameAt(scene, 0, 0.55).positions.O1).toEqual({ x: 100, y: 90 })
    expect(frameAt(scene, 0, 0.8).balls[0].holder).toBeNull()
    expect(frameAt(scene, 0, 1).balls[0].holder).toBe('O5')
    expect(frameAt(scene, 1, 1).balls[0].point).toEqual(COURT.basket)
  })

  it('signale une passe devenue impossible', () => {
    const play = pickAndRoll()
    play.ball = 'O2'
    const scene = playScene(play)
    expect(isInvalid(stateAt(scene, 0), play.steps[0].actions[1])).toBe(true)
    expect(stateAt(scene, 1).balls).toEqual(['O2'])
  })

  it('gère plusieurs ballons en même temps', () => {
    const drill = twoBalls()
    expect(stateAt(drill, 1).balls).toEqual(['C1'])
    const end = frameAt(drill, 0, 1)
    expect(end.balls.map((b) => b.holder)).toEqual(['C1', null])
  })

  it('échange deux ballons entre deux joueurs', () => {
    const drill = twoBalls()
    drill.steps[0].actions = [
      { id: 'a', kind: 'pass', player: 'O1', target: 'O2' },
      { id: 'b', kind: 'pass', player: 'O2', target: 'O1' },
    ]
    expect(stateAt(drill, 1).balls).toEqual(['O2', 'O1'])
  })

  it('numérote et retire des joueurs sans laisser d’action orpheline', () => {
    const drill = twoBalls()
    expect(nextPlayerId(drill.start, 'O')).toBe('O3')
    expect(nextPlayerId(drill.start, 'X')).toBe('X1')
    const after = removePlayer(drill, 'C1')
    expect(after.start.C1).toBeUndefined()
    expect(after.steps[0].actions.map((a) => a.id)).toEqual(['b'])
  })
})

describe('séances', () => {
  it('calcule les horaires du déroulé', () => {
    expect(clock('18:30', 45)).toBe('19h15')
    expect(clock('', 45)).toBe('')
  })

  it('copie une séance sans le pointage', () => {
    const session = { ...newSession('2026-12-01', 'U15F'), items: [itemFor(twoBalls())], attendance: { a: 'present' as const } }
    const copy = copySession(session)
    expect(copy.id).not.toBe(session.id)
    expect(copy.items).toEqual(session.items)
    expect(copy.attendance).toEqual({})
    expect(copy.date).toBe('')
  })

  it('compte les présences d’un joueur', () => {
    const sessions = (['present', 'absent', 'excused', 'present'] as const).map((p) => ({ ...newSession(''), attendance: { a: p } }))
    expect(attendanceOf('a', [...sessions, newSession('')])).toEqual({ present: 2, total: 4 })
  })
})

describe('placements de départ', () => {
  const [, fiveOut] = ATTACKS
  const [man, zone] = DEFENSES

  it('fait suivre une défense individuelle', () => {
    const play = newPlay()
    const { start } = applyAttack(play, fiveOut)
    expect(start!.O4).toEqual(fiveOut.positions[3])
    expect(start!.X4).toEqual(marking(fiveOut.positions[3]))
  })

  it('laisse une zone en place quand l’attaque change', () => {
    const play = { ...newPlay(), ...applyDefense(newPlay(), zone) }
    expect(play.defense).toBe(true)
    expect(applyAttack(play, fiveOut).start!.X1).toEqual(zone.positions[0])
    expect(applyDefense(play, man).start!.X1).toEqual(marking(play.start.O1))
  })

  it('garde tout le monde sur le demi-terrain', () => {
    for (const f of [...ATTACKS, ...DEFENSES.slice(1)]) {
      expect(f.positions).toHaveLength(5)
      for (const p of f.positions) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(COURT.width)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(COURT.half)
      }
    }
  })
})

describe('brouillons', () => {
  beforeEach(() => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
      removeItem: (k: string) => memory.delete(k),
    })
  })

  it('distingue création, modification et création depuis une séance', () => {
    const keys = [draftKey('drills'), draftKey('drills', 'abc'), draftKey('drills', undefined, 'seance'), draftKey('plays')]
    expect(new Set(keys).size).toBe(4)
  })

  it('reprend un dessin et ignore un brouillon abîmé', () => {
    const draft = { value: pickAndRoll(), base: '' }
    writeDraft('k', draft)
    expect(readDraft('plays', 'k')).toEqual(draft)
    writeDraft('k', { value: { id: 'x' }, base: '' })
    expect(readDraft('plays', 'k')).toBeUndefined()
    localStorage.setItem('k', 'pas du json')
    expect(readDraft('plays', 'k')).toBeUndefined()
  })
})

describe('géométrie', () => {
  const line = [{ x: 0, y: 0 }, { x: 10, y: 0.1 }, { x: 20, y: 0 }]
  it('simplifie un tracé presque droit', () => expect(simplify(line, 1)).toHaveLength(2))
  it('trouve le milieu', () => expect(pointAt([line[0], line[2]], 0.5)).toEqual({ x: 10, y: 0 }))
  it('raccourcit les deux bouts', () => expect(length(trim([line[0], line[2]], 5, 5))).toBeCloseTo(10))
})

describe('sauvegarde', () => {
  it('relit un export complet', () => {
    const data = {
      plays: [pickAndRoll()],
      matches: [],
      drills: [twoBalls()],
      sessions: [newSession('2026-12-01', 'U15F')],
      members: [],
    }
    expect(parseBackup(JSON.stringify(data))).toEqual(data)
  })
  it('accepte une ancienne sauvegarde sans entraînement', () => {
    expect(parseBackup(JSON.stringify({ plays: [pickAndRoll()], matches: [] })).drills).toEqual([])
  })
  it('refuse un fichier abîmé', () => {
    expect(() => parseBackup('{"plays":[{"id":"x"}],"matches":[]}')).toThrow()
    expect(() => parseBackup('bonjour')).toThrow()
    const orphan = removePlayer(twoBalls(), 'C1')
    const drill = { ...twoBalls(), start: orphan.start }
    expect(() => parseBackup(JSON.stringify({ plays: [], matches: [], drills: [drill] }))).toThrow()
  })
})
