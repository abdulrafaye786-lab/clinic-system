const { query } = require('./src/config/db');

async function enrichData() {
  console.log('[ENRICH] Populating rich clinical sample records in G_clinic...');
  const today = new Date().toISOString().slice(0, 10);

  // 1. Extra Lab Orders with results
  const [labOrders] = await query('SELECT COUNT(*) as count FROM lab_orders');
  if (labOrders[0].count <= 1) {
    const [lo1] = await query(`
      INSERT INTO lab_orders (order_code, consultation_id, patient_id, doctor_id, total_amount, status, payment_status)
      VALUES ('LAB-2026-00101', 1, 1, 2, 2050.00, 'completed', 'paid')
    `);
    const orderId1 = lo1.insertId;

    await query(`
      INSERT INTO lab_order_items (lab_order_id, test_id, test_name, price, result_value, normal_range, unit, flag, remarks, tested_by, status, completed_at) VALUES
      (?, 1, 'Complete Blood Picture (CBC + ESR)', 650.00, 'Hb: 14.2, WBC: 7500, Platelets: 280000', 'Hb: 12.0-16.5, WBC: 4000-11000', 'g/dL', 'Normal', 'Normal differential count', 'Hamza Farooq', 'completed', NOW()),
      (?, 2, 'Lipid Profile Complete', 1400.00, 'Cholesterol: 235 (High), Triglycerides: 185 (High), HDL: 38 (Low), LDL: 155 (High)', 'Cholesterol < 200, Triglycerides < 150', 'mg/dL', 'High', 'Moderate hyperlipidemia. Dietary modification & statin advised.', 'Hamza Farooq', 'completed', NOW())
    `, [orderId1, orderId1]);

    const [lo2] = await query(`
      INSERT INTO lab_orders (order_code, consultation_id, patient_id, doctor_id, total_amount, status, payment_status)
      VALUES ('LAB-2026-00102', NULL, 2, 1, 1400.00, 'sample_collected', 'paid')
    `);
    const orderId2 = lo2.insertId;

    await query(`
      INSERT INTO lab_order_items (lab_order_id, test_id, test_name, price, result_value, normal_range, unit, flag, status) VALUES
      (?, 5, 'Fasting Blood Glucose (FBS)', 300.00, NULL, '70 - 99 mg/dL', 'mg/dL', 'Pending', 'pending'),
      (?, 6, 'HbA1c (Glycated Hemoglobin)', 1100.00, NULL, '< 5.7% (Normal)', '%', 'Pending', 'pending')
    `, [orderId2, orderId2]);
  }

  // 2. Extra Pharmacy Sales
  const [salesCount] = await query('SELECT COUNT(*) as count FROM pharmacy_sales');
  if (salesCount[0].count <= 1) {
    const [s1] = await query(`
      INSERT INTO pharmacy_sales (sale_code, patient_id, customer_name, customer_phone, subtotal, discount, total_amount, payment_method, dispensed_by)
      VALUES ('RX-SALE-00101', 1, 'Muhammad Rizwan Khan', '0300-1234567', 880.00, 30.00, 850.00, 'cash', 'Zainab Ali (Chief Pharmacist)')
    `);
    const saleId1 = s1.insertId;

    await query(`
      INSERT INTO pharmacy_sale_items (pharmacy_sale_id, medicine_id, medicine_name, batch_no, unit_price, quantity, subtotal) VALUES
      (?, 5, 'Concor 5mg', 'CNC-5521', 175.00, 2, 350.00),
      (?, 6, 'Lipiget 20mg', 'LPG-8871', 360.00, 1, 360.00),
      (?, 4, 'Risek 40mg', 'RSK-1029', 265.00, 1, 265.00)
    `, [saleId1, saleId1, saleId1]);
  }

  // 3. Extra Invoices
  const [invCount] = await query('SELECT COUNT(*) as count FROM invoices');
  if (invCount[0].count <= 1) {
    const [inv2] = await query(`
      INSERT INTO invoices (invoice_number, patient_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due, payment_status, payment_method, cashier_name, notes)
      VALUES ('INV-2026-0002', 2, 3200.00, 200.00, 0.00, 3000.00, 3000.00, 0.00, 'paid', 'cash', 'Usman Aslam', 'Consultation fee and initial lab panel')
    `);
    const invId2 = inv2.insertId;

    await query(`
      INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, quantity, unit_price, total_price) VALUES
      (?, 'consultation', 1, 'Consultation Fee - Dr. Fatima Zahra (General Medicine)', 1, 1800.00, 1800.00),
      (?, 'lab_test', 5, 'Diagnostic Test: Fasting Blood Glucose (FBS)', 1, 300.00, 300.00),
      (?, 'lab_test', 6, 'Diagnostic Test: HbA1c (Glycated Hemoglobin)', 1, 1100.00, 1100.00)
    `, [invId2, invId2, invId2]);

    await query(`
      INSERT INTO payments (invoice_id, patient_id, payment_number, amount, payment_method, notes, collected_by)
      VALUES (?, 2, 'PAY-2026-0002', 3000.00, 'cash', 'Settled in full at cashier desk', 'Usman Aslam')
    `, [invId2]);

    const [inv3] = await query(`
      INSERT INTO invoices (invoice_number, patient_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due, payment_status, payment_method, cashier_name, notes)
      VALUES ('INV-2026-0003', 3, 2400.00, 0.00, 0.00, 2400.00, 1500.00, 900.00, 'partial', 'cash', 'Usman Aslam', 'Pediatric checkup & emergency nebulization procedure')
    `);
    const invId3 = inv3.insertId;

    await query(`
      INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, quantity, unit_price, total_price) VALUES
      (?, 'consultation', 3, 'Consultation Fee - Dr. Bilal Ahmad (Pediatrics)', 1, 1600.00, 1600.00),
      (?, 'procedure', NULL, 'Emergency Nebulization & Respiratory Therapy', 1, 800.00, 800.00)
    `, [invId3, invId3]);

    await query(`
      INSERT INTO payments (invoice_id, patient_id, payment_number, amount, payment_method, notes, collected_by)
      VALUES (?, 3, 'PAY-2026-0003', 1500.00, 'cash', 'Partial payment received at front desk', 'Usman Aslam')
    `, [invId3]);
  }

  console.log('[ENRICH] Sample data enriched successfully!');
  process.exit(0);
}

enrichData().catch(err => {
  console.error('[ENRICH ERROR]', err);
  process.exit(1);
});
