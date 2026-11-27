const PATHS = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  prev: 'M15 5l-7 7 7 7',
  play: 'M8 5.5l11 6.500-11 6.500z',
  pause: 'M9 5v14M15 5v14',
  plus: 'M12 5v14M5 12h14',
  home: 'M4 11l8-7 8 7M6 9.5V20h4.500v-5.500h3V20H18V9.500',
  playbook: 'M5 4.500h12a2 2 0 012 2V20H7a2 2 0 01-2-2zM5 18a2 2 0 012-2h12M9 8.500h6M9 11.500h4',
  users: 'M9 11.500a3.500 3.500 0 100-7 3.500 3.500 0 000 7zM3 20c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500M16 4.800a3.500 3.500 0 010 6.500M18 14.800c1.900.8 3 2.700 3 5.200',
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
  check: 'M5 12.500l4.500 4.500L19 7.500',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  eye: 'M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  logout: 'M14 4H6v16h8M11 12h9M17 8.500l3.500 3.500-3.500 3.500',
  whistle: 'M9 9h12v4h-5.5a6 6 0 11-9-5.2M9 15a0.5 0.5 0 100 .1M6 3v2M11 3l-1 2',
  calendar: 'M5 6h14v14H5zM5 10.500h14M9 3.500V7M15 3.500V7',
  install: 'M12 4v11M7.500 10.500L12 15l4.500-4.500M5 19.500h14',
  shareIos: 'M12 15V3M8 7l4-4 4 4M8 10H5.500v11h13V10H16',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={name === 'play' ? 'icon filled' : 'icon'} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
