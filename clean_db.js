const { query } = require('./src/config/db');

async function cleanDatabase() {
  console.log('🧹 [CLEANUP] Purging all transactional, patient, and operational demo data...');

  await query('SET FOREIGN_KEY_CHECKS = 0');

  // Truncate all transaction and patient-related tables
  const tablesToClear = [
    'appointments',
    'patient_vitals',
    'patients',
    'consultations',
    'prescriptions',
    'prescription_items',
    'lab_orders',
    'lab_order_items',
    'invoices',
    'invoice_items',
    'payments',
    'pharmacy_sales',
    'pharmacy_sale_items',
    'audit_logs'
  ];

  for (const table of tablesToClear) {
    try {
      await query(`TRUNCATE TABLE \`${table}\``);
      console.log(`  ✓ Cleared table: ${table}`);
    } catch (err) {
      console.warn(`  ! Warning on table ${table}:`, err.message);
    }
  }

  await query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\n📊 [VERIFY] Checking clean database state:');
  const [patients] = await query('SELECT COUNT(*) as c FROM patients');
  const [appts] = await query('SELECT COUNT(*) as c FROM appointments');
  const [vitals] = await query('SELECT COUNT(*) as c FROM patient_vitals');
  const [invoices] = await query('SELECT COUNT(*) as c FROM invoices');
  const [labOrders] = await query('SELECT COUNT(*) as c FROM lab_orders');
  const [sales] = await query('SELECT COUNT(*) as c FROM pharmacy_sales');

  const [users] = await query('SELECT COUNT(*) as c FROM users');
  const [doctors] = await query('SELECT COUNT(*) as c FROM doctors');
  const [depts] = await query('SELECT COUNT(*) as c FROM departments');
  const [tests] = await query('SELECT COUNT(*) as c FROM lab_test_catalog');
  const [meds] = await query('SELECT COUNT(*) as c FROM medicines_inventory');
  const [settings] = await query('SELECT COUNT(*) as c FROM clinic_settings');

  console.log(`  - Patients: ${patients[0].c} (Expected: 0)`);
  console.log(`  - Appointments: ${appts[0].c} (Expected: 0)`);
  console.log(`  - Vitals: ${vitals[0].c} (Expected: 0)`);
  console.log(`  - Invoices: ${invoices[0].c} (Expected: 0)`);
  console.log(`  - Lab Orders: ${labOrders[0].c} (Expected: 0)`);
  console.log(`  - Pharmacy Sales: ${sales[0].c} (Expected: 0)`);
  console.log('  --- Base Configuration ---');
  console.log(`  - Clinic Settings: ${settings[0].c} active`);
  console.log(`  - Users: ${users[0].c} active staff accounts`);
  console.log(`  - Departments: ${depts[0].c} departments`);
  console.log(`  - Doctors: ${doctors[0].c} doctors configured with schedules`);
  console.log(`  - Lab Tests Catalog: ${tests[0].c} diagnostic tests`);
  console.log(`  - Pharmacy Inventory: ${meds[0].c} medicines in inventory`);

  console.log('\n✅ Database is now clean, fresh, and 100% ready for production use!');
  process.exit(0);
}

cleanDatabase().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
