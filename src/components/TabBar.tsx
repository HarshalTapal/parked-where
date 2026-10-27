import type { ReactNode } from 'react'

export type TabItem = {
  id: string
  label: string
  icon: ReactNode
}

type TabBarProps = {
  items: TabItem[]
  activeId: string
  onSelect: (id: string) => void
}

/** Bottom tab bar (amendment A7). Active tab is a black pill. */
export function TabBar({ items, activeId, onSelect }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Main">
      <ul className="tabbar__list">
        {items.map((item) => (
          <li key={item.id} className="tabbar__item">
            <button
              type="button"
              className="tabbar__tab"
              aria-current={item.id === activeId ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
