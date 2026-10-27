const { query } = require('../config/db');

async function getAppointments(req, res) {
  try {
    const { date, doctor_id, status, search } = req.query;
    let sql = `
      SELECT a.*, 
        p.mrn, p.full_name as patient_name, p.gender, p.age, p.phone as patient_phone, p.blood_group,
        d.name as doctor_name, d.specialty as doctor_specialty, d.room_no, d.consultation_fee,
        v.systolic_bp, v.diastolic_bp, v.pulse_rate, v.temperature_f, v.weight_kg, v.height_cm, v.bmi, v.spo2, v.blood_sugar_random,
        inv.id as invoice_id, inv.invoice_number, inv.payment_status as invoice_payment_status, inv.total_amount as invoice_total
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN (
        SELECT DISTINCT ON (appointment_id) appointment_id, systolic_bp, diastolic_bp, pulse_rate, temperature_f, weight_kg, height_cm, bmi, spo2, blood_sugar_random
        FROM patient_vitals
        ORDER BY appointment_id, recorded_at DESC
      ) v ON v.appointment_id = a.id
      LEFT JOIN (
        SELECT DISTINCT ON (appointment_id) id, appointment_id, invoice_number, payment_status, total_amount
        FROM invoices
        ORDER BY appointment_id, id DESC
      ) inv ON inv.appointment_id = a.id
    `;
    const conditions = [];
    const params = [];

    if (date) {
      conditions.push('a.appointment_date = ?');
      params.push(date);
    }
    if (doctor_id) {
      conditions.push('a.doctor_id = ?');
      params.push(doctor_id);
    }
    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      conditions.push('(p.full_name LIKE ? OR p.mrn LIKE ? OR p.phone LIKE ? OR a.token_display LIKE ?)');
      params.push(s, s, s, s);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY a.appointment_date DESC, a.token_number ASC';

    const [appointments] = await query(sql, params);
    return res.json({ success: true, data: appointments });
  } catch (err) {
    console.error('getAppointments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve appointments.' });
  }
}

async function getAppointmentById(req, res) {
  try {
    const { id } = req.params;
    const [appointments] = await query(`
      SELECT a.*, 
        p.mrn, p.full_name as patient_name, p.gender, p.age, p.phone as patient_phone, p.blood_group,
        d.name as doctor_name, d.specialty as doctor_specialty, d.room_no, d.consultation_fee,
        (SELECT systolic_bp FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as systolic_bp,
        (SELECT diastolic_bp FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as diastolic_bp,
        (SELECT pulse_rate FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as pulse_rate,
        (SELECT temperature_f FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as temperature_f,
        (SELECT weight_kg FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as weight_kg,
        (SELECT height_cm FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as height_cm,
        (SELECT bmi FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as bmi,
        (SELECT spo2 FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as spo2,
        (SELECT blood_sugar_random FROM patient_vitals WHERE appointment_id = a.id OR patient_id = p.id ORDER BY recorded_at DESC LIMIT 1) as blood_sugar_random,
        (SELECT id FROM invoices WHERE appointment_id = a.id LIMIT 1) as invoice_id,
        (SELECT invoice_number FROM invoices WHERE appointment_id = a.id LIMIT 1) as invoice_number,
        (SELECT payment_status FROM invoices WHERE appointment_id = a.id LIMIT 1) as invoice_payment_status,
        (SELECT total_amount FROM invoices WHERE appointment_id = a.id LIMIT 1) as invoice_total
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `, [id]);

    if (appointments.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    return res.json({ success: true, data: appointments[0] });
  } catch (err) {
    console.error('getAppointmentById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve appointment details.' });
  }
}

