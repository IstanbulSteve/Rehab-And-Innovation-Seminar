# Movement Rehabilitation & Innovation Seminar 2026 – v2.1

This hardened v2.1 package includes:
- Homepage styling aligned to the approved visual direction
- Registration workflow
- Abstract submission workflow
- File upload support for diagrams and tables
- PostgreSQL instead of SQLite
- Docker Compose deployment
- Windows launch scripts

## Core changes in v2.1
- Database migrated to PostgreSQL
- Abstract uploads stored on disk and indexed in PostgreSQL
- Upload fields provided for Aim, Methods, and Results & Observations
- One diagram and one table per abstract section
- 800-word cap enforced server-side
- Transactional abstract insert and upload metadata persistence
- Health check endpoint at `/api/health`

## Run with Docker
1. Copy `.env.example` to `.env`
2. Optionally add SMTP settings
3. Run:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Run without Docker
Requirements:
- Node.js 20+
- PostgreSQL 16+

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` for your local PostgreSQL instance.
4. Install and run:

```bash
npm install
npm start
```

## Upload support
Allowed file classes:
- diagrams: PNG, JPG, JPEG, WEBP, GIF, PDF, DOCX
- tables: CSV, XLS, XLSX, PDF

Files are stored under `server/uploads` and metadata is stored in `abstract_uploads`.

## Windows
Use one of:
- `scripts/start-windows.bat`
- `scripts/start-windows.ps1`

Both try Docker first. The PowerShell script also supports a local Node fallback.

## Notes
- Email confirmation requires SMTP credentials.
- Docker volumes preserve PostgreSQL data across restarts.
- Replace `public/hero-crawl.png` with your final preferred hero image if needed.
