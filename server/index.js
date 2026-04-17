const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host: 'localhost',
      port: 5432,
      database: 'seminar_db',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    });

const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = smtpConfigured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}) : null;

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  await pool.query(schema);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`);
  }
});

const allowedMimeTypes = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '..', 'public')));

function countWords(...parts) {
  return parts
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

async function sendConfirmationEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('Email not sent. SMTP not configured. Preview:', { to, subject, text });
    return { delivered: false, reason: 'smtp_not_configured' };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject,
    html,
    text
  });
  return { delivered: true };
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, organisation, roleProfession, attendanceType, notes } = req.body;
    if (!fullName || !email || !attendanceType) {
      return res.status(400).json({ ok: false, error: 'fullName, email and attendanceType are required.' });
    }

    const result = await pool.query(
      `INSERT INTO registrations (full_name, email, organisation, role_profession, attendance_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
      [fullName, email, organisation || null, roleProfession || null, attendanceType, notes || null]
    );

    await sendConfirmationEmail({
      to: email,
      subject: 'Registration received – Movement Rehabilitation & Innovation Seminar 2026',
      text: `Thank you for registering your interest, ${fullName}. We have recorded your submission for the seminar in Bristol on 1–2 August 2026.`,
      html: `<p>Thank you for registering your interest, <strong>${fullName}</strong>.</p><p>We have recorded your submission for the Movement Rehabilitation & Innovation Seminar 2026 in Bristol on 1–2 August 2026.</p>`
    });

    res.json({ ok: true, registration: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const abstractUploadFields = upload.fields([
  { name: 'aimDiagram', maxCount: 1 },
  { name: 'aimTable', maxCount: 1 },
  { name: 'methodsDiagram', maxCount: 1 },
  { name: 'methodsTable', maxCount: 1 },
  { name: 'resultsDiagram', maxCount: 1 },
  { name: 'resultsTable', maxCount: 1 }
]);

app.post('/api/submit-abstract', abstractUploadFields, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      presenterName, email, organisation, roleProfession,
      presentationPreference, title, aimText, methodsText, resultsText,
      declarationConfirmed
    } = req.body;

    if (!presenterName || !email || !presentationPreference || !title || !aimText || !methodsText || !resultsText) {
      return res.status(400).json({ ok: false, error: 'All required abstract fields must be completed.' });
    }

    const totalWordCount = countWords(title, aimText, methodsText, resultsText);
    if (totalWordCount > 800) {
      return res.status(400).json({ ok: false, error: `Abstract exceeds 800 words (${totalWordCount}).` });
    }

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO abstract_submissions
      (presenter_name, email, organisation, role_profession, presentation_preference, title, aim_text, methods_text, results_text, total_word_count, declaration_confirmed)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, created_at`,
      [presenterName, email, organisation || null, roleProfession || null, presentationPreference, title, aimText, methodsText, resultsText, totalWordCount, declarationConfirmed === 'true' || declarationConfirmed === 'on']
    );

    const submissionId = inserted.rows[0].id;
    const files = req.files || {};
    const fileMap = {
      aimDiagram: ['aim', 'diagram'],
      aimTable: ['aim', 'table'],
      methodsDiagram: ['methods', 'diagram'],
      methodsTable: ['methods', 'table'],
      resultsDiagram: ['results', 'diagram'],
      resultsTable: ['results', 'table']
    };

    for (const [fieldName, meta] of Object.entries(fileMap)) {
      if (files[fieldName] && files[fieldName][0]) {
        const file = files[fieldName][0];
        await client.query(
          `INSERT INTO abstract_uploads
           (submission_id, section_name, upload_kind, original_filename, stored_filename, mime_type, file_size_bytes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [submissionId, meta[0], meta[1], file.originalname, file.filename, file.mimetype, file.size]
        );
      }
    }

    await client.query('COMMIT');

    await sendConfirmationEmail({
      to: email,
      subject: 'Abstract submission received – Movement Rehabilitation & Innovation Seminar 2026',
      text: `Thank you, ${presenterName}. Your abstract titled "${title}" has been received. Word count: ${totalWordCount}.`,
      html: `<p>Thank you, <strong>${presenterName}</strong>.</p><p>Your abstract titled <strong>${title}</strong> has been received.</p><p>Total word count: <strong>${totalWordCount}</strong>.</p>`
    });

    res.json({ ok: true, submission: { ...inserted.rows[0], totalWordCount } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
  res.status(500).json({ ok: false, error: 'Unexpected server error.' });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Seminar site running on port${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