async function getTodayQueue(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { doctor_id } = req.query;

    let sql = `
      SELECT a.*, 
        p.mrn, p.full_name as patient_name, p.gender, p.age, p.phone as patient_phone, p.blood_group,
        d.name as doctor_name, d.specialty as doctor_specialty, d.room_no, d.consultation_fee,
        v.systolic_bp, v.diastolic_bp, v.pulse_rate, v.temperature_f, v.weight_kg, v.height_cm, v.bmi, v.spo2, v.blood_sugar_random,
        inv.id as invoice_id, inv.invoice_number, inv.payment_status as invoice_payment_status, inv.total_amount as invoice_total
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN (
        SELECT DISTINCT ON (appointment_id) appointment_id, systolic_bp, diastolic_bp, pulse_rate, temperature_f, weight_kg, height_cm, bmi, spo2, blood_sugar_random
        FROM patient_vitals
        ORDER BY appointment_id, recorded_at DESC
      ) v ON v.appointment_id = a.id
      LEFT JOIN (
        SELECT DISTINCT ON (appointment_id) id, appointment_id, invoice_number, payment_status, total_amount
        FROM invoices
        ORDER BY appointment_id, id DESC
      ) inv ON inv.appointment_id = a.id
      WHERE a.appointment_date = ?
    `;
    const params = [today];

    if (doctor_id) {
      sql += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }

    sql += `
      ORDER BY 
        CASE 
          WHEN a.priority = 'urgent' THEN 1 
          WHEN a.status = 'in_consultation' THEN 2 
          WHEN a.status = 'waiting' THEN 3 
          ELSE 4 
        END,
        a.token_number ASC
    `;

    const [queue] = await query(sql, params);
    return res.json({ success: true, data: queue });
  } catch (err) {
    console.error('getTodayQueue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve queue.' });
  }
}

