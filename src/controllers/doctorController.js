const { query } = require('../config/db');

function formatToAmPm(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return str;
}

async function getDoctors(req, res) {
  try {
    const { department_id, status } = req.query;
    let sql = `
      SELECT d.*, dept.name as department_name, dept.icon as department_icon,
        (SELECT COUNT(*) FROM appointments WHERE doctor_id = d.id AND appointment_date = CURDATE()) as today_appointments_count,
        (SELECT COUNT(*) FROM consultations WHERE doctor_id = d.id) as total_consultations_count
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
    `;
    const conditions = [];
    const params = [];

    if (department_id) {
      conditions.push('d.department_id = ?');
      params.push(department_id);
    }
    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY d.name ASC';

    const [doctors] = await query(sql, params);
    const [allSchedules] = await query('SELECT * FROM doctor_schedules WHERE is_active = 1 ORDER BY id ASC');
    for (let d of doctors) {
      d.start_time = formatToAmPm(d.start_time);
      d.end_time = formatToAmPm(d.end_time);
      d.schedules = allSchedules
        .filter(s => s.doctor_id === d.id)
        .map(s => ({
          ...s,
          start_time: formatToAmPm(s.start_time),
          end_time: formatToAmPm(s.end_time)
        }));
    }
    return res.json({ success: true, data: doctors });
  } catch (err) {
    console.error('getDoctors error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve doctors.' });
  }
}

async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const [doctors] = await query(`
      SELECT d.*, dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = ?
    `, [id]);

    if (doctors.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const doc = doctors[0];
    doc.start_time = formatToAmPm(doc.start_time);
    doc.end_time = formatToAmPm(doc.end_time);

    const [schedules] = await query('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY id ASC', [id]);
    const formattedSchedules = schedules.map(s => ({
      ...s,
      start_time: formatToAmPm(s.start_time),
      end_time: formatToAmPm(s.end_time)
    }));

    return res.json({ success: true, data: { ...doc, schedules: formattedSchedules } });
  } catch (err) {
    console.error('getDoctorById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve doctor details.' });
  }
}

function toMySQLTime(timeStr) {
  if (!timeStr) return '09:00:00';
  const str = timeStr.trim();
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hh = match24[1].padStart(2, '0');
    const mm = match24[2];
    const ss = match24[3] || '00';
    return `${hh}:${mm}:${ss}`;
  }
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const modifier = match12[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  }
  return '09:00:00';
}

async function getOrCreateDepartment(department_id, custom_department_name) {
  if (custom_department_name && custom_department_name.trim().length > 0) {
    const trimmed = custom_department_name.trim();
    const [existing] = await query('SELECT id FROM departments WHERE LOWER(name) = LOWER(?) LIMIT 1', [trimmed]);
    if (existing && existing.length > 0) {
      return existing[0].id;
    }
    const [res] = await query('INSERT INTO departments (name, icon) VALUES (?, ?)', [trimmed, 'fa-solid fa-hospital-user']);
    return res.insertId;
  }
  if (department_id && department_id !== 'new' && department_id !== '') {
    return department_id;
  }
  return null;
}

