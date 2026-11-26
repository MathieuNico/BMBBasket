const PATHS = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  prev: 'M15 5l-7 7 7 7',
  play: 'M7 5l12 7-12 7z',
  pause: 'M8 5v14M16 5v14',
  plus: 'M12 5v14M5 12h14',
  playbook: 'M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2zM5 18a2 2 0 012-2h12M9 8h6',
  share: 'M16 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM16 22a3 3 0 100-6 3 3 0 000 6zM8.6 10.6l4.8-4.2M8.6 13.4l4.8 4.2',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  edit: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
  up: 'M5 15l7-7 7 7',
  down: 'M5 9l7 7 7-7',
  undo: 'M9 5L4 10l5 5M4 10h10a6 6 0 010 12h-2',
  redo: 'M15 5l5 5-5 5M20 10H10a6 6 0 000 12h2',
  close: 'M6 6l12 12M18 6L6 18',
  whistle: 'M9 9h12v4h-5.5a6 6 0 11-9-5.2M9 15a0.5 0.5 0 100 .1M6 3v2M11 3l-1 2',
} as const

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill={name === 'play' ? 'currentColor' : 'none'}>
      <path d={PATHS[name]} />
    </svg>
  )
}
