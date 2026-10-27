import type { ButtonHTMLAttributes } from 'react'

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  selected?: boolean
}

export function Chip({ selected = false, className = '', type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      className={`chip ${className}`.trim()}
      aria-pressed={selected}
      {...rest}
    />
  )
}
