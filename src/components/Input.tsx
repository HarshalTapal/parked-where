import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { AlertIcon } from './Icons'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  onSoft?: boolean
}

export function Input({ label, hint, error, onSoft = false, className = '', ...rest }: InputProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`field__control ${onSoft ? 'field__control--on-soft' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
