const { query } = require('../config/db');

async function getDashboardSummary(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const selectedDate = req.query.date ? req.query.date.slice(0, 10) : today;

    // Run all independent queries in parallel via Promise.all
    const [
      [aptStats],
      [patientStats],
      [revInvoices],
      [invBreakdown],
      [doctorStats],
      [pharmacyAlerts],
      [labStats],
      [bookedAppointments],
      [revenueTrend],
      [specialtyBreakdown],
      [hourlyBreakdown]
    ] = await Promise.all([
      // 1. Selected Date's Appointments Stats
      query(`
        SELECT 
          COUNT(*) as total_today,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
          SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_count,
          SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
        FROM appointments 
        WHERE appointment_date = ?
      `, [selectedDate]),

      // 2. Total Patients & New this week
      query(`
        SELECT 
          COUNT(*) as total_patients,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_this_week
        FROM patients
      `),

      // 3. Selected Date's Revenue from Invoices
      query(`
        SELECT 
          COALESCE(SUM(inv.paid_amount), 0) as total_collected,
          COALESCE(SUM(inv.total_amount), 0) as total_billed,
          COALESCE(SUM(inv.balance_due), 0) as total_receivable
        FROM invoices inv
        LEFT JOIN appointments a ON inv.appointment_id = a.id
        WHERE (DATE(inv.created_at) = ? OR a.appointment_date = ?)
      `, [selectedDate, selectedDate]),

      // 4. Breakdown of revenue by service category
      query(`
        SELECT 
          ii.item_type,
          COALESCE(SUM(ii.total_price), 0) as category_total
        FROM invoice_items ii
        JOIN invoices inv ON ii.invoice_id = inv.id
        LEFT JOIN appointments a ON inv.appointment_id = a.id
        WHERE (DATE(inv.created_at) = ? OR a.appointment_date = ?)
        GROUP BY ii.item_type
      `, [selectedDate, selectedDate]),

      // 5. Active Doctors & Staff count
      query(`
        SELECT 
          COUNT(*) as total_doctors,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_doctors
        FROM doctors
      `),

      // 6. Pharmacy Low Stock & Expiring Alerts
      query(`
        SELECT 
          SUM(CASE WHEN stock_quantity <= min_stock_alert THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as expiring_soon_count
        FROM medicines_inventory
      `),

      // 7. Lab placeholder
      Promise.resolve([[{ total_lab_orders: 0, pending_lab: 0, in_process_lab: 0, completed_lab: 0 }]]),

      // 8. Booked Appointments / Live OPD List for Selected Date
      query(`
        SELECT 
          a.id, a.token_number, a.token_display, a.priority, a.status, a.appointment_time, a.appointment_date, a.chief_complaint, a.appointment_type,
          p.id as patient_id, p.mrn, p.full_name as patient_name, p.age, p.gender, p.phone as patient_phone, p.blood_group,
          d.id as doctor_id, d.name as doctor_name, d.specialty as doctor_specialty, d.room_no, d.consultation_fee,
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
          (SELECT total_amount FROM invoices WHERE appointment_id = a.id LIMIT 1) as invoice_total,
          (SELECT paid_amount FROM invoices WHERE appointment_id = a.id LIMIT 1) as invoice_paid
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.appointment_date = ?
        ORDER BY 
          CASE 
            WHEN a.priority = 'urgent' THEN 1 
            WHEN a.status = 'in_consultation' THEN 2
            WHEN a.status = 'waiting' THEN 3
            WHEN a.status = 'scheduled' THEN 4
            WHEN a.status = 'completed' THEN 5
            ELSE 6 
          END,
          a.token_number ASC
      `, [selectedDate]),

      // 9. Past 7 Days Revenue & Patient Trend
      query(`
        SELECT 
          DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as date_key,
          DATE_FORMAT(a.appointment_date, '%b %d') as date_label,
          COUNT(DISTINCT a.id) as patient_count,
          COALESCE(SUM(inv.paid_amount), 0) as revenue
        FROM appointments a
        LEFT JOIN invoices inv ON inv.appointment_id = a.id
        GROUP BY a.appointment_date
        ORDER BY a.appointment_date ASC
        LIMIT 14
      `),

      // 10. Specialty / Department Live Breakdown
      query(`
        SELECT d.specialty, COUNT(a.id) as appt_count
        FROM doctors d
        LEFT JOIN appointments a ON a.doctor_id = d.id AND a.appointment_date = ?
        GROUP BY d.specialty
        HAVING COUNT(a.id) > 0
        ORDER BY appt_count DESC
      `, [selectedDate]),

      // 11. Hourly Queue Slot Live Breakdown
      query(`
        SELECT 
          COALESCE(a.appointment_time, '10:00 AM') as time_slot,
          COUNT(*) as patient_count
        FROM appointments a
        WHERE a.appointment_date = ?
        GROUP BY COALESCE(a.appointment_time, '10:00 AM')
        ORDER BY 1 ASC
      `, [selectedDate])
    ]);

    const opdCollected = parseFloat(revInvoices[0]?.total_collected || 0);
    const opdBilled = parseFloat(revInvoices[0]?.total_billed || 0);
    const opdReceivable = parseFloat(revInvoices[0]?.total_receivable || 0);

    const revToday = [{
      total_collected: opdCollected,
      total_billed: opdBilled,
      total_receivable: opdReceivable,
      opd_collected: opdCollected
    }];

    const revBreakdown = [...(invBreakdown || [])];

    return res.json({
      success: true,
      data: {
        todayDate: today,
        selectedDate: selectedDate,
        appointments: aptStats[0] || {},
        patients: patientStats[0] || {},
        revenue: revToday[0] || {},
        revenueBreakdown: revBreakdown || [],
        doctors: doctorStats[0] || {},
        pharmacy: pharmacyAlerts[0] || {},
        lab: labStats[0] || {},
        liveQueue: bookedAppointments || [],
        appointmentsList: bookedAppointments || [],
        revenueTrend: revenueTrend || [],
        specialtyBreakdown: specialtyBreakdown || [],
        hourlyBreakdown: hourlyBreakdown || []
      }
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate dashboard summary.' });
  }
}

module.exports = {
  getDashboardSummary
};
