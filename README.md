# Chipmate — Poker Table UI (Texas Hold'em, ชิปสมมติ)

เว็บเกมโป๊กเกอร์ Texas Hold'em แบรนด์ **Chipmate** — เล่นกับบอทหรือสร้างห้องชวนเพื่อน
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

เปิด Terminal อีกหน้าต่างเพื่อรันเซิร์ฟเวอร์ห้องออนไลน์:

```bash
bun run server
```

จากนั้นเปิด `http://127.0.0.1:5173` สร้างห้อง และทดสอบลิงก์ในแท็บอื่น
ลิงก์ `127.0.0.1` ใช้ได้เฉพาะเครื่องเดียวกัน ไม่สามารถส่งให้เพื่อนต่างเครื่องใช้งานได้
โหมดบอทไม่ต้องเปิดเซิร์ฟเวอร์เกม

> Vite bind ที่ `127.0.0.1:5173`; เซิร์ฟเวอร์เกม bind ที่ `127.0.0.1:3001` โดยปริยาย

คำสั่งอื่น:

| คำสั่ง | ทำอะไร |
| --- | --- |
| `bun run dev` | dev server + hot reload |
| `bun run server` | เซิร์ฟเวอร์ห้องและเกมผ่าน WebSocket |
| `bun run build` | เช็ก type ของเว็บและเซิร์ฟเวอร์ แล้ว build เว็บไปที่ `dist/` |
| `bun run typecheck` | เช็ก type ของเว็บและเซิร์ฟเวอร์ |
| `bun test` | ทดสอบห้องออนไลน์ |
| `bun run preview` | เสิร์ฟไฟล์ที่ build แล้ว |

เซิร์ฟเวอร์เกมต้องใช้ Bun ส่วนเว็บ Vite สามารถ build ด้วย Node.js ได้

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
├── hooks/
│   ├── usePokerGame.ts      เกมบอทที่รันในเบราว์เซอร์
│   ├── useChat.ts           แชตสำหรับโหมดบอท
│   └── useToasts.ts         แจ้งเตือนเข้า/ออก/ตาถึง
│
├── components/
│   ├── table/               PokerTable, Seat, CommunityCards, PotDisplay, ActionBar,
│   │                        TableHeader, SidePanel (แชต/รายชื่อ/ห้อง), ChatPanel,
│   │                        PlayerList, RoomPanel, HandResultModal
│   └── ui/                  Logo, Icon, PlayingCard, ChipIcon, Modal, ToastStack
│
├── screens/                 HomeScreen, OnlineRoom, TableScreen
├── data/mock.ts             AVATARS, BOT_ROSTER, BLIND_PRESETS, BOT_LINES
├── lib/utils.ts             formatChips, copyText, buildInviteLink
└── styles/index.css         design tokens + CSS ทั้งหมด (ไฟล์เดียว)
server/index.ts              ห้องและเกมออนไลน์ผ่าน Bun WebSocket
```

## Design tokens

แก้ที่ `src/styles/index.css` ต้นไฟล์ — ไม่ต้องไล่แก้ component

```
--ink-900 #0c110d   พื้นหลัง
--ink-800 #172019   แผง/topbar/sidebar
--gold    #dfc58b   accent สีแชมเปญ
--mint    #a4c7a8   accent สีเขียวอ่อน
```

## ห้องออนไลน์

เจ้าของห้องแชร์ลิงก์ให้เพื่อนเปิดและกดเข้าห้อง เกมเริ่มได้เมื่อมีผู้เล่นออนไลน์อย่างน้อย 2 คน
ผู้ที่เข้าระหว่างมือจะรอจนเจ้าของห้องเริ่มมือถัดไป หากห้องเต็มจะมีข้อความแจ้ง
เซิร์ฟเวอร์เก็บสำรับและไพ่ที่ยังไม่เปิดไว้ฝั่งเซิร์ฟเวอร์ ตรวจตาและแอ็กชัน และส่งแชตให้สมาชิกในห้อง

เมื่อการเชื่อมต่อหลุด ระบบพยายามเชื่อมต่อใหม่และสำรองที่นั่ง 60 วินาที
หากถึงตาผู้เล่นที่หลุด ระบบจะหมอบให้ หากเจ้าของห้องหลุด สิทธิ์จะโอนไปให้ผู้เล่นที่ยังออนไลน์
การรีเฟรชแท็บสามารถกลับเข้าห้องเดิมได้ภายในเวลาสำรองที่นั่งโดยกดปุ่มเข้าห้องอีกครั้ง

ห้องและชิปเก็บในหน่วยความจำของเซิร์ฟเวอร์เท่านั้น จึงหายเมื่อเซิร์ฟเวอร์รีสตาร์ต
ต้องรันเซิร์ฟเวอร์เพียงหนึ่ง instance; ยังไม่มีบัญชีผู้ใช้ ฐานข้อมูล หรือประวัติถาวร
อย่าใช้กับเงินจริงหรืองานที่ต้องการความปลอดภัยระดับ production

### เผยแพร่เพื่อเล่นต่างเครื่อง

1. สร้าง Web Service แบบ Docker บน Render จาก repository นี้ โดยใช้ `Dockerfile` ที่ root
2. ตั้ง environment variable `ALLOWED_ORIGINS` เป็น URL ของเว็บ Vercel ที่อนุญาต เช่น
   `https://chipmate-poker.vercel.app` (ไม่ต้องมี `/` ท้าย URL) หลาย URL คั่นด้วยจุลภาค
   ตั้ง health check path เป็น `/health` เซิร์ฟเวอร์ใช้พอร์ตจาก `PORT` ที่บริการกำหนด
3. ในโปรเจกต์ Vercel ตั้ง `VITE_POKER_SERVER_URL` เป็น URL ของ Render โดยใช้
   `wss://` และต่อท้าย `/ws` เช่น `wss://YOUR-SERVICE.onrender.com/ws`
4. Deploy เว็บ Vercel ใหม่หลังตั้งค่าตัวแปร แล้วใช้ลิงก์จากเว็บ Vercel เชิญเพื่อน

การตั้งค่า URL และการ deploy ต้องทำในบัญชี Render และ Vercel ของเจ้าของโปรเจกต์
หากบริการพักเครื่องหรือรีสตาร์ต ห้องที่กำลังเล่นจะหายไป

## ข้อกำหนดของโปรเจกต์

- ชิปสมมติเท่านั้น — ห้ามเพิ่มระบบเงินจริง/เติมเงิน
- ห้ามคัดลอกโลโก้ ข้อความ ภาพ หรือ asset เฉพาะจาก PokerNow / Dribbble reference — ใช้เป็นแนว layout/interaction ได้เท่านั้น
- อย่ารื้อโครงสร้าง component โดยไม่จำเป็น; แก้ engine เมื่อจำเป็นจริง ๆ
