const { query } = require('../config/db');

async function getConsultations(req, res) {
  try {
    const { patient_id, doctor_id, date, search } = req.query;
    let sql = `
      SELECT c.*, 
        p.mrn, p.full_name as patient_name, p.gender, p.age, p.phone as patient_phone,
        d.name as doctor_name, d.specialty as doctor_specialty, d.qualification as doctor_qualification
      FROM consultations c
      JOIN patients p ON c.patient_id = p.id
      JOIN doctors d ON c.doctor_id = d.id
    `;
    const conditions = [];
    const params = [];

    if (patient_id) {
      conditions.push('c.patient_id = ?');
      params.push(patient_id);
    }
    if (doctor_id) {
      conditions.push('c.doctor_id = ?');
      params.push(doctor_id);
    }
    if (date) {
      conditions.push('DATE(c.consultation_date) = ?');
      params.push(date);
    }
    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      conditions.push('(p.full_name LIKE ? OR p.mrn LIKE ? OR c.diagnosis LIKE ?)');
      params.push(s, s, s);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.consultation_date DESC LIMIT 50';

    const [consultations] = await query(sql, params);
    return res.json({ success: true, data: consultations });
  } catch (err) {
    console.error('getConsultations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve consultations.' });
  }
}

async function getConsultationById(req, res) {
  try {
    const { id } = req.params;

    const [consultations] = await query(`
      SELECT c.*, 
        p.mrn, p.full_name as patient_name, p.gender, p.age, p.phone as patient_phone, p.blood_group, p.allergies, p.chronic_conditions,
        d.name as doctor_name, d.specialty as doctor_specialty, d.qualification as doctor_qualification, d.room_no,
        pr.id as prescription_id, pr.advice, pr.dietary_restrictions
      FROM consultations c
      JOIN patients p ON c.patient_id = p.id
      JOIN doctors d ON c.doctor_id = d.id
      LEFT JOIN prescriptions pr ON pr.consultation_id = c.id
      WHERE c.id = ?
    `, [id]);

    if (consultations.length === 0) {
      return res.status(404).json({ success: false, message: 'Consultation record not found.' });
    }

    const con = consultations[0];

    // Prescription medicines
    if (con.prescription_id) {
      const [items] = await query('SELECT * FROM prescription_items WHERE prescription_id = ?', [con.prescription_id]);
      con.medicines = items;
    } else {
      con.medicines = [];
    }

    con.labOrders = [];

    // Clinic Info
    const [clinic] = await query('SELECT * FROM clinic_settings LIMIT 1');
    con.clinic = clinic[0] || {};

    return res.json({ success: true, data: con });
  } catch (err) {
    console.error('getConsultationById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve consultation details.' });
  }
}

