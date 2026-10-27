import type { HTMLAttributes } from 'react'

export type CardVariant = 'content' | 'elevated' | 'soft' | 'dark'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}

export function Card({ variant = 'content', className = '', ...rest }: CardProps) {
  const classes = ['card', `card--${variant}`, className].filter(Boolean).join(' ')
  return <div className={classes} {...rest} />
}
