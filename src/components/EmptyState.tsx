import type { ReactNode } from 'react'

type EmptyStateProps = {
  art: ReactNode
  title: string
  text: string
  action?: ReactNode
}

export function EmptyState({ art, title, text, action }: EmptyStateProps) {
  return (
    <section className="empty">
      <div className="empty__art">{art}</div>
      <h2 className="t-display-md">{title}</h2>
      <p className="t-body-md empty__text">{text}</p>
      {action}
    </section>
  )
}
