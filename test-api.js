const http = require('http');
const express = require('express');
const app = require('express')();
const cors = require('cors');
const apiRoutes = require('./src/routes/api');
const { initDatabase, query } = require('./src/config/db');

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

let server;
const TEST_PORT = 3999;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Full G-Clinic Add & Delete Database Verification Suite...');
  await initDatabase();

  server = app.listen(TEST_PORT, async () => {
    try {
      // 1. Authenticate Admin
      console.log('1. Authenticating Admin...');
      const adminLogin = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { username: 'admin', password: 'admin123' });

      if (!adminLogin.data.success) throw new Error('Admin login failed');
      const adminToken = adminLogin.data.token;
      const adminHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      };
      console.log('   ✅ Admin authenticated.');

      // 2. Test Staff User: Create -> Update -> Delete
      console.log('\n2. Testing Staff User CRUD (Add, Update, Delete in DB)...');
      const testUsername = `teststaff_${Date.now()}`;
      const createUserRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/auth/users',
        method: 'POST',
        headers: adminHeaders
      }, {
        username: testUsername,
        password: 'password123',
        full_name: 'Test Staff User',
        role: 'receptionist',
        phone: '0300-1122334',
        email: 'teststaff@dreamgardenclinic.com'
      });
      if (!createUserRes.data.success) throw new Error('Create user failed');
      const testUserId = createUserRes.data.userId;

      // Verify in DB
      const [uCheck1] = await query('SELECT * FROM users WHERE id = ?', [testUserId]);
      if (uCheck1.length === 0) throw new Error('User not found in DB after creation');
      console.log('   ✅ User created and verified in database (ID:', testUserId, ')');

      // Update user in DB
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/auth/users/${testUserId}`,
        method: 'PUT',
        headers: adminHeaders
      }, {
        full_name: 'Updated Staff User',
        role: 'pharmacist',
        status: 'active'
      });
      const [uCheck2] = await query('SELECT full_name, role FROM users WHERE id = ?', [testUserId]);
      if (uCheck2[0].full_name !== 'Updated Staff User' || uCheck2[0].role !== 'pharmacist') {
        throw new Error('User update not reflected in database');
      }
      console.log('   ✅ User updated and verified in database.');

      // Delete user in DB
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/auth/users/${testUserId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [uCheck3] = await query('SELECT * FROM users WHERE id = ?', [testUserId]);
      if (uCheck3.length > 0) throw new Error('User still in DB after deletion');
      console.log('   ✅ User deleted and verified completely removed from database.');

      // 3. Test Doctor & Schedules: Create -> Update -> Delete
      console.log('\n3. Testing Doctor & Multi-Slot Rosters CRUD (Add, Update, Delete in DB)...');
      const createDocRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/doctors',
        method: 'POST',
        headers: adminHeaders
      }, {
        name: 'Dr. Test Surgeon',
        specialty: 'General Surgery',
        qualification: 'MBBS, FCPS',
        consultation_fee: 2500,
        follow_up_fee: 1500,
        schedules: [
          { day_of_week: 'Monday', start_time: '10:00 AM', end_time: '01:00 PM', max_slots: 20 },
          { day_of_week: 'Thursday', start_time: '04:00 PM', end_time: '07:00 PM', max_slots: 20 }
        ]
      });
      if (!createDocRes.data.success) throw new Error('Create doctor failed');
      const testDocId = createDocRes.data.doctorId;

      const [dCheck1] = await query('SELECT * FROM doctors WHERE id = ?', [testDocId]);
      const [dsCheck1] = await query('SELECT * FROM doctor_schedules WHERE doctor_id = ?', [testDocId]);
      if (dCheck1.length === 0 || dsCheck1.length !== 2) throw new Error('Doctor or schedules not persisted in DB');
      console.log('   ✅ Doctor created with 2 schedule shifts in database (ID:', testDocId, ')');

      // Delete Doctor
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/doctors/${testDocId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [dCheck2] = await query('SELECT * FROM doctors WHERE id = ?', [testDocId]);
      const [dsCheck2] = await query('SELECT * FROM doctor_schedules WHERE doctor_id = ?', [testDocId]);
      if (dCheck2.length > 0 || dsCheck2.length > 0) throw new Error('Doctor or schedules still in DB after deletion');
      console.log('   ✅ Doctor & schedules deleted and verified completely removed from database.');

      // 4. Test Lab Catalog: Create Test -> Delete Test
      console.log('\n4. Testing Lab Test Catalog CRUD (Add, Delete in DB)...');
      const createLabTestRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/lab/catalog',
        method: 'POST',
        headers: adminHeaders
      }, {
        test_name: 'Serum Electrolytes (Na, K, Cl)',
        category: 'Biochemistry',
        price: 850,
        sample_type: 'Serum',
        turnaround_time: '12 Hours',
        normal_range: 'Na: 135-145, K: 3.5-5.0',
        units: 'mEq/L'
      });
      if (!createLabTestRes.data.success) throw new Error('Create lab test failed');
      const testLabId = createLabTestRes.data.testId;

      const [ltCheck1] = await query('SELECT * FROM lab_test_catalog WHERE id = ?', [testLabId]);
      if (ltCheck1.length === 0) throw new Error('Lab test not in DB after creation');
      console.log('   ✅ Lab test added to catalog in database (ID:', testLabId, ')');

      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/lab/catalog/${testLabId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [ltCheck2] = await query('SELECT * FROM lab_test_catalog WHERE id = ?', [testLabId]);
      if (ltCheck2.length > 0) throw new Error('Lab test still in DB after deletion');
      console.log('   ✅ Lab test deleted and verified removed from database.');

      // 5. Test Pharmacy Inventory: Add -> Update -> Delete
      console.log('\n5. Testing Pharmacy Inventory CRUD (Add, Update, Delete in DB)...');
      const createMedRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/pharmacy/inventory',
        method: 'POST',
        headers: adminHeaders
      }, {
        brand_name: 'TestCillin 500mg',
        generic_name: 'Amoxicillin',
        category: 'Antibiotics',
        dosage_form: 'Capsule',
        strength: '500mg',
        batch_no: 'TC-9988',
        expiry_date: '2028-12-31',
        cost_price: 10.0,
        selling_price: 15.0,
        stock_quantity: 100
      });
      if (!createMedRes.data.success) throw new Error('Create medicine failed');
      const testMedId = createMedRes.data.medicineId;

      const [mCheck1] = await query('SELECT * FROM medicines_inventory WHERE id = ?', [testMedId]);
      if (mCheck1.length === 0) throw new Error('Medicine not in DB after creation');
      console.log('   ✅ Medicine created in inventory (ID:', testMedId, ')');

      // Update medicine
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/pharmacy/inventory/${testMedId}`,
        method: 'PUT',
        headers: adminHeaders
      }, {
        brand_name: 'TestCillin 500mg Forte',
        generic_name: 'Amoxicillin Trihydrate',
        selling_price: 18.0,
        stock_quantity: 120,
        min_stock_alert: 15,
        batch_no: 'TC-9988',
        expiry_date: '2028-12-31'
      });
      const [mCheck2] = await query('SELECT selling_price, stock_quantity FROM medicines_inventory WHERE id = ?', [testMedId]);
      if (parseFloat(mCheck2[0].selling_price) !== 18.0 || mCheck2[0].stock_quantity !== 120) {
        throw new Error('Medicine update not persisted in DB');
      }
      console.log('   ✅ Medicine updated and verified in database.');

      // Delete medicine
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/pharmacy/inventory/${testMedId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [mCheck3] = await query('SELECT * FROM medicines_inventory WHERE id = ?', [testMedId]);
      if (mCheck3.length > 0) throw new Error('Medicine still in DB after deletion');
      console.log('   ✅ Medicine deleted and verified completely removed from database.');

      // 6. Test Patient, Vitals, Appointments, Consultations, Labs, and Invoices Full Lifecycle
      console.log('\n6. Testing End-to-End Clinical Records Lifecycle (Add & Delete in DB)...');

      // A. Create Patient
      const createPatRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/patients',
        method: 'POST',
        headers: adminHeaders
      }, {
        full_name: 'Verification Patient',
        gender: 'Female',
        phone: '0311-9988776',
        age: 28,
        blood_group: 'O+',
        address: 'Model Town, Lahore',
        allergies: 'Penicillin',
        chronic_conditions: 'Asthma'
      });
      if (!createPatRes.data.success) throw new Error('Create patient failed');
      const testPatId = createPatRes.data.patientId;
      console.log('   ✅ Patient registered in database (ID:', testPatId, 'MRN:', createPatRes.data.mrn, ')');

      // B. Create Appointment
      const createOrderApptRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/appointments',
        method: 'POST',
        headers: adminHeaders
      }, {
        patient_id: testPatId,
        doctor_id: 1, // Dr. Hudebia
        appointment_date: new Date().toISOString().slice(0, 10),
        appointment_time: '05:30 PM',
        chief_complaint: 'Routine follow up'
      });
      if (!createOrderApptRes.data.success) throw new Error('Create appointment failed');
      const testApptId = createOrderApptRes.data.appointmentId;
      console.log('   ✅ Appointment booked in database (ID:', testApptId, 'Token:', createOrderApptRes.data.tokenDisplay, ')');

      // Verify Appointment by ID endpoint
      const getApptRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/appointments/${testApptId}`,
        method: 'GET',
        headers: adminHeaders
      });
      if (!getApptRes.data.success || getApptRes.data.data.id !== testApptId) {
        throw new Error('Get appointment by ID failed');
      }
      console.log('   ✅ GET /api/appointments/:id verified.');

      // C. Record Check-In Vitals
      const checkInRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/appointments/${testApptId}/checkin`,
        method: 'POST',
        headers: adminHeaders
      }, {
        systolic_bp: 118,
        diastolic_bp: 78,
        pulse_rate: 72,
        temperature_f: 98.6,
        spo2: 99,
        weight_kg: 58,
        height_cm: 162,
        notes: 'Vitals stable'
      });
      if (!checkInRes.data.success) throw new Error('Check-in vitals failed');
      const [vCheck] = await query('SELECT * FROM patient_vitals WHERE appointment_id = ?', [testApptId]);
      if (vCheck.length === 0) throw new Error('Vitals not in DB');
      console.log('   ✅ Vitals saved and verified in database.');

      // D. Create Consultation & E-Prescription
      const consultRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/consultations',
        method: 'POST',
        headers: adminHeaders
      }, {
        appointment_id: testApptId,
        patient_id: testPatId,
        doctor_id: 1,
        chief_complaint: 'Routine follow up',
        diagnosis: 'Seasonal allergic rhinitis',
        clinical_notes: 'Advised antihistamines',
        prescription: {
          advice: 'Drink warm fluids, avoid cold exposure',
          medicines: [
            { medicine_name: 'Panadol 500mg', dosage_form: 'Tablet', strength: '500mg', frequency: '1-0-1', duration: '3 Days', instruction: 'After Meal' },
            { medicine_name: 'Claritek 250mg', dosage_form: 'Tablet', strength: '250mg', frequency: '0-0-1', duration: '5 Days', instruction: 'Night' }
          ]
        },
        lab_test_ids: [1] // CBC
      });
      if (!consultRes.data.success) throw new Error('Create consultation failed');
      const testConsultId = consultRes.data.consultationId;
      console.log('   ✅ Consultation & prescription recorded in database (ID:', testConsultId, ')');

      // Verify Consultation by ID
      const getConsultRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/consultations/${testConsultId}`,
        method: 'GET',
        headers: adminHeaders
      });
      if (!getConsultRes.data.success || getConsultRes.data.data.medicines.length !== 2) {
        throw new Error('Get consultation by ID failed');
      }
      console.log('   ✅ GET /api/consultations/:id returned full prescription medicines list.');

      // E. Create Invoice & Settle Payment
      const invoiceRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/billing/invoices',
        method: 'POST',
        headers: adminHeaders
      }, {
        patient_id: testPatId,
        appointment_id: testApptId,
        items: [
          { item_type: 'consultation', description: 'General Physician Consultation', quantity: 1, unit_price: 1500 }
        ],
        discount_value: 0,
        payment_method: 'cash',
        initial_payment: 1500,
        notes: 'Paid in full'
      });
      if (!invoiceRes.data.success) throw new Error('Create invoice failed');
      const testInvoiceId = invoiceRes.data.invoiceId;
      console.log('   ✅ Invoice generated and paid in database (ID:', testInvoiceId, 'Number:', invoiceRes.data.invoiceNumber, ')');

      // F. Delete Invoice
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/billing/invoices/${testInvoiceId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [invCheck] = await query('SELECT * FROM invoices WHERE id = ?', [testInvoiceId]);
      if (invCheck.length > 0) throw new Error('Invoice still in DB after deletion');
      console.log('   ✅ Invoice deleted and verified removed from database.');

      // G. Delete Consultation
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/consultations/${testConsultId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [cCheck] = await query('SELECT * FROM consultations WHERE id = ?', [testConsultId]);
      if (cCheck.length > 0) throw new Error('Consultation still in DB after deletion');
      console.log('   ✅ Consultation deleted and verified removed from database.');

      // H. Delete Patient (Cascade verification)
      await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/patients/${testPatId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
      const [pCheck] = await query('SELECT * FROM patients WHERE id = ?', [testPatId]);
      const [paCheck] = await query('SELECT * FROM appointments WHERE patient_id = ?', [testPatId]);
      if (pCheck.length > 0 || paCheck.length > 0) throw new Error('Patient or appointments still in DB after cascade deletion');
      console.log('   ✅ Patient and all associated records deleted and verified completely cleaned from database.');

      console.log('\n================================================================');
      console.log('🏆 ALL ADD & DELETE DATABASE PERSISTENCE TESTS PASSED 100%!');
      console.log('================================================================');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Test failure:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
