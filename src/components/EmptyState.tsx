import type { ReactNode } from 'react'

type EmptyStateProps = {
  art: ReactNode
  title: string
  text: string
  action?: ReactNode
  /** Use "h1" when the empty state is the whole screen and nothing else names it. */
  heading?: 'h1' | 'h2'
}

export function EmptyState({ art, title, text, action, heading: Heading = 'h2' }: EmptyStateProps) {
  return (
    <section className="empty">
      <div className="empty__art">{art}</div>
      <Heading className="t-display-md">{title}</Heading>
      <p className="t-body-md empty__text">{text}</p>
      {action}
    </section>
  )
}
