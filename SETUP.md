# How to run locally

## Prerequisites
- Node.js (v18 or newer)
- PostgreSQL (local install)
- Firebase project

## Setup

1. ติดตั้ง dependencies ทั้งหมดจาก root — Turborepo จะจัดการทั้ง `client` และ `server` ให้พร้อมกัน ไม่ต้อง `cd` เข้าไปทีละโฟลเดอร์
```bash
npm install
```

2. ตั้งค่า environment variables — ทำทั้งใน `/apps/client` และ `/apps/server` (ปรับ path ตามโครงสร้าง repo จริง)
```bash
cp apps/client/.env.example apps/client/.env
cp apps/server/.env.example apps/server/.env
```
แล้วเปิดไฟล์ `.env` ที่เพิ่งสร้างทั้งสองไฟล์ กรอกค่าตามตารางด้านล่าง

3. รันทั้ง frontend และ backend พร้อมกันด้วยคำสั่งเดียวจาก root
```bash
npm run dev
```
Turborepo จะรัน `dev` script ของทุก package พร้อมกัน (client + server) ใน terminal เดียว — จะเห็น log ของทั้งสองฝั่งสลับกันแสดงผล ถ้าสำเร็จจะเห็นทั้ง `server running on port ...` และลิงก์ของ client เช่น `http://localhost:5173`

4. เปิดลิงก์ client ในเบราว์เซอร์เพื่อดูหน้าเว็บ

> ถ้าอยากรันแค่ฝั่งเดียว (เช่น debug เฉพาะ server) ใช้ `turbo dev --filter=server` หรือ `turbo dev --filter=client`

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key สำหรับเซ็น JWT |
| `FIREBASE_API_KEY` | จาก Firebase Console > Project settings |
| `FIREBASE_PROJECT_ID` | จาก Firebase Console > Project settings |

> ติดปัญหาอะไร ทักในกลุ่มแชทได้เลย