async function createDoctor(req, res) {
  try {
    const {
      name, specialty, department_id, custom_department_name, qualification, experience_years,
      consultation_fee, doctor_share_percent, room_no, phone, email, available_days,
      start_time, end_time, avg_consultation_time, max_daily_patients, schedules
    } = req.body;

    if (!name || !specialty || !qualification) {
      return res.status(400).json({ success: false, message: 'Name, specialty and qualification are required.' });
    }

    const resolvedDeptId = await getOrCreateDepartment(department_id, custom_department_name);

    const [result] = await query(`
      INSERT INTO doctors (
        name, specialty, department_id, qualification, experience_years,
        consultation_fee, doctor_share_percent, room_no, phone, email, available_days,
        start_time, end_time, avg_consultation_time, max_daily_patients, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      name, specialty, resolvedDeptId, qualification, experience_years || 5,
      consultation_fee || 1500.00, doctor_share_percent !== undefined ? parseFloat(doctor_share_percent) : 60.00, room_no || 'Cabin 1',
      phone || null, email || null, available_days || 'Mon,Tue,Wed,Thu,Fri,Sat',
      start_time || '09:00 AM', end_time || '03:00 PM', avg_consultation_time || 15,
      max_daily_patients || 30
    ]);

    const doctorId = result.insertId;

    // Save multiple time slots per day if provided (batched into single query)
    if (Array.isArray(schedules) && schedules.length > 0) {
      const scheduleInserts = [];
      for (let s of schedules) {
        if (s.day_of_week && s.start_time && s.end_time) {
          const startTimeSql = toMySQLTime(s.start_time);
          const endTimeSql = toMySQLTime(s.end_time);
          const slots = parseInt(s.max_slots) || 30;
          scheduleInserts.push(`INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_slots, is_active) VALUES (${doctorId}, '${s.day_of_week}', '${startTimeSql}', '${endTimeSql}', ${slots}, true);`);
        }
      }
      if (scheduleInserts.length > 0) {
        await query(scheduleInserts.join('\n'));
      }
    }

    return res.status(201).json({ success: true, message: 'Doctor profile created successfully.', doctorId, department_id: resolvedDeptId });
  } catch (err) {
    console.error('createDoctor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create doctor profile.' });
  }
}

async function updateDoctor(req, res) {
  try {
    const { id } = req.params;
    const {
      name, specialty, department_id, custom_department_name, qualification, experience_years,
      consultation_fee, doctor_share_percent, room_no, phone, email, available_days,
      start_time, end_time, avg_consultation_time, max_daily_patients, schedules
    } = req.body;

    const resolvedDeptId = await getOrCreateDepartment(department_id, custom_department_name);

    await query(`
      UPDATE doctors SET
        name = ?, specialty = ?, department_id = ?, qualification = ?, experience_years = ?,
        consultation_fee = ?, doctor_share_percent = ?, room_no = ?, phone = ?, email = ?,
        available_days = ?, start_time = ?, end_time = ?, avg_consultation_time = ?,
        max_daily_patients = ?, status = 'active'
      WHERE id = ?
    `, [
      name, specialty, resolvedDeptId, qualification, experience_years || 5,
      consultation_fee || 1500.00, doctor_share_percent !== undefined ? parseFloat(doctor_share_percent) : 60.00, room_no || 'Cabin 1',
      phone || null, email || null, available_days || 'Mon,Tue,Wed,Thu,Fri,Sat',
      start_time || '09:00 AM', end_time || '03:00 PM', avg_consultation_time || 15,
      max_daily_patients || 30, id
    ]);

    // Update schedules (multiple time slots per day)
    if (Array.isArray(schedules)) {
      await query('DELETE FROM doctor_schedules WHERE doctor_id = ?', [id]);
      for (let s of schedules) {
        if (s.day_of_week && s.start_time && s.end_time) {
          const startTimeSql = toMySQLTime(s.start_time);
          const endTimeSql = toMySQLTime(s.end_time);
          await query(`
            INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_slots, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
          `, [id, s.day_of_week, startTimeSql, endTimeSql, s.max_slots || 30]);
        }
      }
    }

    return res.json({ success: true, message: 'Doctor profile updated successfully.' });
  } catch (err) {
    console.error('updateDoctor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update doctor profile.' });
  }
}

async function getDepartments(req, res) {
  try {
    const [departments] = await query(`
      SELECT dept.*, 
        (SELECT COUNT(*) FROM doctors WHERE department_id = dept.id) as doctor_count
      FROM departments dept
      ORDER BY dept.name ASC
    `);
    return res.json({ success: true, data: departments });
  } catch (err) {
    console.error('getDepartments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve departments.' });
  }
}

async function deleteDoctor(req, res) {
  try {
    const docId = parseInt(req.params.id);
    await query(`
      DELETE FROM doctor_schedules WHERE doctor_id = ${docId};
      UPDATE appointments SET doctor_id = NULL WHERE doctor_id = ${docId};
      UPDATE consultations SET doctor_id = NULL WHERE doctor_id = ${docId};
      DELETE FROM doctors WHERE id = ${docId};
    `);
    return res.json({ success: true, message: 'Doctor profile and schedules deleted successfully from database.' });
  } catch (err) {
    console.error('deleteDoctor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete doctor.' });
  }
}

async function addDoctorSchedule(req, res) {
  try {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, room_no, max_slots } = req.body;

    if (!day_of_week || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Day of week, start time and end time are required.' });
    }

    const dayMap = {
      'mon': 'Monday', 'monday': 'Monday',
      'tue': 'Tuesday', 'tuesday': 'Tuesday',
      'wed': 'Wednesday', 'wednesday': 'Wednesday',
      'thu': 'Thursday', 'thursday': 'Thursday',
      'fri': 'Friday', 'friday': 'Friday',
      'sat': 'Saturday', 'saturday': 'Saturday',
      'sun': 'Sunday', 'sunday': 'Sunday'
    };
    const normalizedDay = dayMap[day_of_week.trim().toLowerCase()] || day_of_week.trim();
    const startTimeSql = toMySQLTime(start_time);
    const endTimeSql = toMySQLTime(end_time);

    const [result] = await query(`
      INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_slots, is_active)
      VALUES (?, ?, ?, ?, ?, true)
    `, [id, normalizedDay, startTimeSql, endTimeSql, max_slots || 30]);

    // Update doctors.available_days to ensure the new day is listed
    const [doc] = await query('SELECT available_days FROM doctors WHERE id = ?', [id]);
    if (doc.length > 0) {
      let existingDays = (doc[0].available_days || '').split(',').map(s => s.trim()).filter(Boolean);
      const shortDay = normalizedDay.slice(0, 3);
      if (!existingDays.includes(shortDay) && !existingDays.includes(normalizedDay)) {
        existingDays.push(shortDay);
        await query('UPDATE doctors SET available_days = ? WHERE id = ?', [existingDays.join(','), id]);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Roster shift on ${normalizedDay} (${start_time} - ${end_time}) added successfully.`,
      scheduleId: result.insertId
    });
  } catch (err) {
    console.error('addDoctorSchedule error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add doctor roster schedule.' });
  }
}

async function deleteDoctorSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    await query('DELETE FROM doctor_schedules WHERE id = ?', [scheduleId]);
    return res.json({ success: true, message: 'Roster shift removed successfully.' });
  } catch (err) {
    console.error('deleteDoctorSchedule error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete schedule.' });
  }
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDepartments,
  addDoctorSchedule,
  deleteDoctorSchedule
};
