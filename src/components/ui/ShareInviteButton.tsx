import type { ToastTone } from '../../hooks/useToasts'
import Icon from './Icon'

export default function ShareInviteButton({
  inviteLink,
  notify,
}: {
  inviteLink: string
  notify: (text: string, tone?: ToastTone) => void
}) {
  if (typeof navigator.share !== 'function') return null

  const share = async () => {
    try {
      await navigator.share({
        title: 'Chipmate',
        text: 'เข้ามาเล่น Chipmate ด้วยกัน',
        url: inviteLink,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notify('แชร์ลิงก์ไม่สำเร็จ กรุณากดคัดลอกลิงก์แทน', 'warn')
    }
  }

  return (
    <button className="btn btn--ghost btn--block" onClick={share}>
      <Icon name="link" size={16} /> แชร์ลิงก์เชิญ
    </button>
  )
}
