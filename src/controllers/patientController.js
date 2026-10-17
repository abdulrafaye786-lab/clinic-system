const { query } = require('../config/db');

async function getPatients(req, res) {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT p.*, 
        (SELECT MAX(consultation_date) FROM consultations WHERE patient_id = p.id) as last_visit_date,
        (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id AND status != 'cancelled') as total_visits
      FROM patients p
    `;
    const params = [];

    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      sql += ` WHERE p.mrn LIKE ? OR p.full_name LIKE ? OR p.phone LIKE ? OR p.cnic LIKE ?`;
      params.push(s, s, s, s);
    }

    sql += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [patients] = await query(sql, params);
    const [countRes] = await query(`SELECT COUNT(*) as total FROM patients`);

    return res.json({
      success: true,
      data: patients,
      total: countRes[0].total
    });
  } catch (err) {
    console.error('getPatients error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patients.' });
  }
}

async function getPatientById(req, res) {
  try {
    const { id } = req.params;

    // 1. Basic details
    const [patients] = await query('SELECT * FROM patients WHERE id = ?', [id]);
    if (patients.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    const patient = patients[0];

    // If only basic patient details are requested (e.g. for Edit Patient Modal), return immediately!
    if (req.query.basic === 'true' || req.query.basic === '1') {
      return res.json({
        success: true,
        data: {
          ...patient,
          patient
        }
      });
    }

    // 2. Run vitals, appointments, consultations, and invoices in parallel
    const [
      [vitals],
      [appointments],
      [consultations],
      [invoices]
    ] = await Promise.all([
      query('SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 10', [id]),
      query(`
        SELECT a.*, d.name as doctor_name, d.specialty
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.id DESC
        LIMIT 10
      `, [id]),
      query(`
        SELECT c.*, d.name as doctor_name, d.specialty, d.qualification,
               p.id as prescription_id, p.advice, p.dietary_restrictions
        FROM consultations c
        JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN prescriptions p ON p.consultation_id = c.id
        WHERE c.patient_id = ?
        ORDER BY c.consultation_date DESC
        LIMIT 10
      `, [id]),
      query(`
        SELECT inv.*
        FROM invoices inv
        WHERE inv.patient_id = ?
        ORDER BY inv.created_at DESC
        LIMIT 10
      `, [id])
    ]);

    // Batch load child items (prescription items, invoice items) in parallel
    const prescriptionIds = consultations.map(c => c.prescription_id).filter(Boolean);
    const invoiceIds = invoices.map(inv => inv.id).filter(Boolean);

    const [
      prescriptionItemsRes,
      invoiceItemsRes
    ] = await Promise.all([
      prescriptionIds.length > 0 
        ? query(`SELECT * FROM prescription_items WHERE prescription_id IN (${prescriptionIds.join(',')})`)
        : Promise.resolve([[]]),
      invoiceIds.length > 0
        ? query(`SELECT * FROM invoice_items WHERE invoice_id IN (${invoiceIds.join(',')})`)
        : Promise.resolve([[]])
    ]);

    const prescriptionItems = prescriptionItemsRes[0] || [];
    const invoiceItems = invoiceItemsRes[0] || [];

    // Map items back to parent records in-memory
    consultations.forEach(c => {
      c.medicines = c.prescription_id 
        ? prescriptionItems.filter(item => item.prescription_id === c.prescription_id)
        : [];
    });

    invoices.forEach(inv => {
      inv.items = invoiceItems.filter(item => item.invoice_id === inv.id);
    });

    return res.json({
      success: true,
      data: {
        ...patient,
        patient,
        vitals,
        appointments,
        consultations,
        labOrders: [],
        invoices
      }
    });
  } catch (err) {
    console.error('getPatientById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patient medical profile.' });
  }
}

async function createPatient(req, res) {
  try {
    const {
      full_name, gender, dob, age, phone, cnic, email, blood_group, marital_status,
      address, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, notes
    } = req.body;

    if (!full_name || !gender || !phone) {
      return res.status(400).json({ success: false, message: 'Full name, gender and phone number are required.' });
    }

    // Auto-generate strictly continuous lifetime MRN sequence: 1, 2, 3... (never resets annually)
    const [maxRow] = await query("SELECT MAX(CAST(mrn AS INTEGER)) as max_mrn FROM patients WHERE mrn ~ '^[0-9]+$'");
    let nextNum = 1;
    if (maxRow && maxRow[0] && maxRow[0].max_mrn) {
      nextNum = Number(maxRow[0].max_mrn) + 1;
    } else {
      const [lastPatient] = await query('SELECT id FROM patients ORDER BY id DESC LIMIT 1');
      nextNum = (lastPatient.length > 0 ? lastPatient[0].id + 1 : 1);
    }
    const mrn = `${nextNum}`;

    // Calculate exact age if dob given
    let calculatedAge = parseInt(age, 10);
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        years--;
      }
      calculatedAge = Math.max(0, years);
    }
    if (isNaN(calculatedAge)) calculatedAge = 0;

    const [result] = await query(`
      INSERT INTO patients (
        mrn, full_name, gender, dob, age, phone, cnic, email, blood_group, marital_status,
        address, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mrn, full_name.trim(), gender, dob || null, calculatedAge, phone.trim(), cnic || null,
      email || null, blood_group || 'Unknown', marital_status || 'Single',
      address || null, emergency_contact_name || null, emergency_contact_phone || null,
      allergies || null, chronic_conditions || null, notes || null
    ]);

    const newPatientId = result.insertId;

    // Record audit log
    await query('INSERT INTO audit_logs (user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user ? req.user.full_name : 'Staff', 'CREATE_PATIENT', 'patients', newPatientId, `Created patient ${full_name} (${mrn})`]);

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully!',
      patientId: newPatientId,
      mrn
    });
  } catch (err) {
    console.error('createPatient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create patient record.' });
  }
}

