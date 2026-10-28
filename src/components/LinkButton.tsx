import type { AnchorHTMLAttributes } from 'react'
import type { ButtonVariant } from './Button'

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant
  block?: boolean
}

/** An external link that looks like a button. Always opens in a new tab, without referrer or opener. */
export function LinkButton({ variant = 'secondary', block = false, className = '', ...rest }: LinkButtonProps) {
  const classes = ['btn', `btn--${variant}`, block ? 'btn--block' : '', className].filter(Boolean).join(' ')
  return <a className={classes} target="_blank" rel="noopener noreferrer" {...rest} />
}
