# Chipmate — Poker Table UI (Texas Hold'em, ชิปสมมติ)

ต้นแบบเว็บเกมโป๊กเกอร์ Texas Hold'em แบรนด์ **Chipmate** — เล่นกับบอทหรือสร้างห้องชวนเพื่อน
ใช้ **ชิปสมมติเท่านั้น** ไม่มีเงินจริง ไม่มีการเติมเงิน

React 18 + TypeScript + Vite · ธีม dark premium + ทอง · ฟอนต์ IBM Plex Sans Thai / Outfit

---

## เปิดโปรเจกต์ใน VS Code

```bash
# เปิดโฟลเดอร์นี้ใน VS Code
code .

# ติดตั้ง dependencies (ครั้งแรกครั้งเดียว)
bun install

# รัน dev server → http://127.0.0.1:5173
bun run dev
```

> โปรเจกต์นี้ตั้ง `vite.config.ts` ให้ bind `127.0.0.1:5173` ไว้แล้ว

คำสั่งอื่น:

| คำสั่ง | ทำอะไร |
| --- | --- |
| `bun run dev` | dev server + hot reload |
| `bun run build` | `tsc --noEmit` แล้ว `vite build` → ออกที่ `dist/` |
| `bun run typecheck` | เช็ก type อย่างเดียว |
| `bun run preview` | เสิร์ฟไฟล์ที่ build แล้ว |

เครื่องนี้ยังไม่ได้ติดตั้ง Node.js — ใช้ **Bun** ตามด้านบน (Bun อยู่ใน PATH แล้ว)
ถ้าอยากใช้ `npm` ให้ติดตั้ง Node.js 18+ ก่อน สคริปต์ใน `package.json` ใช้ร่วมกันได้ทั้งสองตัว

### ใน VS Code

- เปิด Terminal ในตัว (`Ctrl+`` ` ``) แล้วรัน `bun run dev`
- หรือ `Ctrl+Shift+B` เพื่อรัน task **dev** ที่ตั้งไว้ใน `.vscode/tasks.json`
- กด `F5` → เลือก **"Vite: Chrome"** เพื่อเปิดเบราว์เซอร์พร้อม debug (ตั้งไว้ใน `.vscode/launch.json` แล้ว)
- เปิด Problems panel (`Ctrl+Shift+M`) จะเห็น type error จาก strict mode ทันที
- `tsconfig.json` เป็น `strict: true` แต่ปิด `noUnusedLocals` / `noUnusedParameters` ไว้

---

## โครงสร้างไฟล์

```
src/
├── main.tsx                 จุด mount React
├── App.tsx                  สลับหน้าจอ home → lobby → table
├── types.ts                 type กลางทั้งหมด (GameState, Player, Action ฯลฯ)
│
├── game/                    ← ตรรกะเกม (ไม่ผูกกับ React เลย)
│   ├── cards.ts             สร้าง/สับสำรับ
│   ├── handEval.ts          ประเมินมือ 7 ใบ → อันดับมือ
│   ├── engine.ts            createGame / startHand / applyMove / getLegalActions / showdown
│   └── bot.ts               สมองบอทแบบ heuristic
│
├── hooks/                   ← จุดต่อ backend
│   ├── usePokerGame.ts      ครอบ engine ไว้ที่เดียว (create/applyMove) → เปลี่ยนเป็น API/WS ที่นี่
│   ├── useChat.ts           แชต mock → เปลี่ยนเป็น WebSocket ที่นี่
│   └── useToasts.ts         แจ้งเตือนเข้า/ออก/ตาถึง
│
├── components/
│   ├── table/               PokerTable, Seat, CommunityCards, PotDisplay, ActionBar,
│   │                        TableHeader, SidePanel (แชต/รายชื่อ/ห้อง), ChatPanel,
│   │                        PlayerList, RoomPanel, HandResultModal
│   └── ui/                  Logo, Icon, PlayingCard, ChipIcon, Modal, ToastStack
│
├── screens/                 HomeScreen, LobbyScreen, TableScreen
├── data/mock.ts             AVATARS, BOT_ROSTER, BLIND_PRESETS, BOT_LINES
├── lib/utils.ts             formatChips, copyText, buildInviteLink
└── styles/index.css         design tokens + CSS ทั้งหมด (ไฟล์เดียว)
```

## Design tokens

แก้ที่ `src/styles/index.css` ต้นไฟล์ — ไม่ต้องไล่แก้ component

```
--ink-900 #05070d   พื้นหลัง
--ink-800 #101623   แผง/topbar/sidebar
--gold    #f5b83d   accent หลัก
--mint    #7cf0a8   ปุ่ม Raise
--amber             ปุ่ม All-in
felt: #1f8a45 → #0b4a24 (โต๊ะ)
```

## ส่วนไหน mock / ส่วนไหนพร้อมต่อ backend

| ส่วน | สถานะ |
| --- | --- |
| กติกาเกม, blinds, side pot, showdown, ประเมินมือ | **จริง** — อยู่ใน `game/` |
| บอท | **จริง (heuristic)** — `game/bot.ts` |
| ผู้เล่นหลายคนพร้อมกัน | **mock** — ทุกคนรันในเครื่องเดียว ยังไม่มี server |
| แชต | **mock** — `useChat.ts` มี timeout ตอบกลับ |
| ลิงก์ชวนเพื่อน | **mock** — `buildInviteLink` สร้าง URL ไว้ แต่ยังไม่มีห้องจริงรองรับ |
| สถิติ/Hand history | ยังไม่มี |

### วิธีต่อ backend

1. `usePokerGame.ts` — เปลี่ยน `createGame`/`applyMove` ให้ยิง API หรือส่ง event ผ่าน WebSocket
2. `game/engine.ts` — ย้ายไปรันฝั่งเซิร์ฟเวอร์เป็น reducer (pure function อยู่แล้ว ย้ายง่าย)
3. `useChat.ts` — เปลี่ยนจาก mock เป็น WebSocket
4. คง `types.ts` เป็นสัญญาข้อมูลร่วมกันระหว่าง client/server

## ข้อกำหนดของโปรเจกต์

- ชิปสมมติเท่านั้น — ห้ามเพิ่มระบบเงินจริง/เติมเงิน
- ห้ามคัดลอกโลโก้ ข้อความ ภาพ หรือ asset เฉพาะจาก PokerNow / Dribbble reference — ใช้เป็นแนว layout/interaction ได้เท่านั้น
- อย่ารื้อโครงสร้าง component โดยไม่จำเป็น; แก้ engine เมื่อจำเป็นจริง ๆ
