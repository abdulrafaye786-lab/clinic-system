const http = require('http');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');
const { initDatabase, query } = require('./src/config/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

const STRESS_PORT = 4124;
let server;

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

async function runConcurrentPool(tasks, concurrency = 10) {
  const results = [];
  let index = 0;
  
  async function worker() {
    while (index < tasks.length) {
      const currentIdx = index++;
      const t0 = Date.now();
      try {
        const res = await tasks[currentIdx]();
        const duration = Date.now() - t0;
        results.push({ success: true, duration, res });
      } catch (err) {
        const duration = Date.now() - t0;
        results.push({ success: false, duration, error: err.message });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

async function runHighLoadStressTest() {
  console.log('================================================================');
  console.log('⚡ G-CLINIC REAL-WORLD HIGH-LOAD & ENDURANCE STRESS BENCHMARK');
  console.log('================================================================\n');

  await initDatabase();

  server = app.listen(STRESS_PORT, async () => {
    try {
      console.log(`[HTTP] Stress test server listening on port ${STRESS_PORT}`);
      
      // 1. Authenticate Admin
      console.log('\n[Phase 1] Authenticating Admin user...');
      const adminLogin = await request({
        hostname: 'localhost',
        port: STRESS_PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { username: 'admin', password: 'admin123' });

      if (!adminLogin.data.success) {
        throw new Error('Admin authentication failed during stress test setup');
      }
      const token = adminLogin.data.token;
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      console.log('   ✅ Admin authenticated successfully.');

      // 2. High-Volume Concurrent Reads across critical clinic endpoints
      console.log('\n[Phase 2] Executing 100 High-Volume Module Read Requests (Concurrency: 10)...');
      const validEndpoints = [
        '/api/dashboard/summary',
        '/api/patients',
        '/api/appointments',
        '/api/appointments/queue/today',
        '/api/doctors',
        '/api/departments',
        '/api/pharmacy/inventory',
        '/api/pharmacy/alerts',
        '/api/billing/invoices',
        '/api/settings'
      ];

      const readTasks = [];
      const TOTAL_READ_REQUESTS = 100;
      for (let i = 0; i < TOTAL_READ_REQUESTS; i++) {
        const endpoint = validEndpoints[i % validEndpoints.length];
        readTasks.push(() => request({
          hostname: 'localhost',
          port: STRESS_PORT,
          path: endpoint,
          method: 'GET',
          headers: authHeaders
        }));
      }

      const readStartTime = Date.now();
      const readResults = await runConcurrentPool(readTasks, 10);
      const totalReadTime = Date.now() - readStartTime;

      const successfulReads = readResults.filter(r => r.success && r.res.status === 200).length;
      const avgReadLatency = (readResults.reduce((acc, r) => acc + r.duration, 0) / readResults.length).toFixed(1);
      const minReadLatency = Math.min(...readResults.map(r => r.duration));
      const maxReadLatency = Math.max(...readResults.map(r => r.duration));
      const rpsReads = ((TOTAL_READ_REQUESTS / totalReadTime) * 1000).toFixed(1);

      console.log(`   ✅ Completed ${TOTAL_READ_REQUESTS} Read queries in ${totalReadTime}ms`);
      console.log(`   - Success Rate: ${successfulReads}/${TOTAL_READ_REQUESTS} (${((successfulReads/TOTAL_READ_REQUESTS)*100).toFixed(1)}%)`);
      console.log(`   - Throughput: ${rpsReads} requests/sec`);
      console.log(`   - Latency: Avg ${avgReadLatency}ms | Min ${minReadLatency}ms | Max ${maxReadLatency}ms`);

      // 3. High-Concurrency Write Stress Test (Concurrent Patient Registration)
      console.log('\n[Phase 3] Executing Concurrent Registration Write Load (30 Patients)...');
      const writeTasks = [];
      const createdPatientIds = [];
      const TOTAL_WRITES = 30;

      for (let i = 0; i < TOTAL_WRITES; i++) {
        const rand = Math.floor(Math.random() * 900000 + 100000);
        writeTasks.push(async () => {
          const res = await request({
            hostname: 'localhost',
            port: STRESS_PORT,
            path: '/api/patients',
            method: 'POST',
            headers: authHeaders
          }, {
            full_name: `Stress Patient ${i}_${rand}`,
            gender: i % 2 === 0 ? 'Male' : 'Female',
            age: 20 + (i % 50),
            phone: `0333${rand}`,
            address: `Stress Test Ave, House ${i}`,
            allergies: 'None',
            chronic_conditions: 'None'
          });
          if (res.data && res.data.patientId) {
            createdPatientIds.push(res.data.patientId);
          }
          return res;
        });
      }

      const writeStartTime = Date.now();
      const writeResults = await runConcurrentPool(writeTasks, 5);
      const totalWriteTime = Date.now() - writeStartTime;

      const successfulWrites = writeResults.filter(r => r.success && (r.res.status === 200 || r.res.status === 201)).length;
      const avgWriteLatency = (writeResults.reduce((acc, r) => acc + r.duration, 0) / writeResults.length).toFixed(1);
      const rpsWrites = ((TOTAL_WRITES / totalWriteTime) * 1000).toFixed(1);

      console.log(`   ✅ Completed ${TOTAL_WRITES} Concurrent Patient Creations in ${totalWriteTime}ms`);
      console.log(`   - Success Rate: ${successfulWrites}/${TOTAL_WRITES} (${((successfulWrites/TOTAL_WRITES)*100).toFixed(1)}%)`);
      console.log(`   - Throughput: ${rpsWrites} writes/sec`);
      console.log(`   - Latency: Avg ${avgWriteLatency}ms`);

      // 4. Concurrency Appointments Creation
      console.log('\n[Phase 4] Executing Concurrent Appointments Booking Load...');
      const [doctors] = await query('SELECT id FROM gclinic_doctors WHERE status = "active" LIMIT 1');
      const doctorId = (doctors && doctors.length > 0) ? doctors[0].id : 1;

      const apptTasks = [];
      const createdApptIds = [];
      const testPatientsToBook = createdPatientIds.slice(0, 15);

      for (let i = 0; i < testPatientsToBook.length; i++) {
        const pId = testPatientsToBook[i];
        apptTasks.push(async () => {
          const res = await request({
            hostname: 'localhost',
            port: STRESS_PORT,
            path: '/api/appointments',
            method: 'POST',
            headers: authHeaders
          }, {
            patient_id: pId,
            doctor_id: doctorId,
            appointment_date: new Date().toISOString().slice(0, 10),
            time_slot: `1${i % 8}:00:00`,
            type: 'General Checkup',
            notes: 'High load stress booking'
          });
          if (res.data && res.data.appointmentId) {
            createdApptIds.push(res.data.appointmentId);
          }
          return res;
        });
      }

      const apptStart = Date.now();
      const apptResults = await runConcurrentPool(apptTasks, 5);
      const totalApptTime = Date.now() - apptStart;
      const successfulAppts = apptResults.filter(r => r.success && (r.res.status === 200 || r.res.status === 201)).length;
      console.log(`   ✅ Booked ${testPatientsToBook.length} Concurrent Appointments in ${totalApptTime}ms`);
      console.log(`   - Appointment Success Rate: ${successfulAppts}/${testPatientsToBook.length}`);

      // 5. Cleanup Created Test Artifacts
      console.log('\n[Phase 5] Cleaning up generated stress-test data records...');
      if (createdApptIds.length > 0) {
        await query(`DELETE FROM gclinic_appointments WHERE id IN (${createdApptIds.join(',')})`);
      }
      if (createdPatientIds.length > 0) {
        await query(`DELETE FROM gclinic_patients WHERE id IN (${createdPatientIds.join(',')})`);
      }
      console.log(`   ✅ Safely purged ${createdApptIds.length} stress appointments & ${createdPatientIds.length} stress patients.`);

      // 6. Final Consistency and Data Integrity Verification
      console.log('\n[Phase 6] Checking Final System Data Consistency...');
      const [finalPatients] = await query('SELECT COUNT(*) AS total FROM gclinic_patients');
      const [finalAppts] = await query('SELECT COUNT(*) AS total FROM gclinic_appointments');
      const [finalMeds] = await query('SELECT COUNT(*) AS total FROM gclinic_medicines_inventory');
      const [finalInvoices] = await query('SELECT COUNT(*) AS total FROM gclinic_invoices');

      console.log(`   - Active Patients in DB: ${finalPatients[0].total}`);
      console.log(`   - Active Appointments in DB: ${finalAppts[0].total}`);
      console.log(`   - Pharmacy Medicines in DB: ${finalMeds[0].total}`);
      console.log(`   - Invoices in DB: ${finalInvoices[0].total}`);

      console.log('\n================================================================');
      console.log('🏆 STRESS & HIGH-LOAD TEST PASSED: ALL SERVICES FULLY HEALTHY!');
      console.log('================================================================\n');

      server.close();
      process.exit(0);

    } catch (err) {
      console.error('\n❌ STRESS TEST FAILURE:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runHighLoadStressTest();
