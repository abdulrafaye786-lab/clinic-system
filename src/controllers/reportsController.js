const { query } = require('../config/db');

async function getFinancialReport(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = end_date || new Date().toISOString().slice(0, 10);

    // 1. Overall Revenue Totals in date range
    const [totals] = await query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(balance_due), 0) as total_receivable,
        COUNT(*) as total_invoices_count
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // 2. Revenue breakdown by Department/Item type
    const [byCategory] = await query(`
      SELECT 
        ii.item_type,
        COUNT(*) as items_count,
        COALESCE(SUM(ii.total_price), 0) as total_revenue
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE DATE(inv.created_at) BETWEEN ? AND ?
      GROUP BY ii.item_type
    `, [startDate, endDate]);

    // 3. Payment Methods Breakdown
    const [byPaymentMethod] = await query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY payment_method
    `, [startDate, endDate]);

    // 4. Daily Revenue Trend in date range
    const [dailyTrend] = await query(`
      SELECT 
        DATE_FORMAT(DATE(created_at), '%Y-%m-%d') as date,
        COALESCE(SUM(paid_amount), 0) as revenue,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    return res.json({
      success: true,
      data: {
        startDate,
        endDate,
        totals: totals[0] || {},
        byCategory: byCategory || [],
        byPaymentMethod: byPaymentMethod || [],
        dailyTrend: dailyTrend || []
      }
    });
  } catch (err) {
    console.error('getFinancialReport error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate financial report.' });
  }
}

async function getDoctorReport(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = end_date || new Date().toISOString().slice(0, 10);

    const [doctors] = await query(`
      SELECT 
        d.id, d.name, d.specialty, d.consultation_fee,
        COUNT(DISTINCT a.id) as total_appointments,
        COUNT(DISTINCT c.id) as total_consultations,
        COALESCE(SUM(CASE WHEN ii.item_type = 'consultation' THEN ii.total_price ELSE 0 END), 0) as total_revenue
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id AND DATE(a.appointment_date) BETWEEN ? AND ?
      LEFT JOIN consultations c ON c.doctor_id = d.id AND DATE(c.consultation_date) BETWEEN ? AND ?
      LEFT JOIN invoice_items ii ON ii.reference_id = d.id AND ii.item_type = 'consultation'
      GROUP BY d.id
      ORDER BY total_consultations DESC, total_appointments DESC
    `, [startDate, endDate, startDate, endDate]);

    return res.json({ success: true, data: doctors });
  } catch (err) {
    console.error('getDoctorReport error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate doctor productivity report.' });
  }
}

async function getOpdDemographics(req, res) {
  try {
    // Gender Distribution
    const [genderDist] = await query(`
      SELECT gender, COUNT(*) as count 
      FROM patients 
      GROUP BY gender
    `);

    // Age distribution
    const [ageDist] = await query(`
      SELECT 
        CASE 
          WHEN age < 12 THEN 'Pediatric (<12)'
          WHEN age BETWEEN 12 AND 25 THEN 'Youth (12-25)'
          WHEN age BETWEEN 26 AND 50 THEN 'Adult (26-50)'
          ELSE 'Senior (50+)'
        END as age_group,
        COUNT(*) as count
      FROM patients
      GROUP BY age_group
    `);

    // Top 5 Diagnoses
    const [topDiagnoses] = await query(`
      SELECT diagnosis, COUNT(*) as count
      FROM consultations
      WHERE diagnosis IS NOT NULL AND diagnosis != ''
      GROUP BY diagnosis
      ORDER BY count DESC
      LIMIT 8
    `);

    return res.json({
      success: true,
      data: {
        genderDist: genderDist || [],
        ageDist: ageDist || [],
        topDiagnoses: topDiagnoses || []
      }
    });
  } catch (err) {
    console.error('getOpdDemographics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve OPD demographics.' });
  }
}

module.exports = {
  getFinancialReport,
  getDoctorReport,
  getOpdDemographics
};
