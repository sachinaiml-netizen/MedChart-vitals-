'use strict';

const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Store uploaded CSV in memory (no disk writes needed)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed'));
    }
  },
});

app.use(express.static(path.join(__dirname, 'public')));

// POST /upload — accepts a CSV file and returns parsed JSON
app.post('/upload', upload.single('csvfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const records = [];
  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  parser.on('readable', () => {
    let record;
    while ((record = parser.read()) !== null) {
      records.push(record);
    }
  });

  parser.on('error', (err) => {
    return res.status(422).json({ error: 'CSV parse error: ' + err.message });
  });

  parser.on('end', () => {
    // Validate required columns exist
    if (records.length === 0) {
      return res.status(422).json({ error: 'CSV file is empty or has no data rows.' });
    }
    const required = ['timestamp', 'heart_rate', 'systolic_bp', 'temperature'];
    const missing = required.filter((col) => !(col in records[0]));
    if (missing.length > 0) {
      return res.status(422).json({ error: `Missing required columns: ${missing.join(', ')}` });
    }

    // Convert numeric fields
    const data = records.map((row) => ({
      timestamp: row.timestamp,
      heart_rate: parseFloat(row.heart_rate),
      systolic_bp: parseFloat(row.systolic_bp),
      temperature: parseFloat(row.temperature),
    }));

    return res.json({ data });
  });

  parser.write(req.file.buffer.toString('utf8'));
  parser.end();
});

// Error handler for multer
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message === 'Only .csv files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`MedChart server running at http://localhost:${PORT}`);
});

module.exports = app;
