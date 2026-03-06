'use strict';

// ── Threshold definitions ────────────────────────────────────────────────────
// Critical trigger values are based on the MedChart clinical contract.
// Source: Problem specification — Section 3A (Normal vs. Critical Thresholds).
const THRESHOLDS = {
  heart_rate:   { low: 50,   high: 120,  unit: 'BPM' },
  systolic_bp:  { low: 80,   high: 160,  unit: 'mmHg' },
  temperature:  { low: 35.0, high: 38.5, unit: '°C' },
};

const COLOR_NORMAL   = '#22c55e'; // green
const COLOR_CRITICAL = '#ef4444'; // red

// ── DOM refs ────────────────────────────────────────────────────────────────
const csvInput    = document.getElementById('csvInput');
const fileNameEl  = document.getElementById('fileName');
const uploadBtn   = document.getElementById('uploadBtn');
const uploadError = document.getElementById('uploadError');
const uploadArea  = document.getElementById('uploadArea');
const dashboard   = document.getElementById('dashboard');
const alertList   = document.getElementById('alertList');
const noAlerts    = document.getElementById('noAlerts');
const alertSection = document.getElementById('alertSection');

// ── Chart instances (so we can destroy/re-create on new upload) ──────────────
let charts = {};

// ── Drag-and-drop visual feedback ────────────────────────────────────────────
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

// ── File selection ────────────────────────────────────────────────────────────
csvInput.addEventListener('change', () => {
  if (csvInput.files.length) setFile(csvInput.files[0]);
});

function setFile(file) {
  // Attach to the hidden input so FormData picks it up
  const dt = new DataTransfer();
  dt.items.add(file);
  csvInput.files = dt.files;

  fileNameEl.textContent = file.name;
  uploadBtn.disabled = false;
  uploadError.textContent = '';
}

// ── Upload & render ──────────────────────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  uploadError.textContent = '';
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Analyzing…';

  const formData = new FormData();
  formData.append('csvfile', csvInput.files[0]);

  try {
    const response = await fetch('/upload', { method: 'POST', body: formData });
    const json = await response.json();

    if (!response.ok) {
      uploadError.textContent = json.error || 'Upload failed.';
      return;
    }

    renderDashboard(json.data);
  } catch (err) {
    uploadError.textContent = 'Network error: ' + err.message;
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Analyze Vitals';
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when a value is outside the critical thresholds for the given vital.
 * @param {string} vital - key in THRESHOLDS
 * @param {number} value
 */
function isCritical(vital, value) {
  const t = THRESHOLDS[vital];
  return value < t.low || value > t.high;
}

/**
 * Builds an array of Chart.js point background colours and border colours for a dataset.
 */
function buildPointColors(vital, values) {
  return values.map((v) => (isCritical(vital, v) ? COLOR_CRITICAL : COLOR_NORMAL));
}

/**
 * Builds Chart.js segment colour callbacks so each line segment reflects the
 * source data point's status.
 */
function segmentColor(vital, values) {
  return {
    borderColor: (ctx) => {
      const idx = ctx.p0DataIndex;
      const v0  = values[idx];
      const v1  = values[idx + 1];
      // If either endpoint is critical, colour the segment red
      return (isCritical(vital, v0) || isCritical(vital, v1))
        ? COLOR_CRITICAL
        : COLOR_NORMAL;
    },
  };
}

// ── Dashboard render ─────────────────────────────────────────────────────────
function renderDashboard(data) {
  // Destroy old charts if re-uploading
  Object.values(charts).forEach((c) => c.destroy());
  charts = {};

  const labels = data.map((row) => row.timestamp);

  // Build charts
  charts.hr   = buildChart('hrChart',   'Heart Rate',             labels, data.map(r => r.heart_rate),  'heart_rate');
  charts.bp   = buildChart('bpChart',   'Systolic Blood Pressure', labels, data.map(r => r.systolic_bp), 'systolic_bp');
  charts.temp = buildChart('tempChart', 'Temperature',             labels, data.map(r => r.temperature), 'temperature');

  // Build alert list
  buildAlerts(data, labels);

  dashboard.hidden = false;
  dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildChart(canvasId, label, labels, values, vital) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const pointColors = buildPointColors(vital, values);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: pointColors,
        pointBorderColor:     pointColors,
        tension: 0.3,
        fill: false,
        // Segment coloring requires Chart.js 4+
        segment: segmentColor(vital, values),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              const status = isCritical(vital, v) ? ' ⚠ CRITICAL' : ' ✓ Normal';
              return ` ${ctx.dataset.label}: ${v} ${THRESHOLDS[vital].unit}${status}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            maxTicksLimit: 12,
            font: { size: 11 },
          },
          grid: { color: '#f1f5f9' },
        },
        y: {
          ticks: { font: { size: 11 } },
          grid: { color: '#f1f5f9' },
        },
      },
    },
  });
}

function buildAlerts(data, labels) {
  alertList.innerHTML = '';

  const criticals = [];

  data.forEach((row, i) => {
    [
      ['heart_rate',  row.heart_rate,  'Heart Rate'],
      ['systolic_bp', row.systolic_bp, 'Systolic BP'],
      ['temperature', row.temperature, 'Temperature'],
    ].forEach(([vital, value, name]) => {
      if (isCritical(vital, value)) {
        criticals.push({ ts: labels[i], name, value, unit: THRESHOLDS[vital].unit });
      }
    });
  });

  if (criticals.length === 0) {
    noAlerts.hidden = false;
    alertList.hidden = true;
  } else {
    noAlerts.hidden = true;
    alertList.hidden = false;
    criticals.forEach(({ ts, name, value, unit }) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${ts}</strong> — ${name}: <strong>${value} ${unit}</strong> ⚠ CRITICAL`;
      alertList.appendChild(li);
    });
  }
}
