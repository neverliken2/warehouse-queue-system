# ระบบลงทะเบียนคิวรับของในโกดัง (Warehouse Queue Registration System)

ระบบจัดการคิวสำหรับการลงทะเบียนเข้ารับของในโกดัง พัฒนาด้วย Next.js, Supabase และ LINE LIFF

## คุณสมบัติหลัก

- ✅ ลงทะเบียนคิูรับของผ่าน LINE LIFF
- ✅ ระบบสร้างหมายเลขคิวอัตโนมัติ (Format: Q-YYYYMMDD-XXX)
- ✅ ตรวจสอบรายการคิวของตนเอง
- ✅ ดูรายการคิวทั้งหมด
- ✅ อัพเดทสถานะคิวแบบ Real-time
- ✅ รองรับการ Deploy บน GitHub Pages

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: LINE LIFF SDK
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## โครงสร้างโปรเจค

```
warehouse-queue-system/
├── app/
│   ├── page.tsx              # หน้าหลัก
│   ├── layout.tsx            # Layout หลัก
│   └── globals.css           # Global styles
├── components/
│   ├── QueueRegistrationForm.tsx  # ฟอร์มลงทะเบียนคิว
│   └── QueueList.tsx              # แสดงรายการคิว
├── lib/
│   ├── supabase.ts           # Supabase client และ types
│   └── liff.ts               # LINE LIFF functions
├── supabase/
│   └── schema.sql            # Database schema
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow
└── next.config.ts            # Next.js configuration
```

## การติดตั้งและใช้งาน

### 1. Clone โปรเจค

```bash
git clone <repository-url>
cd warehouse-queue-system
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` และเพิ่มค่าต่อไปนี้:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_LIFF_ID=your-line-liff-id
```

### 4. ตั้งค่า Supabase Database

1. สร้างโปรเจคใหม่ใน [Supabase](https://supabase.com)
2. ไปที่ SQL Editor และรันไฟล์ `supabase/schema.sql`
3. ตรวจสอบว่า Table `queues` ถูกสร้างแล้ว

### 5. ตั้งค่า LINE LIFF

1. สร้าง LINE Login Channel ใน [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง LIFF App และตั้งค่า:
   - **Endpoint URL**: URL ของเว็บไซต์ (เช่น `https://username.github.io/warehouse-queue-system/`)
   - **Scope**: `profile`, `openid`
   - **Bot link feature**: Optional
3. คัดลอก LIFF ID มาใส่ใน `.env.local`

### 6. รันโปรเจคในเครื่อง

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

### 7. Build และ Export

```bash
npm run build
```

ไฟล์ static จะถูกสร้างใน folder `out/`

## การ Deploy บน GitHub Pages

### ตั้งค่า GitHub Repository

1. Push โค้ดขึ้น GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

2. ไปที่ Repository Settings > Pages
3. เลือก Source: **GitHub Actions**

### ตั้งค่า Secrets

ไปที่ Repository Settings > Secrets and variables > Actions และเพิ่ม Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LIFF_ID`

### Deploy

เมื่อ push ไปที่ branch `main` GitHub Actions จะ deploy อัตโนมัติ

URL: `https://<username>.github.io/warehouse-queue-system/`

## Database Schema

### Table: queues

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key (Auto-generated) |
| queue_number | VARCHAR(20) | หมายเลขคิว (Auto-generated) |
| driver_name | VARCHAR(100) | ชื่อคนขับรถ |
| phone_number | VARCHAR(20) | เบอร์โทรศัพท์ |
| vehicle_plate | VARCHAR(20) | ทะเบียนรถ |
| company | VARCHAR(100) | บริษัท/หน่วยงาน |
| scheduled_time | TIMESTAMP | วันและเวลาที่ต้องการรับของ |
| status | VARCHAR(20) | สถานะ (pending/confirmed/in_progress/completed/cancelled) |
| created_at | TIMESTAMP | วันเวลาที่สร้าง |
| updated_at | TIMESTAMP | วันเวลาที่อัพเดท |
| line_user_id | VARCHAR(100) | LINE User ID |
| notes | TEXT | หมายเหตุ |

## การใช้งาน

### ลงทะเบียนคิว

1. เปิดแอปผ่าน LINE LIFF
2. เลือกแท็บ "ลงทะเบียนคิว"
3. กรอกข้อมูล:
   - ชื่อ-นามสกุล คนขับรถ
   - เบอร์โทรศัพท์
   - ทะเบียนรถ
   - บริษัท/หน่วยงาน
   - วันและเวลาที่ต้องการรับของ
4. กดปุ่ม "ลงทะเบียนคิว"
5. ระบบจะแสดงหมายเลขคิวที่ได้รับ

### ตรวจสอบคิว

1. เลือกแท็บ "รายการคิว"
2. เลือก "คิวของฉัน" เพื่อดูคิวของตนเอง
3. หรือเลือก "คิวทั้งหมด" เพื่อดูคิวทั้งหมดในระบบ

## สถานะคิว

- **รอยืนยัน** (pending): คิวที่เพิ่งลงทะเบียน รอการยืนยัน
- **ยืนยันแล้ว** (confirmed): คิวที่ได้รับการยืนยันแล้ว
- **กำลังดำเนินการ** (in_progress): กำลังอยู่ในขั้นตอนการรับของ
- **เสร็จสิ้น** (completed): รับของเสร็จสิ้นแล้ว
- **ยกเลิก** (cancelled): คิวถูกยกเลิก

## การแก้ไขปัญหา

### ไม่สามารถเชื่อมต่อ LINE ได้

- ตรวจสอบว่า LIFF ID ถูกต้อง
- ตรวจสอบว่า Endpoint URL ใน LIFF ตรงกับ URL ที่ deploy

### ไม่สามารถบันทึกข้อมูลลง Database ได้

- ตรวจสอบ Supabase URL และ Anon Key
- ตรวจสอบ Row Level Security (RLS) Policies ใน Supabase
- ตรวจสอบว่ารัน schema.sql แล้ว

### หน้าเว็บไม่แสดงผลบน GitHub Pages

- ตรวจสอบว่า basePath ใน `next.config.ts` ตรงกับชื่อ repository
- ตรวจสอบว่า GitHub Actions workflow รันสำเร็จ
- ตรวจสอบใน Repository Settings > Pages ว่าตั้งค่าถูกต้อง

## การพัฒนาต่อ

### เพิ่มฟีเจอร์แจ้งเตือนผ่าน LINE Messaging API

```bash
npm install @line/bot-sdk
```

### เพิ่มระบบ Admin Dashboard

สร้างหน้า Admin สำหรับจัดการคิวและอัพเดทสถานะ

### เพิ่ม Real-time Updates

ใช้ Supabase Realtime Subscriptions

```typescript
const channel = supabase
  .channel('queues-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'queues'
  }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

## License

MIT

## ผู้พัฒนา

พัฒนาโดย [Your Name]

## การสนับสนุน

หากพบปัญหาหรือต้องการเสนอแนะ กรุณาสร้าง Issue ใน GitHub Repository
