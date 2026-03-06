# MedChart — Patient Vitals Dashboard

A web-based dashboard that ingests patient monitoring data (CSV) and produces an interactive dashboard visualising vital signs to enable rapid clinical assessment.

---

## Features

- **CSV Upload** — Upload any `.csv` file with columns `timestamp`, `heart_rate`, `systolic_bp`, `temperature`.
- **Interactive Charts** — Time-series line graphs (Chart.js) for Heart Rate, Systolic BP, and Temperature.
- **Critical Threshold Detection** — Data points and line segments are colour-coded:
  - 🟢 **Green** — Normal reading
  - 🔴 **Red** — Critical reading
- **Alert Panel** — Lists every critical reading with its timestamp and value.

### Threshold Reference

| Vital Sign         | Normal Range      | Critical Trigger         |
|--------------------|-------------------|--------------------------|
| Heart Rate (BPM)   | 60 – 100          | < 50 or > 120            |
| Systolic BP (mmHg) | 90 – 120          | < 80 or > 160            |
| Temperature (°C)   | 36.1 – 37.2       | < 35.0 or > 38.5         |

---

## Tech Stack

- **Backend** — Node.js + Express, Multer (file upload), csv-parse
- **Frontend** — Vanilla HTML/CSS/JavaScript + [Chart.js 4](https://www.chartjs.org/)

---

## Setup & Run

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/sachinaiml-netizen/MedChart-vitals-.git
cd MedChart-vitals-

# Install dependencies
npm install

# Start the server
npm start
```

The server starts at **http://localhost:3000** by default.  
Set the `PORT` environment variable to use a different port:
```bash
PORT=8080 npm start
```

---

## Usage

1. Open `http://localhost:3000` in your browser.
2. Click **"Choose a .csv file"** (or drag & drop) and select your CSV file.
3. Click **"Analyze Vitals"**.
4. The dashboard will display:
   - An **Alert Panel** (top) listing all critical readings.
   - Three **line charts** — Heart Rate, Systolic BP, Temperature — with critical readings highlighted in red.

### Sample CSV

A `sample.csv` file is included in the repository for quick testing:

```
timestamp,heart_rate,systolic_bp,temperature
2025-01-15 08:00,72,115,36.8
2025-01-15 08:15,75,118,36.9
...
```

---

## CSV Format

Your CSV **must** include these exact header names (order does not matter):

| Column        | Type    | Description                    |
|---------------|---------|--------------------------------|
| `timestamp`   | string  | Date/time of the measurement   |
| `heart_rate`  | number  | Heart rate in BPM              |
| `systolic_bp` | number  | Systolic blood pressure (mmHg) |
| `temperature` | number  | Body temperature in °C         |

---

## Project Structure

```
MedChart-vitals-/
├── server.js          # Express backend — file upload & CSV parsing
├── public/
│   ├── index.html     # Dashboard UI
│   ├── styles.css     # Styles
│   └── app.js         # Frontend logic & Chart.js rendering
├── sample.csv         # Sample patient data for testing
├── package.json
└── README.md
```