async function getTodayQueueCount(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await query(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE appointment_date = ? 
        AND status IN ('waiting', 'in_consultation', 'scheduled')
    `, [today]);
    return res.json({ success: true, count: parseInt(rows[0]?.count || 0) });
  } catch (err) {
    return res.json({ success: true, count: 0 });
  }
}

async function createAppointment(req, res) {
  try {
    const {
      patient_id, doctor_id, appointment_date, appointment_time,
      appointment_type, priority, chief_complaint, create_invoice, status: customStatus
    } = req.body;

    if (!patient_id || !doctor_id) {
      return res.status(400).json({ success: false, message: 'Patient and Doctor selection are required.' });
    }

    const appDate = appointment_date || new Date().toISOString().slice(0, 10);
    const initialStatus = customStatus || 'scheduled';

    // Prevent duplicate active appointment for the same doctor on the same day
    const [existingDoctorAppt] = await query(`
      SELECT id, token_display, status
      FROM appointments
      WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ?
        AND status IN ('scheduled', 'waiting', 'in_consultation')
      LIMIT 1
    `, [patient_id, doctor_id, appDate]);

    if (existingDoctorAppt && existingDoctorAppt.length > 0) {
      return res.status(400).json({
        success: false,
        message: `This patient already has an active appointment (${existingDoctorAppt[0].token_display}) with this doctor today. Only one active appointment per doctor can be proceeded.`
      });
    }

    // 1. Fetch token and doctor fee in parallel
    const [
      [tokenRes],
      [doctorRows]
    ] = await Promise.all([
      query(`
        SELECT MAX(token_number) as max_token 
        FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ?
      `, [doctor_id, appDate]),
      create_invoice 
        ? query('SELECT name, consultation_fee FROM doctors WHERE id = ?', [doctor_id])
        : Promise.resolve([[]])
    ]);

    const nextTokenNum = (tokenRes[0]?.max_token || 100) + 1;
    const tokenDisplay = `T-${nextTokenNum}`;

    // Unique appointment code
    const appCode = `APT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const [result] = await query(`
      INSERT INTO appointments (
        appointment_code, token_number, token_display, patient_id, doctor_id,
        appointment_date, appointment_time, appointment_type, priority, status, chief_complaint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appCode, nextTokenNum, tokenDisplay, patient_id, doctor_id,
      appDate, appointment_time || '10:00 AM', appointment_type || 'walk_in',
      priority || 'normal', initialStatus, chief_complaint || 'General Checkup'
    ]);

    const appointmentId = result.insertId;

    // Create consultation invoice if requested
    let invoiceId = null;
    if (create_invoice && doctorRows.length > 0) {
      const fee = parseFloat(doctorRows[0].consultation_fee) || 1500;
      const invNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const cashierName = req.user ? req.user.full_name : 'Receptionist';

      const [invRes] = await query(`
        INSERT INTO invoices (
          invoice_number, patient_id, appointment_id, subtotal, discount_amount,
          tax_amount, total_amount, paid_amount, balance_due, payment_status, payment_method, cashier_name, notes
        ) VALUES (?, ?, ?, ?, 0.00, 0.00, ?, ?, 0.00, 'paid', 'cash', ?, ?)
      `, [
        invNumber, patient_id, appointmentId, fee, fee, fee,
        cashierName,
        `Consultation fee for ${doctorRows[0].name}`
      ]);
      invoiceId = invRes.insertId;

      // Insert invoice item and payment in a single query trip
      const payNumber = `PAY-${Date.now().toString().slice(-6)}`;
      await query(`
        INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, quantity, unit_price, total_price)
        VALUES (${invoiceId}, 'consultation', ${doctor_id}, 'OPD Consultation - ${doctorRows[0].name.replace(/'/g, "''")}', 1, ${fee}, ${fee});
        INSERT INTO payments (invoice_id, patient_id, payment_number, amount, payment_method, collected_by, notes)
        VALUES (${invoiceId}, ${patient_id}, '${payNumber}', ${fee}, 'cash', '${cashierName.replace(/'/g, "''")}', 'Consultation fee settled at token counter');
      `);
    }

    return res.status(201).json({
      success: true,
      message: 'Token issued successfully!',
      appointmentId,
      tokenNumber: nextTokenNum,
      tokenDisplay,
      appointmentCode: appCode,
      invoiceId
    });
  } catch (err) {
    console.error('createAppointment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to issue appointment token.' });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show', 'checked_out'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment status.' });
    }

    // Check same-doctor concurrency rule when proceeding to waiting or in_consultation
    if (['waiting', 'in_consultation'].includes(status)) {
      const [currentAppts] = await query('SELECT patient_id, doctor_id, appointment_date FROM appointments WHERE id = ?', [id]);
      if (currentAppts.length > 0) {
        const { patient_id, doctor_id, appointment_date } = currentAppts[0];
        const [conflictAppt] = await query(`
          SELECT a.id, a.token_display, a.status, d.name as doctor_name
          FROM appointments a
          JOIN doctors d ON a.doctor_id = d.id
          WHERE a.patient_id = ? AND a.doctor_id = ? AND a.id != ?
            AND a.appointment_date = ?
            AND a.status IN ('waiting', 'in_consultation')
          LIMIT 1
        `, [patient_id, doctor_id, id, appointment_date]);

        if (conflictAppt && conflictAppt.length > 0) {
          const docName = conflictAppt[0].doctor_name || 'this doctor';
          return res.status(400).json({
            success: false,
            message: `Only 1 appointment with ${docName} can be proceeded at a time. Token ${conflictAppt[0].token_display} is currently ${conflictAppt[0].status}. Please complete it before proceeding another appointment with this doctor.`
          });
        }
      }
    }

    let extraSet = '';
    if (status === 'waiting') {
      extraSet = ', checked_in_at = NOW()';
    } else if (status === 'in_consultation') {
      extraSet = ', started_at = NOW()';
    } else if (status === 'completed') {
      extraSet = ', completed_at = NOW()';
    } else if (status === 'checked_out') {
      extraSet = ', checked_out_at = NOW()';
    }

    await query(`UPDATE appointments SET status = ? ${extraSet} WHERE id = ?`, [status, id]);
    return res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (err) {
    console.error('updateStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update appointment status.' });
  }
}

async function callPatient(req, res) {
  try {
    const { id } = req.params;

    // Check same-doctor concurrency rule when calling to in_consultation
    const [currentAppts] = await query('SELECT patient_id, doctor_id, appointment_date FROM appointments WHERE id = ?', [id]);
    if (currentAppts.length > 0) {
      const { patient_id, doctor_id, appointment_date } = currentAppts[0];
      const [conflictAppt] = await query(`
        SELECT a.id, a.token_display, a.status, d.name as doctor_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = ? AND a.doctor_id = ? AND a.id != ?
          AND a.appointment_date = ?
          AND a.status IN ('waiting', 'in_consultation')
        LIMIT 1
      `, [patient_id, doctor_id, id, appointment_date]);

      if (conflictAppt && conflictAppt.length > 0) {
        const docName = conflictAppt[0].doctor_name || 'this doctor';
        return res.status(400).json({
          success: false,
          message: `Only 1 appointment with ${docName} can be proceeded at a time. Token ${conflictAppt[0].token_display} is currently ${conflictAppt[0].status}. Please complete it first.`
        });
      }
    }

    await query('UPDATE appointments SET called_at = NOW(), status = "in_consultation" WHERE id = ?', [id]);

    const [details] = await query(`
      SELECT a.token_display, p.full_name as patient_name, d.name as doctor_name, d.room_no
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `, [id]);

    return res.json({
      success: true,
      message: 'Token called for consultation.',
      callInfo: details[0] || {}
    });
  } catch (err) {
    console.error('callPatient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to call patient.' });
  }
}

async function checkInPatient(req, res) {
  try {
    const { id } = req.params;
    const {
      systolic_bp, diastolic_bp, pulse_rate, temperature_f,
      respiratory_rate, spo2, weight_kg, height_cm,
      blood_sugar_random, blood_sugar_fasting, notes
    } = req.body || {};

    const [appts] = await query('SELECT patient_id, doctor_id, appointment_date FROM appointments WHERE id = ?', [id]);
    if (appts.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    const { patient_id, doctor_id } = appts[0];
    if (!patient_id || !doctor_id) {
      return res.status(400).json({ success: false, message: 'Invalid appointment patient or doctor link.' });
    }

    // Helper to sanitize numeric inputs from empty strings / undefined to null or valid numbers
    const parseNumOrNull = (val, isFloat = false) => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      if (s === '') return null;
      const parsed = isFloat ? parseFloat(s) : parseInt(s, 10);
      return isNaN(parsed) ? null : parsed;
    };

    const cleanSys = parseNumOrNull(systolic_bp);
    const cleanDia = parseNumOrNull(diastolic_bp);
    const cleanPulse = parseNumOrNull(pulse_rate);
    const cleanTemp = parseNumOrNull(temperature_f, true);
    const cleanResp = parseNumOrNull(respiratory_rate);
    const cleanSpo2 = parseNumOrNull(spo2);
    const cleanWeight = parseNumOrNull(weight_kg, true);
    const cleanHeight = parseNumOrNull(height_cm, true);
    const cleanSugarRandom = parseNumOrNull(blood_sugar_random, true);
    const cleanSugarFasting = parseNumOrNull(blood_sugar_fasting, true);
    const cleanNotes = notes && String(notes).trim() !== '' ? String(notes).trim() : null;

    // Update appointment status to waiting and record check in timestamp
    await query("UPDATE appointments SET status = 'waiting', checked_in_at = NOW() WHERE id = ?", [id]);

    let bmi = null;
    if (cleanWeight && cleanHeight && cleanHeight > 0) {
      const heightInM = cleanHeight / 100;
      bmi = parseFloat((cleanWeight / (heightInM * heightInM)).toFixed(1));
    }

    // Insert or Update (Replace) vitals record for this appointment if any vitals data provided
    const hasVitals = cleanSys !== null || cleanDia !== null || cleanPulse !== null ||
                      cleanTemp !== null || cleanSpo2 !== null || cleanWeight !== null ||
                      cleanHeight !== null || cleanSugarRandom !== null || cleanNotes !== null;

    if (hasVitals) {
      const [existingVitals] = await query('SELECT id FROM patient_vitals WHERE appointment_id = ? ORDER BY id DESC LIMIT 1', [id]);
      if (existingVitals.length > 0) {
        await query(`
          UPDATE patient_vitals SET
            systolic_bp = ?, diastolic_bp = ?, pulse_rate = ?, temperature_f = ?,
            respiratory_rate = ?, spo2 = ?, weight_kg = ?, height_cm = ?, bmi = ?,
            blood_sugar_random = ?, blood_sugar_fasting = ?, notes = ?,
            recorded_by = ?, recorded_at = NOW()
          WHERE id = ?
        `, [
          cleanSys, cleanDia, cleanPulse,
          cleanTemp, cleanResp, cleanSpo2,
          cleanWeight, cleanHeight, bmi,
          cleanSugarRandom, cleanSugarFasting, cleanNotes,
          req.user ? req.user.full_name : 'Receptionist',
          existingVitals[0].id
        ]);
      } else {
        await query(`
          INSERT INTO patient_vitals (
            patient_id, appointment_id, recorded_by, systolic_bp, diastolic_bp, pulse_rate,
            temperature_f, respiratory_rate, spo2, weight_kg, height_cm, bmi,
            blood_sugar_random, blood_sugar_fasting, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          patient_id, id, req.user ? req.user.full_name : 'Receptionist',
          cleanSys, cleanDia, cleanPulse,
          cleanTemp, cleanResp, cleanSpo2,
          cleanWeight, cleanHeight, bmi,
          cleanSugarRandom, cleanSugarFasting, cleanNotes
        ]);
      }
    }

    return res.json({
      success: true,
      message: 'Patient checked in successfully!'
    });
  } catch (err) {
    console.error('checkInPatient error:', err);
    return res.status(500).json({ success: false, message: err && err.message ? `Failed to check in patient: ${err.message}` : 'Failed to check in patient.' });
  }
}

