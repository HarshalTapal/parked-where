type ToastProps = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

/** Black pill toast. Place it inside <ToastRegion> to float above the tab bar. */
export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      {actionLabel && (
        <button type="button" className="toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ToastRegion({ children }: { children: React.ReactNode }) {
  return <div className="toast-region">{children}</div>
}