async function createConsultation(req, res) {
  try {
    const {
      appointment_id, patient_id, doctor_id,
      chief_complaint, history_present_illness, examination_findings,
      diagnosis, icd_code, clinical_notes, follow_up_date, follow_up_instructions,
      prescription, lab_test_ids
    } = req.body;

    if (!patient_id || !doctor_id || !diagnosis || !chief_complaint) {
      return res.status(400).json({ success: false, message: 'Patient, Doctor, Chief Complaint and Diagnosis are required.' });
    }

    // 1. Insert Consultation Record
    const [cRes] = await query(`
      INSERT INTO consultations (
        appointment_id, patient_id, doctor_id, chief_complaint, history_present_illness,
        examination_findings, diagnosis, icd_code, clinical_notes, follow_up_date,
        follow_up_instructions, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `, [
      appointment_id || null, patient_id, doctor_id, chief_complaint,
      history_present_illness || null, examination_findings || null,
      diagnosis, icd_code || null, clinical_notes || null,
      follow_up_date || null, follow_up_instructions || null
    ]);

    const consultationId = cRes.insertId;

    // 2. Mark Appointment as completed if provided
    if (appointment_id) {
      await query('UPDATE appointments SET status = "completed", completed_at = NOW() WHERE id = ?', [appointment_id]);
    }

    // 3. Save Prescription if medicines or advice provided
    let prescriptionId = null;
    if (prescription && (prescription.medicines?.length > 0 || prescription.advice || prescription.dietary_restrictions)) {
      const [pRes] = await query(`
        INSERT INTO prescriptions (consultation_id, patient_id, doctor_id, advice, dietary_restrictions)
        VALUES (?, ?, ?, ?, ?)
      `, [
        consultationId, patient_id, doctor_id,
        prescription.advice || null, prescription.dietary_restrictions || null
      ]);

      prescriptionId = pRes.insertId;

      if (Array.isArray(prescription.medicines)) {
        for (let med of prescription.medicines) {
          if (med.medicine_name && med.medicine_name.trim().length > 0) {
            await query(`
              INSERT INTO prescription_items (
                prescription_id, medicine_name, generic_name, dosage_form, strength,
                dosage, frequency, duration, instruction, route, special_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              prescriptionId, med.medicine_name.trim(), med.generic_name || null,
              med.dosage_form || 'Tablet', med.strength || '500mg',
              med.dosage || '1 unit', med.frequency || '1-0-1',
              med.duration || '5 Days', med.instruction || 'After Meal',
              med.route || 'Oral', med.special_notes || null
            ]);
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Consultation & E-Prescription saved successfully!',
      consultationId,
      prescriptionId
    });
  } catch (err) {
    console.error('createConsultation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record medical consultation.' });
  }
}

async function updateConsultation(req, res) {
  try {
    const { id } = req.params;
    const {
      chief_complaint, history_present_illness, examination_findings,
      diagnosis, icd_code, clinical_notes, follow_up_date, follow_up_instructions,
      prescription
    } = req.body;

    if (!chief_complaint || !diagnosis) {
      return res.status(400).json({ success: false, message: 'Chief Complaint and Diagnosis are required.' });
    }

    const [existing] = await query('SELECT * FROM consultations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Consultation record not found.' });
    }

    const con = existing[0];

    await query(`
      UPDATE consultations SET
        chief_complaint = ?,
        history_present_illness = ?,
        examination_findings = ?,
        diagnosis = ?,
        icd_code = ?,
        clinical_notes = ?,
        follow_up_date = ?,
        follow_up_instructions = ?
      WHERE id = ?
    `, [
      chief_complaint,
      history_present_illness || null,
      examination_findings || null,
      diagnosis,
      icd_code || null,
      clinical_notes || null,
      follow_up_date || null,
      follow_up_instructions || null,
      id
    ]);

    // Update prescription if provided
    if (prescription) {
      const [existingRx] = await query('SELECT id FROM prescriptions WHERE consultation_id = ?', [id]);
      let rxId = null;

      if (existingRx.length > 0) {
        rxId = existingRx[0].id;
        await query(`
          UPDATE prescriptions SET
            advice = ?,
            dietary_restrictions = ?
          WHERE id = ?
        `, [prescription.advice || null, prescription.dietary_restrictions || null, rxId]);
      } else if (prescription.medicines?.length > 0 || prescription.advice || prescription.dietary_restrictions) {
        const [rxRes] = await query(`
          INSERT INTO prescriptions (consultation_id, patient_id, doctor_id, advice, dietary_restrictions)
          VALUES (?, ?, ?, ?, ?)
        `, [id, con.patient_id, con.doctor_id, prescription.advice || null, prescription.dietary_restrictions || null]);
        rxId = rxRes.insertId;
      }

      if (rxId && Array.isArray(prescription.medicines)) {
        await query('DELETE FROM prescription_items WHERE prescription_id = ?', [rxId]);
        for (let med of prescription.medicines) {
          if (med.medicine_name && med.medicine_name.trim().length > 0) {
            await query(`
              INSERT INTO prescription_items (
                prescription_id, medicine_name, generic_name, dosage_form, strength,
                dosage, frequency, duration, instruction, route, special_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              rxId, med.medicine_name.trim(), med.generic_name || null,
              med.dosage_form || 'Tablet', med.strength || '500mg',
              med.dosage || '1 unit', med.frequency || '1-0-1',
              med.duration || '5 Days', med.instruction || 'After Meal',
              med.route || 'Oral', med.special_notes || null
            ]);
          }
        }
      }
    }

    return res.json({ success: true, message: 'Consultation & prescription updated successfully!' });
  } catch (err) {
    console.error('updateConsultation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update consultation record.' });
  }
}

async function deleteConsultation(req, res) {
  try {
    const { id } = req.params;
    
    // Delete prescription items & prescription
    const [prescriptions] = await query('SELECT id FROM prescriptions WHERE consultation_id = ?', [id]);
    for (let p of prescriptions) {
      await query('DELETE FROM prescription_items WHERE prescription_id = ?', [p.id]);
    }
    await query('DELETE FROM prescriptions WHERE consultation_id = ?', [id]);

    // Delete consultation
    await query('DELETE FROM consultations WHERE id = ?', [id]);

    return res.json({ success: true, message: 'Consultation record deleted successfully from database.' });
  } catch (err) {
    console.error('deleteConsultation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete consultation.' });
  }
}

module.exports = {
  getConsultations,
  getConsultationById,
  createConsultation,
  updateConsultation,
  deleteConsultation
};