async function updateAppointment(req, res) {
  try {
    const { id } = req.params;
    const {
      patient_id, doctor_id, appointment_date, appointment_time,
      appointment_type, priority, chief_complaint, status
    } = req.body;

    const [appts] = await query('SELECT * FROM appointments WHERE id = ?', [id]);
    if (appts.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    await query(`
      UPDATE appointments SET
        patient_id = ?, doctor_id = ?, appointment_date = ?, appointment_time = ?,
        appointment_type = ?, priority = ?, chief_complaint = ?, status = ?
      WHERE id = ?
    `, [
      patient_id || appts[0].patient_id,
      doctor_id || appts[0].doctor_id,
      appointment_date || appts[0].appointment_date,
      appointment_time || appts[0].appointment_time,
      appointment_type || appts[0].appointment_type,
      priority || appts[0].priority,
      chief_complaint || appts[0].chief_complaint,
      status || appts[0].status,
      id
    ]);

    return res.json({ success: true, message: 'Appointment details updated successfully.' });
  } catch (err) {
    console.error('updateAppointment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update appointment details.' });
  }
}

async function deleteAppointment(req, res) {
  try {
    const { id } = req.params;
    await query(`
      DELETE FROM patient_vitals WHERE appointment_id = ${parseInt(id)};
      UPDATE invoices SET appointment_id = NULL WHERE appointment_id = ${parseInt(id)};
      DELETE FROM appointments WHERE id = ${parseInt(id)};
    `);
    return res.json({ success: true, message: 'Appointment deleted successfully from database.' });
  } catch (err) {
    console.error('deleteAppointment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete appointment.' });
  }
}

module.exports = {
  getAppointments,
  getAppointmentById,
  getTodayQueue,
  getTodayQueueCount,
  createAppointment,
  updateAppointment,
  updateStatus,
  callPatient,
  checkInPatient,
  deleteAppointment
};
