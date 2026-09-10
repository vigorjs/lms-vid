# GerakBelajar

LMS video untuk pembelajaran gerakan olahraga. Student dapat membandingkan video mereka dengan video demonstrasi teacher secara sinkron, melakukan trim di browser, mengirim attempt, lalu menerima rubric, nilai, dan feedback bertimestamp.

## Stack

- Next.js 16 App Router, React 19, JavaScript/JSX, Tailwind CSS 4
- PostgreSQL + Prisma ORM 7
- JWT `HttpOnly` cookie dengan authorization berbasis role dan `authVersion`
- MinIO private bucket dengan multipart presigned upload dan playback URL
- ffmpeg.wasm untuk trim client-side
- Vitest dan Playwright

## Menjalankan secara lokal

Prasyarat: Node.js 20.20+, PostgreSQL yang berjalan di `localhost:5432`, dan Docker Desktop untuk MinIO.

1. Salin `.env.example` menjadi `.env`, kemudian sesuaikan `DATABASE_URL` dan secret.
2. Buat database PostgreSQL kosong bernama `pjokvid`.
3. Pasang dependency:

   ```bash
   npm install --legacy-peer-deps
   ```

4. Jalankan MinIO dan siapkan private bucket/CORS:

   ```bash
   npm run minio:up
   ```

   MinIO API tersedia di `http://localhost:9000` dan console di `http://localhost:9001`.

5. Siapkan database dan akun demo:

   ```bash
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

6. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

   Buka `http://localhost:3000`.

## Deployment Vercel dengan Supabase

Gunakan dua koneksi terpisah:

- `DATABASE_URL`: Supavisor Transaction Pooler port `6543` untuk traffic runtime Vercel. Tambahkan `pgbouncer=true`, `connection_limit=1`, `sslmode=require`, dan `uselibpqcompat=true`.
- `DIRECT_URL`: Direct connection port `5432`, atau Session Pooler port `5432` bila mesin migration tidak memiliki IPv6. URL ini hanya digunakan Prisma CLI.
- `DATABASE_POOL_MAX=1`: membatasi setiap instance serverless ke satu koneksi database.

Setelah mengubah environment variable di Vercel, lakukan redeploy karena deployment lama tidak mengambil nilai yang baru.

## Akun demo

Password default mengikuti `DEMO_PASSWORD` dan bernilai `Demo123!` bila tidak diubah.

| Role | Email |
| --- | --- |
| Admin | `admin@local.test` |
| Teacher | `teacher@local.test` |
| Student | `student@local.test` |

Admin membuat seluruh akun tambahan; tidak ada registrasi publik.

## Alur utama

1. Admin membuat category dan akun teacher/student.
2. Teacher membuat course dan rubric dengan total bobot 100%.
3. Teacher mengupload reference video MP4, lalu menerbitkan course.
4. Student membuka course, mengupload video latihan, membandingkan kedua video, dan dapat menyimpan hasil trim sebagai versi baru.
5. Student mengirim draft sebagai submission yang immutable.
6. Teacher memberi skor per kriteria, keputusan lulus/revisi, feedback umum, dan komentar bertimestamp.
7. Student melihat nilai serta feedback pada halaman course.

## Kebijakan video

- MP4 dengan codec H.264/AAC
- Maksimum 100 MB dan 10 menit
- Upload menggunakan part 5 MiB secara berurutan dengan tiga percobaan per part agar lebih tahan terhadap timeout proxy
- Object disimpan privat di MinIO; database hanya menyimpan metadata/object key
- Original student tidak ditimpa saat membuat hasil trim
- Editing di atas 200 MB bersifat best-effort dan ditargetkan ke Chrome/Edge desktop
- Mode sinkron menggunakan timeline video terpendek dan koreksi drift 120 ms

## Struktur kode

- `app/`: halaman App Router dan Route Handlers
- `features/`: Server Actions serta aturan domain per fitur
- `components/video/`: uploader, player sinkron, dan editor trim
- `lib/auth/`: JWT, session cookie, DAL, dan permission
- `lib/storage/`: MinIO client/presigned URL
- `prisma/`: schema, migration, dan seed
- `infra/minio/`: inisialisasi bucket dan CORS

Route Handlers hanya menjadi boundary browser/API. Server Components dan Server Actions memanggil DAL/service langsung agar tidak menambah HTTP round trip internal.

## Verifikasi

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E membutuhkan PostgreSQL yang sudah dimigrasi/seed dan MinIO yang aktif.

## Catatan keamanan

- JWT berlaku 8 jam dan disimpan di cookie `HttpOnly`, `SameSite=Lax`, serta `Secure` pada production.
- Perubahan password, role, atau status menaikkan `authVersion` dan membatalkan JWT lama.
- `proxy.js` hanya melakukan redirect awal; semua akses data dan mutasi mengulang authorization di DAL/action.
- Mutasi upload memeriksa origin, role, ownership, ukuran, metadata, kelengkapan setiap part, dan object MinIO setelah completion.
- Upload yang dibatalkan atau gagal setelah tiga percobaan akan menghapus sesi multipart dan menandai asset sebagai `FAILED`.
- Bucket MinIO tidak bersifat public; playback menggunakan URL bertanda tangan satu jam.
