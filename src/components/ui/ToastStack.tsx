import type { Toast } from '../../hooks/useToasts'
import Icon from './Icon'

export default function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span className="toast__icon">
            <Icon name={toast.tone === 'warn' ? 'spark' : 'check'} size={15} />
          </span>
          <span>{toast.text}</span>
        </div>
      ))}
    </div>
  )
}
