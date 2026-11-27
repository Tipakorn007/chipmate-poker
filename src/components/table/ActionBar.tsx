import { useEffect, useState } from 'react'
import type { PokerGame } from '../../hooks/usePokerGame'
import { STREET_LABEL } from '../../game/engine'
import { clamp, formatChips } from '../../lib/utils'
import ChipIcon from '../ui/ChipIcon'
import Icon from '../ui/Icon'
import HandResult from './HandResult'

export default function ActionBar({ game, nextHandPending, mode }: {
  game: PokerGame
  nextHandPending: boolean
  mode: 'bot' | 'online'
}) {
  const { state, legal, isYourTurn, currentActor, you, act, pot } = game
  const [raiseTo, setRaiseTo] = useState(() => legal?.minRaiseTo ?? 0)

  useEffect(() => {
    if (legal) setRaiseTo(legal.minRaiseTo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legal?.minRaiseTo, legal?.maxRaiseTo, state.turn, state.actionCount])

  const canCheck = Boolean(isYourTurn && legal?.canCheck)
  const canCall = Boolean(isYourTurn && legal?.canCall)
  const canRaise = Boolean(isYourTurn && legal?.canRaise)

  if (state.phase === 'handOver') {
    return (
      <div className="action-dock">
        <HandResult state={state} onRebuy={game.rebuy} nextHandPending={nextHandPending} mode={mode} />
      </div>
    )
  }

  const statusText =
    you?.folded && you.cards.length === 0
        ? you.chips === 0
          ? 'ชิปหมด — เปิดเมนูห้องเพื่อเติมชิปตัวอย่าง'
          : 'รอเข้าร่วมมือถัดไป'
      : isYourTurn
        ? 'ตาคุณ — เลือกแอ็กชัน'
        : `รอ ${currentActor?.name ?? 'ผู้เล่น'} กำลังตัดสินใจ`

  const presets = legal
    ? [
        {
          label: '½ พอต',
          value: clamp(Math.round(((pot + legal.toCall) * 0.5) / 5) * 5, legal.minRaiseTo, legal.maxRaiseTo),
        },
        {
          label: 'พอต',
          value: clamp(Math.round((pot + legal.toCall) / 5) * 5, legal.minRaiseTo, legal.maxRaiseTo),
        },
        {
          label: '2× พอต',
          value: clamp(Math.round(((pot + legal.toCall) * 2) / 5) * 5, legal.minRaiseTo, legal.maxRaiseTo),
        },
        { label: 'ALL-IN', value: legal.maxRaiseTo },
      ]
    : []

  return (
    <div className={`action-dock ${isYourTurn ? 'is-active' : ''}`}>
      <div className="action-dock__status">
        <span className={`action-dock__turn ${isYourTurn ? 'is-you' : ''}`}>{statusText}</span>
        <span className="action-dock__meta">
          {STREET_LABEL[state.street]} · พอต {formatChips(pot)} · เดิมพัน {formatChips(state.currentBet)}
          {you && ` · สแต็ก ${formatChips(you.chips)}`}
        </span>
      </div>

      {canRaise && legal && (
        <div className="bet-strip">
          <div className="bet-strip__presets">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className={`chip-btn ${raiseTo === preset.value ? 'is-active' : ''}`}
                onClick={() => setRaiseTo(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            className="bet-slider"
            min={legal.minRaiseTo}
            max={legal.maxRaiseTo}
            step={1}
            value={raiseTo}
            onChange={(e) => setRaiseTo(clamp(Number(e.target.value), legal.minRaiseTo, legal.maxRaiseTo))}
            aria-label="จำนวนเดิมพัน"
          />
          <label className="bet-strip__amount">
            <span>จำนวน</span>
            <input
              type="number"
              min={legal.minRaiseTo}
              max={legal.maxRaiseTo}
              value={raiseTo}
              onChange={(e) =>
                setRaiseTo(clamp(Number(e.target.value) || 0, legal.minRaiseTo, legal.maxRaiseTo))
              }
            />
          </label>
        </div>
      )}

      <div className="actions">
        <button className="action-btn" onClick={() => act({ kind: 'fold' })} disabled={!isYourTurn}>
          <span className="action-btn__icon">
            <Icon name="close" size={14} />
          </span>
          <span className="action-btn__th">หมอบ</span>
        </button>

        <button
          className="action-btn"
          onClick={() => act({ kind: canCheck ? 'check' : 'fold' })}
          disabled={!isYourTurn}
        >
          <span className="action-btn__icon">
            <Icon name="door" size={14} />
          </span>
          <span className="action-btn__th">ผ่าน/หมอบ</span>
        </button>

        <button
          className="action-btn"
          onClick={() => act({ kind: 'check' })}
          disabled={!canCheck}
        >
          <span className="action-btn__icon">
            <Icon name="check" size={14} />
          </span>
          <span className="action-btn__th">ผ่าน</span>
        </button>

        <button className="action-btn" onClick={() => act({ kind: 'call' })} disabled={!canCall}>
          <span className="action-btn__icon">
            <Icon name="plus" size={14} />
          </span>
          <span className="action-btn__th">
            เรียก{legal && legal.callAmount > 0 ? ` ${formatChips(legal.callAmount)}` : ''}
          </span>
        </button>

        <button
          className="action-btn"
          onClick={() => act({ kind: 'raise', amount: raiseTo })}
          disabled={!canRaise}
        >
          <span className="action-btn__icon">
            <Icon name="spark" size={14} />
          </span>
          <span className="action-btn__th">
            {canRaise && legal
              ? `${legal.isOpeningBet ? 'เดิมพัน' : 'เพิ่ม'} ${formatChips(raiseTo)}`
              : 'เท'}
          </span>
        </button>
      </div>
    </div>
  )
}
