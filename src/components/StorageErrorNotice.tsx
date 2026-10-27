import { Button } from './Button'
import { Card } from './Card'
import { AlertIcon } from './Icons'

type Props = {
  message: string
  onRetry: () => void
}

/** Recoverable storage error: black text + icon, a retry action, nothing the user typed is lost. */
export function StorageErrorNotice({ message, onRetry }: Props) {
  return (
    <Card variant="soft" role="alert">
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <AlertIcon />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', flex: 1 }}>
          <p className="t-body-md-strong" style={{ lineHeight: '24px' }}>
            Could not save
          </p>
          <p className="t-body-md">{message}</p>
          <div>
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
