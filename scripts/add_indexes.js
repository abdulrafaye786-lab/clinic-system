require('dotenv').config();
const path = require('path');
const { query } = require(path.join(__dirname, '../src/config/db'));

async function addPerformanceIndexes() {
  try {
    console.log('Adding performance indexes for 2500+ records...');
    
    // Appointments indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_appts_date ON gclinic_appointments (appointment_date)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_appts_doc_date ON gclinic_appointments (doctor_id, appointment_date)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_appts_patient ON gclinic_appointments (patient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_appts_status ON gclinic_appointments (status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_appts_token ON gclinic_appointments (appointment_date, token_number)`);

    // Patients indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_patients_phone ON gclinic_patients (phone)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_patients_name ON gclinic_patients (full_name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_patients_created ON gclinic_patients (created_at DESC)`);

    // Invoices indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_inv_patient ON gclinic_invoices (patient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_inv_appt ON gclinic_invoices (appointment_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_inv_created ON gclinic_invoices (created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_inv_status ON gclinic_invoices (payment_status)`);

    // Patient Vitals indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_vitals_patient ON gclinic_patient_vitals (patient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_gclinic_vitals_appt ON gclinic_patient_vitals (appointment_id)`);

    console.log('All performance indexes successfully added and verified!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding indexes:', err);
    process.exit(1);
  }
}

addPerformanceIndexes();