async function updatePatient(req, res) {
  try {
    const { id } = req.params;
    const {
      full_name, gender, dob, age, phone, cnic, email, blood_group, marital_status,
      address, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions, notes
    } = req.body;

    let calculatedAge = parseInt(age, 10);
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        years--;
      }
      calculatedAge = Math.max(0, years);
    }
    if (isNaN(calculatedAge)) calculatedAge = 0;

    await query(`
      UPDATE patients SET
        full_name = ?, gender = ?, dob = ?, age = ?, phone = ?, cnic = ?, email = ?,
        blood_group = ?, marital_status = ?, address = ?, emergency_contact_name = ?,
        emergency_contact_phone = ?, allergies = ?, chronic_conditions = ?, notes = ?
      WHERE id = ?
    `, [
      full_name, gender, dob || null, calculatedAge, phone, cnic || null, email || null,
      blood_group || 'Unknown', marital_status || 'Single', address || null,
      emergency_contact_name || null, emergency_contact_phone || null,
      allergies || null, chronic_conditions || null, notes || null, id
    ]);

    return res.json({ success: true, message: 'Patient details updated successfully.' });
  } catch (err) {
    console.error('updatePatient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update patient.' });
  }
}

async function addVitals(req, res) {
  try {
    const { id } = req.params;
    const {
      appointment_id, recorded_by, systolic_bp, diastolic_bp, pulse_rate,
      temperature_f, respiratory_rate, spo2, weight_kg, height_cm,
      blood_sugar_random, blood_sugar_fasting, notes
    } = req.body;

    let bmi = null;
    if (weight_kg && height_cm && height_cm > 0) {
      const heightInM = height_cm / 100;
      bmi = parseFloat((weight_kg / (heightInM * heightInM)).toFixed(1));
    }

    const [result] = await query(`
      INSERT INTO patient_vitals (
        patient_id, appointment_id, recorded_by, systolic_bp, diastolic_bp, pulse_rate,
        temperature_f, respiratory_rate, spo2, weight_kg, height_cm, bmi,
        blood_sugar_random, blood_sugar_fasting, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, appointment_id || null, recorded_by || (req.user ? req.user.full_name : 'Staff Nurse'),
      systolic_bp || null, diastolic_bp || null, pulse_rate || null,
      temperature_f || null, respiratory_rate || null, spo2 || null,
      weight_kg || null, height_cm || null, bmi,
      blood_sugar_random || null, blood_sugar_fasting || null, notes || null
    ]);

    return res.status(201).json({ success: true, message: 'Vitals recorded successfully.', vitalsId: result.insertId });
  } catch (err) {
    console.error('addVitals error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record vitals.' });
  }
}

async function getAllVitals(req, res) {
  try {
    const { search, limit = 100 } = req.query;
    let sql = `
      SELECT v.*, p.mrn, p.full_name as patient_name, p.gender, p.age, p.phone, p.blood_group,
             d.name as doctor_name, d.specialty as doctor_specialty
      FROM patient_vitals v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN appointments a ON v.appointment_id = a.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
    `;
    const params = [];
    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      sql += ` WHERE p.full_name LIKE ? OR p.mrn LIKE ? OR p.phone LIKE ? OR v.notes LIKE ?`;
      params.push(s, s, s, s);
    }
    sql += ` ORDER BY v.recorded_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    const [vitals] = await query(sql, params);
    return res.json({ success: true, data: vitals });
  } catch (err) {
    console.error('getAllVitals error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve vitals records.' });
  }
}

