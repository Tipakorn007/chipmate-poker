import type { ReactNode } from 'react'
import Icon from './Icon'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  label: string
}

export default function Modal({ open, onClose, children, label }: ModalProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal">
        {onClose && (
          <button className="modal__close icon-btn" onClick={onClose} aria-label="ปิด">
            <Icon name="close" size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
