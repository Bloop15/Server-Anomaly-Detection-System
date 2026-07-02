# Server Anomaly Detection System

## Overview

This project is a server anomaly detection system that monitors server telemetry data such as CPU usage, memory usage, and power consumption. It detects unusual behavior using machine learning and displays the results on a web dashboard. Alerts can also be sent through Telegram when an anomaly is detected.

The project is built using **React** for the frontend, **Node.js** for the backend, and **Python** for data preprocessing and anomaly detection.

---

## Features

- Detects anomalies in server telemetry data using machine learning.
- Displays CPU, memory, and power usage on a dashboard.
- Simulates real-time monitoring using CSV data.
- Sends Telegram alerts when critical anomalies are detected.
- Includes a Jupyter notebook for data analysis and model development.

---

## Technologies Used

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts

### Backend
- Node.js
- Express

### Python
- Python
- Pandas
- NumPy
- Scikit-learn
- Jupyter Notebook

---

## Project Structure

```text
Server-Anomaly-Detection/
│
├── backend/              # Node.js backend
├── frontend/             # React application
├── python/               # Python scripts and notebooks
│   ├── app/
│   ├── notebooks/
│   ├── src/
│   └── main.py
├── config/               # Configuration files
├── data/                 # Dataset
├── docs/                 # Reports and documentation
├── requirements.txt
├── .gitignore
└── README.md
```

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Server-Anomaly-Detection
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Install backend dependencies

```bash
cd ../backend
npm install
```

---

## Running the Project

### Start the Backend

```bash
cd backend
node index.js
```

### Start the Frontend

```bash
cd frontend
npm run dev
```

### Run the Python Pipeline

```bash
python python/main.py
```
---

## Dataset

The raw telemetry dataset is located in:

```text
data/raw/server_telemetry.csv
```

The processed dataset used by the dashboard is located in:

```text
frontend/public/data.csv
```

---

## Project Components

### Frontend

The frontend displays:

- CPU usage
- Memory usage
- Power consumption
- Detected anomalies
- Dashboard charts

### Backend

The Node.js backend handles:

- Telegram alerts
- API requests
- Communication with the frontend

### Python

The Python component is responsible for:

- Data preprocessing
- Feature engineering
- Model training
- Anomaly detection
- Data analysis

---

## Future Improvements

- Support live server telemetry instead of CSV files.
- Add more anomaly detection models.
- Deploy the application using Docker.
- Add user authentication.
- Connect to cloud databases for real-time monitoring.

---
