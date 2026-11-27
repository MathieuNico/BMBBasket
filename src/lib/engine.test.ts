import { beforeEach, describe, expect, it, vi } from 'vitest'
import { draftKey, readDraft, writeDraft } from './drafts'
import { actionLine, COURT, frameAt, isInvalid, marking, newPlay, newStep, nextPlayerId, playScene, removePlayer, stateAt } from './engine'
import { applyAttack, applyDefense, ATTACKS, DEFENSES } from './formations'
import { canEdit, coachName, isMine, needsName } from './owners'
import { installWay } from './install'
import { length, pointAt, simplify, trim } from './geometry'
import { parseBackup } from './backup'
import { cleanCode, isCode, newCode, playerContent, showCode } from './sharing'
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

describe('partage aux joueurs', () => {
  const session = (team: string, published: boolean, drill: Drill) => ({
    ...newSession('2026-12-01', team),
    published,
    items: [itemFor(drill)],
    notes: 'secret',
    attendance: { a: 'absent' as const },
  })
  const shown = twoBalls()
  const hidden = twoBalls()
  const data = {
    plays: [{ ...pickAndRoll(), teams: ['U15F'] }, { ...pickAndRoll(), teams: ['U13M'] }, pickAndRoll()],
    drills: [shown, hidden],
    sessions: [session('u15f ', true, shown), session('U15F', false, hidden), session('U13M', true, hidden)],
    members: [{ id: 'm', name: 'Prénom N.', team: 'U15F', updatedAt: '' }],
    teams: [],
  }

  it('ne montre à une équipe que ce qui est publié pour elle', () => {
    const content = playerContent(data, 'U15F')
    expect(content.plays.map((p) => p.id)).toEqual([data.plays[0].id])
    expect(content.sessions.map((s) => s.id)).toEqual([data.sessions[0].id])
    expect(content.drills).toEqual([shown])
  })

  it('retire les notes, les présences et la liste des équipes', () => {
    const content = playerContent(data, 'U15F')
    expect(content.sessions[0].notes).toBe('')
    expect(content.sessions[0].attendance).toEqual({})
    expect(content.plays[0].teams).toBeUndefined()
    expect(JSON.stringify(content)).not.toMatch(/secret|absent|Prénom/)
  })

  it('génère des codes lisibles et relit une saisie approximative', () => {
    const code = newCode()
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/)
    expect(cleanCode(' ' + showCode(code).toLowerCase() + ' ')).toBe(code)
    expect(isCode(code)).toBe(true)
    expect(isCode('ABC')).toBe(false)
  })
})

describe('auteurs', () => {
  const coaches = [{ id: 'moi', name: 'Moi' }, { id: 'julie', name: ' ' }]

  it('réserve la modification à l’auteur', () => {
    expect(canEdit({ ownerId: 'moi' }, 'moi', coaches)).toBe(true)
    expect(canEdit({ ownerId: 'julie' }, 'moi', coaches)).toBe(false)
  })

  it('laisse modifiable ce qui n’a plus d’auteur, ou sans serveur', () => {
    expect(canEdit({ ownerId: 'parti' }, 'moi', coaches)).toBe(true)
    expect(canEdit({}, 'moi', coaches)).toBe(true)
    expect(canEdit({ ownerId: 'julie' }, undefined, [])).toBe(true)
    expect(isMine({ ownerId: 'parti' }, 'moi')).toBe(false)
  })

  it('invite à choisir un nom', () => {
    expect(needsName({ id: 'a', name: 'Coach' })).toBe(true)
    expect(needsName(coaches[0])).toBe(false)
    expect(coachName(coaches[1])).toBe('Coach sans nom')
  })
})

describe('installation', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1'
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15'
  const device = { installed: false, prompt: false, userAgent: iphone, touchPoints: 5 }

  it('explique le menu Partager sur iPhone et iPad', () => {
    expect(installWay(device)).toBe('ios')
    expect(installWay({ ...device, userAgent: mac })).toBe('ios')
  })

  it('propose le bouton quand le navigateur sait installer', () => {
    expect(installWay({ ...device, userAgent: 'Android', prompt: true })).toBe('button')
  })

  it('renvoie au menu du navigateur dans les autres cas', () => {
    expect(installWay({ ...device, userAgent: mac, touchPoints: 0 })).toBe('menu')
  })

  it('ne propose rien une fois installée', () => {
    expect(installWay({ ...device, installed: true, prompt: true })).toBe('installed')
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
      drills: [twoBalls()],
      sessions: [newSession('2026-12-01', 'U15F')],
      members: [],
      teams: [{ id: '33333333-3333-4333-8333-333333333333', name: 'U15F', updatedAt: '' }],
    }
    expect(parseBackup(JSON.stringify(data))).toEqual(data)
  })
  it('accepte une ancienne sauvegarde sans entraînement', () => {
    // les matchs d'une ancienne sauvegarde sont ignorés
    expect(parseBackup(JSON.stringify({ plays: [pickAndRoll()], matches: [{}] })).drills).toEqual([])
  })
  it('refuse un fichier abîmé', () => {
    expect(() => parseBackup('{"plays":[{"id":"x"}]}')).toThrow()
    expect(() => parseBackup('bonjour')).toThrow()
    const orphan = removePlayer(twoBalls(), 'C1')
    const drill = { ...twoBalls(), start: orphan.start }
    expect(() => parseBackup(JSON.stringify({ plays: [], drills: [drill] }))).toThrow()
  })
})
