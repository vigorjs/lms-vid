# GerakBelajar

LMS video untuk pembelajaran gerakan olahraga. Student dapat membandingkan video mereka dengan video demonstrasi teacher secara sinkron, melakukan trim di browser, mengirim attempt, lalu menerima rubric, nilai, dan feedback bertimestamp.

## Stack

- Next.js 16 App Router, React 19, JavaScript/JSX, Tailwind CSS 4
- PostgreSQL + Prisma ORM 7
- JWT `HttpOnly` cookie dengan authorization berbasis role dan `authVersion`
- MinIO private bucket dengan multipart presigned upload dan playback URL
- Worker FFmpeg pada VPS untuk kompresi video 720p setelah upload
- ffmpeg.wasm untuk trim client-side
- react-easy-crop dan Canvas untuk cover course 16:9
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

6. Jika PostgreSQL terpasang di komputer, atur `WORKER_DATABASE_URL` di `.env` dengan host `host.docker.internal` (kredensial dan nama database sama seperti `DATABASE_URL`). Jalankan worker:

   ```bash
   docker compose up -d --build video-worker
   ```

   PostgreSQL container tidak perlu dinyalakan. `localhost` pada URL worker menunjuk ke container, bukan komputer. Jika URL worker diubah, buat ulang container dengan `docker compose up -d --no-deps --force-recreate video-worker`.

7. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

   Buka `http://localhost:3000`.

## Deployment Vercel dengan Supabase

Gunakan dua koneksi terpisah:

- `DATABASE_URL`: Supavisor Transaction Pooler port `6543` untuk traffic runtime Vercel. Tambahkan `pgbouncer=true`, `connection_limit=1`, `sslmode=require`, dan `uselibpqcompat=true`.
- `DIRECT_URL`: Direct connection port `5432`, atau Session Pooler port `5432` bila mesin migration tidak memiliki IPv6. URL ini hanya digunakan Prisma CLI.
- `DATABASE_POOL_MAX=1`: membatasi setiap instance serverless ke satu koneksi database.
- `DATABASE_TRANSACTION_MAX_WAIT_MS=10000`: waktu maksimum menunggu koneksi untuk transaksi.
- `DATABASE_TRANSACTION_TIMEOUT_MS=15000`: batas transaksi Prisma, termasuk nested write dan batch transaction.

Setelah mengubah environment variable di Vercel, lakukan redeploy karena deployment lama tidak mengambil nilai yang baru.

## VPS PostgreSQL, MinIO, dan worker video

