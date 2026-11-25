import { formatChips } from '../../lib/utils'
import ChipIcon from '../ui/ChipIcon'

export default function PotDisplay({ pot, label = 'กองกลาง' }: { pot: number; label?: string }) {
  return (
    <div className="pot">
      <span className="pot__label">{label}</span>
      <span className="pot__value">
        <ChipIcon size={15} />
        {formatChips(pot)}
      </span>
    </div>
  )
}
