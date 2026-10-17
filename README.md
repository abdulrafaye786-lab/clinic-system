# 🏥 Dream Garden PolyClinic - Management System

A comprehensive, multi-specialty Clinic Management & Electronic Medical Records (EMR / EHR) system designed for **Dream Garden PolyClinic**.

---

## 🚀 Quick Start & How to Run

### 1. Database Configuration
The system connects to your local MySQL database:
- **Host**: `127.0.0.1` (Port: `3306`)
- **Database**: `G_clinic` (Created automatically)
- **User**: `root`
- **Password**: `HelloPak1`

### 2. Launch the Application
Open a terminal in `c:\AR_Works\G-Clinic` and run:

```bash
npm start
```

Then navigate to:
- **Clinical Management Portal**: [http://localhost:3000](http://localhost:3000)

---

## 👥 Active System User Accounts

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin / Medical Director** | `admin` | `admin123` | Full administrative control, settings & financial reports |
| **Front Desk / Reception** | `reception` | `staff123` | OPD walk-in tokens, patient registration, appointments & fee billing |

---

## 🌟 Core System Modules

1. **Executive Overview & Medical Dashboard**:
   - Real-time KPI cards (Today Appointments, Active OPD Queue, Today Revenue Collected, Available Doctors, Pharmacy Alerts, Pending Lab Orders).
   - Dynamic 7-day revenue trend & department distribution charts.
   - Live Today OPD Queue table with one-click token calling.

2. **OPD Registration & Token Queue Management**:
   - Issue walk-in tokens (`T-101`, `T-102`...) with doctor selection & automated consultation fee billing.
   - Filter queue by doctor, date, and status (`Waiting`, `In Consultation`, `Completed`, `Cancelled`).
   - Thermal POS Token Slip Generator (80mm format).

3. **Patient Registry & 360° EHR Medical Dossier**:
   - MRN generation format (`DGP-2026-XXXX`).
   - Patient 360-degree Dossier: Vitals timeline, Past Consultations, Prescriptions, Lab Investigations, and Invoices.
   - Printable Patient Medical Summary.

4. **Doctor Consultation & Electronic Prescription (E-Rx)**:
   - Live patient vitals banner (BP, Pulse, Temp, SpO2, Weight, BMI, Sugar).
   - Clinical examination findings & ICD diagnosis.
   - Multi-drug E-Prescription builder with frequency (`1-0-1`), duration, and timing presets.
   - Integrated Diagnostic Lab Ordering.
   - Printable Formal Medical Prescription (A4 layout with clinic header & doctor signature).

5. **Pharmacy & Medicine Inventory POS**:
   - Live stock tracking, batch numbers, and expiry alerts (90-day warning).
   - Fast counter POS dispensing with real-time stock deduction.
   - 80mm Thermal Pharmacy POS Receipt print format.

6. **Diagnostic Laboratory & Pathology Services**:
   - Complete investigation menu (CBC, Lipid, LFTs, RFTs, HbA1c, Thyroid, Urine R/E, Vitamin D3, Ultrasound, ECG).
   - Sample collection & test status tracking.
   - Test result entry with auto reference range comparison and flags (`Normal`, `High`, `Low`, `Abnormal`).
   - Formal Diagnostic Pathology Report (A4 layout).

7. **Billing Desk & Cashier POS**:
   - Unified invoicing for consultation fees, lab investigations, pharmacy medicines, and clinical procedures.
   - Multi-payment support (Cash, Card, Online Transfer) with partial balance tracking.
   - 80mm Thermal Receipt Slip & Standard A4 Formal Invoice print options.

8. **Financial & Operational Analytics**:
   - Date-range filtered revenue reports, doctor productivity breakdowns, and OPD demographics.

9. **Clinic Profile & Staff User Settings**:
   - Manage clinic contact info, address, tax rate, and receipt footer notes.
   - Role-based user account management.
