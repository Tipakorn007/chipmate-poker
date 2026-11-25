import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Chat } from '../../hooks/useChat'
import Icon from '../ui/Icon'

export default function ChatPanel({
  chat,
  onSend,
  youName,
  youAvatar,
}: {
  chat: Chat
  onSend: (text: string) => void
  youName: string
  youAvatar: string
}) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [chat.messages.length])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) return
    chat.send(draft, youName, youAvatar)
    onSend(draft)
    setDraft('')
  }

  return (
    <div className="chat">
      <div className="chat__list" ref={listRef}>
        {chat.messages.map((message) => {
          if (message.kind === 'system') {
            return (
              <div key={message.id} className="chat__system">
                {message.text}
              </div>
            )
          }
          return (
            <div key={message.id} className={`chat__msg chat__msg--${message.kind}`}>
              <span className="chat__avatar">{message.avatar ?? '🎲'}</span>
              <div className="chat__bubble">
                <span className="chat__author">
                  {message.author}
                  <span className="chat__time">{message.time}</span>
                </span>
                <span className="chat__text">{message.text}</span>
              </div>
            </div>
          )
        })}
      </div>

      <form className="chat__form" onSubmit={submit}>
        <input
          className="input"
          value={draft}
          maxLength={160}
          placeholder="พิมพ์ข้อความ…"
          onChange={(e) => setDraft(e.target.value)}
          aria-label="ข้อความแชต"
        />
        <button className="btn btn--primary btn--icon" type="submit" aria-label="ส่งข้อความ">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  )
}
