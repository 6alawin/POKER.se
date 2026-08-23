# How to run locally

## Prerequisites
- Node.js (v18 or newer)
- PostgreSQL (local install)
- Firebase project

## Setup

1. ติดตั้ง dependencies ทั้งหมดจาก root — โปรเจกต์นี้เป็น Turborepo monorepo ตัว root `package.json` จัดการทั้ง `client` และ `server` ให้พร้อมกัน ไม่ต้อง `cd` เข้าไปทีละโฟลเดอร์
```bash
npm install
```

2. ตั้งค่า environment variables — ทำทั้งใน `/client` และ `/server`
```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```
แล้วเปิดไฟล์ `.env` ที่เพิ่งสร้างทั้งสองไฟล์ กรอกค่าตามตารางด้านล่าง

3. รันทั้ง frontend และ backend พร้อมกันด้วยคำสั่งเดียวจาก root
```bash
npx turbo dev
```
Turborepo จะรัน `dev` script ของทุก package พร้อมกัน (client + server) ใน terminal เดียว — จะเห็น log ของทั้งสองฝั่งแยก prefix ชัดเจน (`client:dev:`, `server:dev:`) ถ้าสำเร็จจะเห็นทั้ง `server running on port ...` และลิงก์ของ client เช่น `http://localhost:5173`

4. เปิดลิงก์ client ในเบราว์เซอร์เพื่อดูหน้าเว็บ

> ถ้าอยากรันแค่ฝั่งเดียว (เช่น debug เฉพาะ server) ใช้ `npx turbo dev --filter=server` หรือ `npx turbo dev --filter=client`

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key สำหรับเซ็น JWT |
| `FIREBASE_API_KEY` | จาก Firebase Console > Project settings |
| `FIREBASE_PROJECT_ID` | จาก Firebase Console > Project settings |

## Troubleshooting

- **`Could not resolve workspace` / `Missing packageManager field`**: เช็คว่า root `package.json` มี field `"packageManager": "npm@<version>"` (เช็คเวอร์ชันตัวเองด้วย `npm -v`)
- **`turbo_json_parse_error`**: เช็คว่า `turbo.json` มีแค่ `$schema` และ `tasks` เท่านั้น — field อื่น ๆ (name, workspaces, devDependencies) ต้องอยู่ใน root `package.json` ไม่ใช่ `turbo.json`
- **server พังตอนรัน `dev`**: ถ้าเจอ error จาก `ts-node-dev` ให้เปลี่ยนไปใช้ `tsx watch src/index.ts` แทนใน `server/package.json`

> ติดปัญหาอะไร ทักในกลุ่มแชทได้เลย