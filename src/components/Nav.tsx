import { Icon, type IconName } from './Icon'
import { Logo } from './ui'

export interface NavItem {
  id: string
  href: string
  label: string
  icon: IconName
  /** Proposé seulement dans la barre latérale des grands écrans. */
  desktopOnly?: boolean
}

/** Barre de navigation : en bas sur téléphone, à gauche sur grand écran. */
export function Nav({ items, current }: { items: NavItem[]; current: string }) {
  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="nav-brand">
        <Logo />
        <span>BMB Playbook</span>
      </div>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.href}`}
          className={`${item.id === current ? 'active' : ''} ${item.desktopOnly ? 'desktop-only' : ''}`}
          aria-current={item.id === current ? 'page' : undefined}
        >
          <span className="nav-icon"><Icon name={item.icon} /></span>
          {item.label}
        </a>
      ))}
    </nav>
  )
}
