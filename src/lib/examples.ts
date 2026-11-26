import { newPlay, uid } from './engine'
import type { Action, Play } from './types'

const step = (note: string, actions: Omit<Action, 'id'>[]) => ({
  id: uid(),
  note,
  actions: actions.map((a) => ({ ...a, id: uid() })),
})

export function examplePlays(): Play[] {
  const pnr = newPlay()
  pnr.name = 'Pick and roll haut'
  pnr.description = 'Le 5 vient poser un écran pour le meneur puis roule vers le panier.'
  pnr.steps = [
    step('Le 5 monte poser l’écran sur le défenseur du 1.', [
      { kind: 'screen', player: 'O5', path: [{ x: 66, y: 76 }, { x: 82, y: 100 }] },
    ]),
    step('Le 1 utilise l’écran en dribble, le 5 ouvre vers le panier.', [
      { kind: 'dribble', player: 'O1', path: [{ x: 92, y: 106 }, { x: 108, y: 82 }] },
      { kind: 'cut', player: 'O5', path: [{ x: 74, y: 70 }, { x: 74, y: 36 }] },
      { kind: 'cut', player: 'O2', path: [{ x: 136, y: 52 }] },
    ]),
    step('Passe au 5 pour finir près du cercle.', [{ kind: 'pass', player: 'O1', target: 'O5' }]),
    step('Tir.', [{ kind: 'shot', player: 'O5' }]),
  ]

  const inbound = newPlay()
  inbound.name = 'Remise en jeu carré'
  inbound.category = 'Remise en jeu fond'
  inbound.description = 'Formation en carré : un écran libère un joueur près du cercle.'
  inbound.start = {
    ...inbound.start,
    O1: { x: 100, y: 3 },
    O2: { x: 100, y: 58 },
    O3: { x: 50, y: 58 },
    O4: { x: 50, y: 24 },
    O5: { x: 100, y: 24 },
  }
  inbound.steps = [
    step('Le 4 pose l’écran pour le 3, le 2 s’écarte vers le côté.', [
      { kind: 'screen', player: 'O4', path: [{ x: 50, y: 48 }] },
      { kind: 'cut', player: 'O3', path: [{ x: 38, y: 46 }, { x: 52, y: 24 }] },
      { kind: 'cut', player: 'O2', path: [{ x: 132, y: 28 }] },
    ]),
    step('Passe au 3 sous le panier.', [{ kind: 'pass', player: 'O1', target: 'O3' }]),
  ]
  return [pnr, inbound]
}