`docker-compose.yml` menyediakan PostgreSQL, MinIO, dan satu worker FFmpeg. PostgreSQL container masuk profil `bundled-db`, sehingga tidak berjalan pada setup lokal yang memakai PostgreSQL host. MinIO memakai image publik Chainguard; bucket privat disiapkan oleh job Node dari image worker. Di VPS, siapkan `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `WORKER_DATABASE_URL`, serta kredensial MinIO di `.env`. `WORKER_DATABASE_URL` di VPS memakai host `postgres` di jaringan Compose; `DATABASE_URL` dan `DIRECT_URL` aplikasi Vercel memakai alamat PostgreSQL yang dapat dijangkau dari Vercel.

Di VPS tanpa Node.js terpasang, jalankan `docker compose --profile bundled-db up -d postgres minio`, lalu `docker compose --profile bundled-db run --rm migrate`, kemudian `docker compose --profile bundled-db up -d --build`. Untuk akses MinIO dari browser Vercel, jalankan juga `docker compose --profile vps-https up -d minio-https`. Caddy menerbitkan sertifikat HTTPS untuk `MINIO_HTTPS_HOST`; hostname ini harus mengarah ke IP VPS dan port 80/443 harus terbuka. Di Vercel, gunakan hostname yang sama untuk `MINIO_ENDPOINT`, `MINIO_PORT=443`, dan `MINIO_USE_SSL=true`, kemudian redeploy agar URL bertanda tangan memakai HTTPS. Caddy juga mengirim `Cross-Origin-Resource-Policy: cross-origin` agar cover dan video dari MinIO dapat dimuat pada halaman course yang memakai `Cross-Origin-Embedder-Policy: require-corp`. Worker dibatasi satu CPU dan satu GB RAM. Upload yang selesai masuk status `PROCESSING`. MP4 H.264/AAC yang sudah maksimal 720p/30 fps siap tanpa encode ulang; bila metadata MP4 belum di depan, worker hanya melakukan remux. Video lain dikompresi ke 720p/30 fps. Jika encoding gagal tiga kali, worker memakai file asli yang masih valid. Log worker mencatat waktu antrean, unduh, proses, dan unggah/finalisasi. Pantau antrean `VideoProcessingJob`, ruang disk, serta trafik MinIO. Video lama tidak dikompresi ulang.

Berkas FFmpeg untuk editor browser disalin dari `node_modules` ke `public/ffmpeg` saat instalasi, dev, dan build. Aset ini dilayani sebagai file statis, bukan melalui Vercel Function.

## Akun demo

PIN akun demo dan seluruh akun yang sudah ada adalah `696969`.

| Role | Email |
| --- | --- |
| Admin | `admin@local.test` |
| Teacher | `teacher@local.test` |
| Student | `student@local.test` |

Student dapat mendaftar lewat `/register` dengan email dan nama lengkap opsional. Setelah masuk, mereka wajib membuat PIN 6 digit sebelum membuka materi. Akun baru yang dibuat admin memakai PIN awal `696969` dan wajib menggantinya pada login pertama. Registrasi tidak memverifikasi kepemilikan email.

## Alur utama

1. Admin membuat category dan akun teacher/student.
2. Teacher membuat course dan rubric dengan total bobot 100%, lalu memilih akses `PUBLIC` atau `ASSIGNED` untuk student tertentu.
3. Teacher dapat mengatur cover course, mengupload reference video MP4, lalu menerbitkan course. Course `ASSIGNED` membutuhkan minimal satu student aktif sebelum dapat diterbitkan.
4. Student membuka course, mengupload video latihan, menunggu kompresi selesai, membandingkan kedua video, dan dapat menyimpan hasil trim sebagai versi baru setelah diproses.
5. Student mengirim draft sebagai submission yang immutable.
6. Teacher memberi skor per kriteria, keputusan lulus/revisi, feedback umum, dan komentar bertimestamp.
7. Student melihat nilai serta feedback pada halaman course.

## Kebijakan video

- Sumber MP4/MOV (termasuk video iPhone); worker mengubah video yang belum kompatibel menjadi MP4 H.264/AAC
- Hasil encode tetap digunakan walaupun lebih besar dari sumber HEVC. Jika konversi gagal, hanya sumber MP4 yang lolos pemeriksaan codec, resolusi, frame rate, dan fast-start boleh dipakai sebagai fallback; MOV/HEVC tetap berstatus gagal.
- Maksimum 100 MB dan 10 menit
- Upload menggunakan part 5 MiB secara berurutan dengan tiga percobaan per part agar lebih tahan terhadap timeout proxy
- Object disimpan privat di MinIO; database hanya menyimpan metadata/object key
- Original student tidak ditimpa saat membuat hasil trim
- Editing di atas 200 MB bersifat best-effort dan ditargetkan ke Chrome/Edge desktop
- Mode sinkron menggunakan timeline video terpendek dan koreksi drift 120 ms

## Kebijakan cover course

- Sumber berupa JPG, PNG, atau WebP maksimal 5 MB dan 20 megapiksel
- Teacher/admin melakukan crop manual 16:9; browser menghasilkan WebP 1280×720 maksimal 2 MB, dengan fallback JPEG jika diperlukan oleh browser
- Upload menggunakan presigned PUT ke `${MINIO_FOLDER}/covers/...`
- Cover bersifat opsional, dapat diganti/dihapus, dan object lama dibersihkan dari MinIO

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
- Perubahan PIN, role, atau status menaikkan `authVersion` dan membatalkan JWT lama.
- `proxy.js` hanya melakukan redirect awal; semua akses data dan mutasi mengulang authorization di DAL/action.
- Mutasi upload memeriksa origin, role, ownership, ukuran, metadata, kelengkapan setiap part, dan object MinIO setelah completion.
- Upload yang dibatalkan atau gagal setelah tiga percobaan akan menghapus sesi multipart dan menandai asset sebagai `FAILED`.
- Bucket MinIO tidak bersifat public; playback menggunakan URL bertanda tangan satu jam.
- Course lama tetap `PUBLIC`. Assignment terpisah dari enrollment, sehingga pencabutan akses tidak menghapus progress, attempt, submission, atau review student.
