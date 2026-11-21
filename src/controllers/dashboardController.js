const { query } = require('../config/db');

async function getDashboardSummary(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const selectedDate = req.query.date ? req.query.date.slice(0, 10) : today;

    // Single ultra-fast consolidated query to Supabase: executes in 1 round trip (~800ms)
    // instead of 10 sequential round trips (~8000ms), preventing Serverless/WAF timeouts
    const consolidatedSql = `
      SELECT
        -- 1. Appointment KPIs
        (SELECT json_build_object(
          'total_today', COUNT(*),
          'scheduled_count', COALESCE(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END), 0),
          'waiting_count', COALESCE(SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END), 0),
          'in_consultation_count', COALESCE(SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END), 0),
          'completed_count', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
          'cancelled_count', COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0)
        ) FROM gclinic_appointments WHERE appointment_date = '${selectedDate}') as appointments,

        -- 2. Patient KPIs
        (SELECT json_build_object(
          'total_patients', COUNT(*),
          'new_this_week', COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0)
        ) FROM gclinic_patients) as patients,

        -- 3. Revenue KPIs
        (SELECT json_build_object(
          'total_collected', COALESCE(SUM(inv.paid_amount), 0),
          'total_billed', COALESCE(SUM(inv.total_amount), 0),
          'total_receivable', COALESCE(SUM(inv.balance_due), 0),
          'opd_collected', COALESCE(SUM(inv.paid_amount), 0)
        ) FROM gclinic_invoices inv
          LEFT JOIN gclinic_appointments a ON inv.appointment_id = a.id
          WHERE (DATE(inv.created_at) = '${selectedDate}' OR a.appointment_date = '${selectedDate}')) as revenue,

        -- 4. Revenue Breakdown by Item Type
        (SELECT COALESCE(json_agg(item_row), '[]'::json) FROM (
          SELECT ii.item_type, COALESCE(SUM(ii.total_price), 0) as category_total
          FROM gclinic_invoice_items ii
          JOIN gclinic_invoices inv ON ii.invoice_id = inv.id
          LEFT JOIN gclinic_appointments a ON inv.appointment_id = a.id
          WHERE (DATE(inv.created_at) = '${selectedDate}' OR a.appointment_date = '${selectedDate}')
          GROUP BY ii.item_type
        ) item_row) as revenue_breakdown,

        -- 5. Doctors KPIs
        (SELECT json_build_object(
          'total_doctors', COUNT(*),
          'active_doctors', COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)
        ) FROM gclinic_doctors) as doctors,

        -- 6. Pharmacy KPIs
        (SELECT json_build_object(
          'low_stock_count', COALESCE(SUM(CASE WHEN stock_quantity <= min_stock_alert THEN 1 ELSE 0 END), 0),
          'expiring_soon_count', COALESCE(SUM(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 1 ELSE 0 END), 0)
        ) FROM gclinic_medicines_inventory) as pharmacy,

        -- 7. Live Queue / Booked Appointments for Selected Date
        (SELECT COALESCE(json_agg(q_row), '[]'::json) FROM (
          SELECT 
            a.id, a.token_number, a.token_display, a.priority, a.status, a.appointment_time, a.appointment_date, a.chief_complaint, a.appointment_type,
            p.id as patient_id, p.mrn, p.full_name as patient_name, p.age, p.gender, p.phone as patient_phone, p.blood_group,
            d.id as doctor_id, d.name as doctor_name, d.specialty as doctor_specialty, d.room_no, d.consultation_fee,
            v.systolic_bp, v.diastolic_bp, v.pulse_rate, v.temperature_f, v.weight_kg, v.height_cm, v.bmi, v.spo2, v.blood_sugar_random,
            inv.id as invoice_id, inv.invoice_number, inv.payment_status as invoice_payment_status, inv.total_amount as invoice_total, inv.paid_amount as invoice_paid
          FROM gclinic_appointments a
          JOIN gclinic_patients p ON a.patient_id = p.id
          JOIN gclinic_doctors d ON a.doctor_id = d.id
          LEFT JOIN (
            SELECT DISTINCT ON (appointment_id) appointment_id, systolic_bp, diastolic_bp, pulse_rate, temperature_f, weight_kg, height_cm, bmi, spo2, blood_sugar_random
            FROM gclinic_patient_vitals
            ORDER BY appointment_id, recorded_at DESC
          ) v ON v.appointment_id = a.id
          LEFT JOIN (
            SELECT DISTINCT ON (appointment_id) id, appointment_id, invoice_number, payment_status, total_amount, paid_amount
            FROM gclinic_invoices
            ORDER BY appointment_id, id DESC
          ) inv ON inv.appointment_id = a.id
          WHERE a.appointment_date = '${selectedDate}'
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
        ) q_row) as live_queue,

        -- 8. 14-Day Revenue Trend
        (SELECT COALESCE(json_agg(t_row), '[]'::json) FROM (
          SELECT 
            TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as date_key,
            TO_CHAR(a.appointment_date, 'Mon DD') as date_label,
            COUNT(DISTINCT a.id) as patient_count,
            COALESCE(SUM(inv.paid_amount), 0) as revenue
          FROM gclinic_appointments a
          LEFT JOIN gclinic_invoices inv ON inv.appointment_id = a.id
          GROUP BY a.appointment_date
          ORDER BY a.appointment_date ASC
          LIMIT 14
        ) t_row) as revenue_trend,

        -- 9. Specialty Breakdown
        (SELECT COALESCE(json_agg(s_row), '[]'::json) FROM (
          SELECT d.specialty, COUNT(a.id) as appt_count
          FROM gclinic_doctors d
          LEFT JOIN gclinic_appointments a ON a.doctor_id = d.id AND a.appointment_date = '${selectedDate}'
          GROUP BY d.specialty
          HAVING COUNT(a.id) > 0
          ORDER BY appt_count DESC
        ) s_row) as specialty_breakdown,

        -- 10. Hourly Breakdown
        (SELECT COALESCE(json_agg(h_row), '[]'::json) FROM (
          SELECT 
            COALESCE(a.appointment_time, '10:00 AM') as time_slot,
            COUNT(*) as patient_count
          FROM gclinic_appointments a
          WHERE a.appointment_date = '${selectedDate}'
          GROUP BY COALESCE(a.appointment_time, '10:00 AM')
          ORDER BY 1 ASC
        ) h_row) as hourly_breakdown;
    `;

    const [rows] = await query(consolidatedSql);
    const summary = rows && rows.length > 0 ? rows[0] : {};

    // Support both table-prefixed and bare keys safely
    const appointments = summary.appointments || summary.gclinic_appointments || {};
    const patients = summary.patients || summary.gclinic_patients || {};
    const revenue = summary.revenue || {};
    const revenueBreakdown = summary.revenue_breakdown || [];
    const doctors = summary.doctors || summary.gclinic_doctors || {};
    const pharmacy = summary.pharmacy || summary.gclinic_medicines_inventory || {};
    const liveQueue = summary.live_queue || [];
    const revenueTrend = summary.revenue_trend || [];
    const specialtyBreakdown = summary.specialty_breakdown || [];
    const hourlyBreakdown = summary.hourly_breakdown || [];

    return res.json({
      success: true,
      data: {
        todayDate: today,
        selectedDate: selectedDate,
        appointments,
        patients,
        revenue,
        revenueBreakdown,
        doctors,
        pharmacy,
        lab: { total_lab_orders: 0, pending_lab: 0, in_process_lab: 0, completed_lab: 0 },
        liveQueue,
        appointmentsList: liveQueue,
        revenueTrend,
        specialtyBreakdown,
        hourlyBreakdown
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