async function updateVitals(req, res) {
  try {
    const { id } = req.params; // vitals ID
    const {
      systolic_bp, diastolic_bp, pulse_rate,
      temperature_f, respiratory_rate, spo2, weight_kg, height_cm,
      blood_sugar_random, blood_sugar_fasting, notes
    } = req.body;

    let bmi = null;
    if (weight_kg && height_cm && height_cm > 0) {
      const heightInM = height_cm / 100;
      bmi = parseFloat((weight_kg / (heightInM * heightInM)).toFixed(1));
    }

    await query(`
      UPDATE patient_vitals SET
        systolic_bp = ?, diastolic_bp = ?, pulse_rate = ?,
        temperature_f = ?, respiratory_rate = ?, spo2 = ?,
        weight_kg = ?, height_cm = ?, bmi = ?,
        blood_sugar_random = ?, blood_sugar_fasting = ?, notes = ?
      WHERE id = ?
    `, [
      systolic_bp || null, diastolic_bp || null, pulse_rate || null,
      temperature_f || null, respiratory_rate || null, spo2 || null,
      weight_kg || null, height_cm || null, bmi,
      blood_sugar_random || null, blood_sugar_fasting || null, notes || null,
      id
    ]);

    return res.json({ success: true, message: 'Vitals updated successfully.' });
  } catch (err) {
    console.error('updateVitals error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update vitals record.' });
  }
}

async function deletePatient(req, res) {
  try {
    const pid = parseInt(req.params.id);
    
    // Safely clean up associated records in a single round-trip
    await query(`
      DELETE FROM patient_vitals WHERE patient_id = ${pid};
      DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE patient_id = ${pid});
      DELETE FROM prescriptions WHERE patient_id = ${pid};
      DELETE FROM consultations WHERE patient_id = ${pid};
      DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id = ${pid});
      DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id = ${pid});
      DELETE FROM invoices WHERE patient_id = ${pid};
      DELETE FROM appointments WHERE patient_id = ${pid};
      DELETE FROM patients WHERE id = ${pid};
    `);

    return res.json({ success: true, message: 'Patient and associated records deleted successfully from database.' });
  } catch (err) {
    console.error('deletePatient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete patient record.' });
  }
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  addVitals,
  updateVitals,
  getAllVitals
};

