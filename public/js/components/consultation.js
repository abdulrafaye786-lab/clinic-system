// ==========================================================================
// CONSULTATION COMPONENT - DOCTOR WORKSPACE & E-PRESCRIPTION BUILDER
// ==========================================================================

const consultationComponent = {
  activeDoctorId: null,
  activePatientId: null,
  activeAppointmentId: null,
  patientData: null,
  inventoryMeds: [],

  async render(container) {
    // Check if session storage has active appointment
    const storedAppt = window.sessionStorage.getItem('active_consult_appointment_id');
    const storedPat = window.sessionStorage.getItem('active_consult_patient_id');
    const storedDoc = window.sessionStorage.getItem('active_consult_doctor_id');

    if (storedAppt) this.activeAppointmentId = storedAppt;
    if (storedPat) this.activePatientId = storedPat;
    if (storedDoc) this.activeDoctorId = storedDoc;

    // Clear session storage once read
    window.sessionStorage.removeItem('active_consult_appointment_id');
    window.sessionStorage.removeItem('active_consult_patient_id');
    window.sessionStorage.removeItem('active_consult_doctor_id');

    const [docRes, medRes, queueRes] = await Promise.all([
      app.api('/doctors'),
      app.api('/pharmacy/inventory'),
      app.api('/appointments/queue/today')
    ]);

    const doctors = docRes.data || [];
    this.inventoryMeds = medRes.data || [];
    const queue = queueRes.data || [];

    if (!this.activeDoctorId && doctors.length > 0) {
      // If user is a doctor, default to their doctor_id, else first doctor
      if (app.user && app.user.doctor_id) {
        this.activeDoctorId = app.user.doctor_id;
      } else {
        this.activeDoctorId = doctors[0].id;
      }
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: flex-start;">
        
        <!-- Left Column: Doctor Selection & Patient Queue List -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Doctor Selector Card -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-user-doctor" style="color: #00c853;"></i> Active Doctor
              </div>
            </div>
            <div class="card-body" style="padding: 1rem;">
              <select id="consult-doctor-select" class="form-control" onchange="consultationComponent.handleDoctorChange(this.value)">
                ${doctors.map(d => `<option value="${d.id}" ${d.id == this.activeDoctorId ? 'selected' : ''}>${d.name} (${d.specialty})</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Waiting Queue for this Doctor -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-users" style="color: #0284c7;"></i> Waiting Queue
              </div>
              <button onclick="consultationComponent.reloadQueue()" class="btn btn-outline btn-sm" title="Refresh"><i class="fa-solid fa-rotate-right"></i></button>
            </div>
            <div style="max-height: 480px; overflow-y: auto; padding: 0.5rem;" id="consult-queue-list">
              <!-- Loaded dynamically -->
            </div>
          </div>
        </div>

        <!-- Right Column: Medical Consultation Workspace & Rx Pad -->
        <div id="consultation-editor-outlet">
          <div class="card">
            <div class="card-body" style="text-align: center; padding: 4rem; color: #94a3b8;">
              <i class="fa-solid fa-stethoscope" style="font-size: 3.5rem; color: var(--border-color); margin-bottom: 1rem;"></i>
              <h3 style="color: var(--text-main); font-size: 1.25rem; font-weight: 700;">Select a Patient to Begin Consultation</h3>
              <p style="font-size: 0.85rem; max-width: 450px; margin: 0.5rem auto 1.5rem auto;">
                Choose a waiting patient from the queue on the left, or search a registered patient to record diagnosis and write an electronic prescription.
              </p>
              <button onclick="consultationComponent.openPatientSearchModal()" class="btn btn-primary">
                <i class="fa-solid fa-magnifying-glass"></i> Search Registered Patient
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.reloadQueue();

    if (this.activePatientId) {
      this.loadPatientWorkspace(this.activePatientId, this.activeAppointmentId);
    }
  },

  handleDoctorChange(docId) {
    this.activeDoctorId = docId;
    this.reloadQueue();
  },

  async reloadQueue() {
    const res = await app.api(`/appointments/queue/today?doctor_id=${this.activeDoctorId}`);
    const listEl = document.getElementById('consult-queue-list');
    if (!listEl) return;

    if (!res.success || !res.data || res.data.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem;">No patients waiting in queue.</div>`;
      return;
    }

    listEl.innerHTML = res.data.map(q => {
      const isCurrent = q.id == this.activeAppointmentId;
      return `
        <div style="background: ${isCurrent ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)'}; border: 1px solid ${isCurrent ? 'var(--cyber-green)' : 'var(--border-color)'}; border-radius: 8px; padding: 0.85rem; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;" onclick="consultationComponent.loadPatientWorkspace(${q.patient_id}, ${q.id})">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--cyber-green);">#${q.id}</span>
            <span class="badge ${q.status === 'in_consultation' ? 'badge-green' : (q.status === 'waiting' ? 'badge-amber' : 'badge-gray')}">
              ${q.status}
            </span>
          </div>
          <div style="font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">${q.patient_name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${q.mrn} • ${q.gender}, ${q.age} Yrs</div>
          <div style="font-size: 0.75rem; color: var(--cyber-green); margin-top: 0.25rem;"><strong>Complaint:</strong> ${q.chief_complaint || 'Checkup'}</div>
        </div>
      `;
    }).join('');
  },

  async loadPatientWorkspace(patientId, appointmentId = null) {
    this.activePatientId = patientId;
    this.activeAppointmentId = appointmentId;

    const res = await app.api(`/patients/${patientId}`);
    if (!res.success) return;

    const { patient: p, vitals, consultations } = res.data;
    this.patientData = p;

    const latestVitals = vitals.length > 0 ? vitals[0] : {};
    const outlet = document.getElementById('consultation-editor-outlet');
    if (!outlet) return;

    outlet.innerHTML = `
      <div class="card">
        <!-- Patient Dossier Bar -->
        <div class="card-header" style="background: var(--bg-card);">
          <div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">
              ${p.full_name} 
              <span class="mrn-tag" style="margin-left: 0.5rem; font-size: 0.82rem;">${p.mrn}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
              ${p.gender}, ${p.age} Years • Phone: <strong>${p.phone}</strong> • Blood: <strong>${p.blood_group}</strong>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button onclick="patientsComponent.viewPatientDossier(${p.id})" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-history"></i> Past History (${consultations.length})
            </button>
            <button onclick="patientsComponent.openAddVitalsModal(${p.id}, '${p.full_name}')" class="btn btn-outline-primary btn-sm">
              <i class="fa-solid fa-heart-pulse"></i> Record Vitals
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- Vitals Banner -->
          <div class="vitals-banner">
            <div class="vital-item">
              <div class="vital-label">Blood Pressure</div>
              <div class="vital-val">${latestVitals.systolic_bp && latestVitals.diastolic_bp ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` : '--/--'}</div>
              <div class="vital-unit">mmHg</div>
            </div>
            <div class="vital-item">
              <div class="vital-label">Heart Rate</div>
              <div class="vital-val">${latestVitals.pulse_rate || '--'}</div>
              <div class="vital-unit">bpm</div>
            </div>
            <div class="vital-item">
              <div class="vital-label">Temperature</div>
              <div class="vital-val">${latestVitals.temperature_f || '--'}</div>
              <div class="vital-unit">°F</div>
            </div>
            <div class="vital-item">
              <div class="vital-label">Oxygen SpO2</div>
              <div class="vital-val">${latestVitals.spo2 ? `${latestVitals.spo2}%` : '--'}</div>
              <div class="vital-unit">SpO2</div>
            </div>
            <div class="vital-item">
              <div class="vital-label">Weight / BMI</div>
              <div class="vital-val">${latestVitals.weight_kg ? `${latestVitals.weight_kg} kg` : '--'}</div>
              <div class="vital-unit">BMI: ${latestVitals.bmi || '--'}</div>
            </div>
            <div class="vital-item">
              <div class="vital-label">Blood Glucose</div>
              <div class="vital-val">${latestVitals.blood_sugar_random || latestVitals.blood_sugar_fasting || '--'}</div>
              <div class="vital-unit">mg/dL</div>
            </div>
          </div>

          <!-- Allergy Alert if any -->
          ${p.allergies ? `
            <div style="background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1.25rem;">
              <i class="fa-solid fa-triangle-exclamation"></i> <strong>Known Allergies:</strong> ${p.allergies}
            </div>
          ` : ''}

          <!-- Clinical Form -->
          <form id="consultation-form" onsubmit="event.preventDefault();">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label"><span class="required">*</span> Chief Complaint / Symptoms</label>
                <input type="text" id="c-complaint" class="form-control" placeholder="e.g. Fever for 3 days with productive cough" required>
              </div>
              <div class="form-group">
                <label class="form-label"><span class="required">*</span> Provisional / Final Diagnosis</label>
                <input type="text" id="c-diagnosis" class="form-control" placeholder="e.g. Acute Viral Bronchitis, Essential Hypertension" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Clinical Examination Findings</label>
                <input type="text" id="c-exam" class="form-control" placeholder="e.g. Chest: Bilateral rhonchi present. Throat: Inflamed pharynx">
              </div>
              <div class="form-group">
                <label class="form-label">Clinical Notes / History</label>
                <input type="text" id="c-notes" class="form-control" placeholder="e.g. No previous history of asthma or allergy">
              </div>
            </div>

            <!-- E-PRESCRIPTION SECTION -->
            <div style="margin-top: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <div style="font-size: 1.1rem; font-weight: 800; color: #00c853; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-family: Georgia, serif; font-size: 1.5rem;">℞</span> Prescribed Medications
                </div>
                <button type="button" onclick="consultationComponent.addMedicineRow()" class="btn btn-outline-primary btn-sm">
                  <i class="fa-solid fa-plus"></i> Add Drug
                </button>
              </div>

              <div class="table-responsive">
                <table class="table" id="rx-drugs-table" style="background: white;">
                  <thead>
                    <tr>
                      <th style="width: 28%;">Medicine (Brand / Generic)</th>
                      <th style="width: 14%;">Form & Strength</th>
                      <th style="width: 14%;">Frequency</th>
                      <th style="width: 14%;">Duration</th>
                      <th style="width: 20%;">Timing Instructions</th>
                      <th style="width: 10%; text-align: center;">Remove</th>
                    </tr>
                  </thead>
                  <tbody id="rx-drugs-tbody">
                    <!-- Dynamic drug rows -->
                  </tbody>
                </table>
              </div>
            </div>



            <!-- ADVICE & FOLLOW-UP -->
            <div class="form-row" style="margin-top: 1.25rem;">
              <div class="form-group">
                <label class="form-label">General Advice & Lifestyle Instructions</label>
                <textarea id="c-advice" class="form-control" rows="2" placeholder="e.g. Plenty of oral fluids, rest, avoid spicy food"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Dietary Restrictions</label>
                <textarea id="c-diet" class="form-control" rows="2" placeholder="e.g. Low sodium salt restriction, avoid oily fried food"></textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Follow-up Review Date</label>
                <input type="date" id="c-followup-date" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Follow-up Instructions</label>
                <input type="text" id="c-followup-notes" class="form-control" placeholder="e.g. Review after 5 days with repeat CBC report">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
              <button type="button" onclick="consultationComponent.submitConsultation(true)" class="btn btn-primary btn-lg">
                <i class="fa-solid fa-print"></i> Save Consultation & Print Formal Rx
              </button>
              <button type="button" onclick="consultationComponent.submitConsultation(false)" class="btn btn-success btn-lg">
                <i class="fa-solid fa-floppy-disk"></i> Save & Finish Consultation
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Add first 2 initial medicine rows
    this.addMedicineRow('Augmentin', 'Tablet', '625mg', '1-0-1', '5 Days', 'After Meal');
    this.addMedicineRow('Panadol Extra', 'Tablet', '500mg', '1-1-1', '3 Days', 'After Meal');
  },

  addMedicineRow(name = '', form = 'Tablet', strength = '500mg', freq = '1-0-1', duration = '5 Days', inst = 'After Meal') {
    const tbody = document.getElementById('rx-drugs-tbody');
    if (!tbody) return;

    const rowId = 'rx-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const tr = document.createElement('tr');
    tr.id = rowId;

    tr.innerHTML = `
      <td>
        <input type="text" list="med-suggestions" class="form-control rx-med-name" value="${name}" placeholder="Type medicine name..." required style="font-weight: 600;">
        <datalist id="med-suggestions">
          ${this.inventoryMeds.map(m => `<option value="${m.brand_name}">${m.generic_name} (${m.strength})</option>`).join('')}
        </datalist>
      </td>
      <td>
        <input type="text" class="form-control rx-med-strength" value="${form} ${strength}" placeholder="Tablet 500mg">
      </td>
      <td>
        <select class="form-control rx-med-freq">
          <option value="1-0-1" ${freq === '1-0-1' ? 'selected' : ''}>1-0-1 (Twice Daily)</option>
          <option value="1-1-1" ${freq === '1-1-1' ? 'selected' : ''}>1-1-1 (Thrice Daily)</option>
          <option value="1-0-0" ${freq === '1-0-0' ? 'selected' : ''}>1-0-0 (Morning)</option>
          <option value="0-0-1" ${freq === '0-0-1' ? 'selected' : ''}>0-0-1 (Night)</option>
          <option value="1-1-1-1" ${freq === '1-1-1-1' ? 'selected' : ''}>1-1-1-1 (Four times)</option>
          <option value="SOS" ${freq === 'SOS' ? 'selected' : ''}>SOS (As needed)</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-control rx-med-duration" value="${duration}" placeholder="e.g. 5 Days">
      </td>
      <td>
        <select class="form-control rx-med-inst">
          <option value="After Meal" ${inst === 'After Meal' ? 'selected' : ''}>After Meal</option>
          <option value="Before Meal" ${inst === 'Before Meal' ? 'selected' : ''}>Before Meal</option>
          <option value="Empty Stomach" ${inst === 'Empty Stomach' ? 'selected' : ''}>Empty Stomach</option>
          <option value="At Bedtime" ${inst === 'At Bedtime' ? 'selected' : ''}>At Bedtime</option>
          <option value="With Food" ${inst === 'With Food' ? 'selected' : ''}>With Food</option>
        </select>
      </td>
      <td style="text-align: center;">
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="btn btn-outline-danger btn-sm" title="Remove Drug">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  },

  async submitConsultation(printPrescription = true) {
    const chief_complaint = document.getElementById('c-complaint').value.trim();
    const diagnosis = document.getElementById('c-diagnosis').value.trim();
    const examination_findings = document.getElementById('c-exam').value.trim();
    const clinical_notes = document.getElementById('c-notes').value.trim();
    const advice = document.getElementById('c-advice').value.trim();
    const dietary_restrictions = document.getElementById('c-diet').value.trim();
    const follow_up_date = document.getElementById('c-followup-date').value;
    const follow_up_instructions = document.getElementById('c-followup-notes').value.trim();

    if (!chief_complaint || !diagnosis) {
      app.toast('Chief Complaint and Diagnosis are required.', 'error');
      return;
    }

    // Collect Prescribed Medicines
    const medicines = [];
    document.querySelectorAll('#rx-drugs-tbody tr').forEach(tr => {
      const name = tr.querySelector('.rx-med-name').value.trim();
      const formStrength = tr.querySelector('.rx-med-strength').value.trim();
      const freq = tr.querySelector('.rx-med-freq').value;
      const duration = tr.querySelector('.rx-med-duration').value.trim();
      const inst = tr.querySelector('.rx-med-inst').value;

      if (name) {
        medicines.push({
          medicine_name: name,
          strength: formStrength,
          frequency: freq,
          duration: duration || '5 Days',
          instruction: inst,
          dosage: '1 unit'
        });
      }
    });

    const res = await app.api('/consultations', {
      method: 'POST',
      body: JSON.stringify({
        appointment_id: this.activeAppointmentId,
        patient_id: this.activePatientId,
        doctor_id: this.activeDoctorId,
        chief_complaint,
        diagnosis,
        examination_findings,
        clinical_notes,
        follow_up_date,
        follow_up_instructions,
        prescription: {
          advice,
          dietary_restrictions,
          medicines
        }
      })
    });

    if (res.success) {
      app.toast('Consultation saved successfully!', 'success');

      if (printPrescription) {
        this.printPrescription(res.consultationId);
      }

      // Reload queue and clear editor
      this.activePatientId = null;
      this.activeAppointmentId = null;
      this.reloadQueue();
      const outlet = document.getElementById('consultation-editor-outlet');
      if (outlet) {
        outlet.innerHTML = `
          <div class="card">
            <div class="card-body" style="text-align: center; padding: 4rem; color: #94a3b8;">
              <i class="fa-solid fa-stethoscope" style="font-size: 3.5rem; color: var(--border-color); margin-bottom: 1rem;"></i>
              <h3 style="color: var(--text-main); font-size: 1.25rem; font-weight: 700;">Select a Patient to Begin Consultation</h3>
              <p style="font-size: 0.85rem; max-width: 450px; margin: 0.5rem auto 1.5rem auto;">
                Choose a waiting patient from the queue on the left, or search a registered patient to record diagnosis and write an electronic prescription.
              </p>
              <button onclick="consultationComponent.openPatientSearchModal()" class="btn btn-primary">
                <i class="fa-solid fa-magnifying-glass"></i> Search Registered Patient
              </button>
            </div>
          </div>
        `;
      }
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to save consultation', 'error');
    }
  },

  load() {
    this.reloadQueue();
  },

  async printPrescription(consultationId) {
    const res = await app.api(`/consultations/${consultationId}`);
    if (!res.success) return;

    const c = res.data;
    const p = {
      mrn: c.mrn,
      name: c.patient_name,
      gender: c.gender,
      age: c.age,
      phone: c.patient_phone,
      blood: c.blood_group,
      allergies: c.allergies
    };

    const rxHtml = `
      <div class="prescription-layout">
        <div class="rx-header">
          <div>
            <div class="rx-clinic-title">${app.clinic.name}</div>
            <div class="rx-clinic-sub">${app.clinic.address}</div>
            <div class="rx-clinic-sub">Phone: ${app.clinic.phone} • 24/7 Helpline: +92 300 1122334</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--cyber-green);">${c.doctor_name}</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${c.doctor_qualification}</div>
            <div style="font-size: 0.8rem; color: #0284c7;">${c.doctor_specialty}</div>
          </div>
        </div>

        <div class="rx-patient-bar">
          <div><strong>MRN:</strong> ${p.mrn}</div>
          <div><strong>Patient:</strong> ${p.name}</div>
          <div><strong>Gender / Age:</strong> ${p.gender} / ${p.age} Yrs</div>
          <div><strong>Date:</strong> ${new Date(c.consultation_date).toLocaleDateString()}</div>
        </div>

        ${p.allergies ? `
          <div style="background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 0.4rem 0.85rem; border-radius: 6px; font-size: 0.8rem; margin-bottom: 1rem;">
            <strong>Allergies:</strong> ${p.allergies}
          </div>
        ` : ''}

        <div style="margin-bottom: 1.25rem; font-size: 0.9rem;">
          <div><strong>Chief Complaint:</strong> ${c.chief_complaint}</div>
          <div><strong>Diagnosis:</strong> <span style="font-weight: 800; color: #007a33;">${c.diagnosis}</span></div>
          ${c.examination_findings ? `<div><strong>Examination:</strong> ${c.examination_findings}</div>` : ''}
        </div>

        <div class="rx-symbol">℞</div>

        <!-- Medicines Table -->
        ${c.medicines && c.medicines.length > 0 ? `
          <table class="table" style="font-size: 0.9rem; margin-bottom: 1.5rem; border: 1px solid #e2e8f0;">
            <thead style="background: #f8fafc;">
              <tr>
                <th style="width: 35%;">Medicine Name</th>
                <th style="width: 20%;">Dosage / Form</th>
                <th style="width: 15%;">Frequency</th>
                <th style="width: 15%;">Duration</th>
                <th style="width: 15%;">Instruction</th>
              </tr>
            </thead>
            <tbody>
              ${c.medicines.map((m, idx) => `
                <tr>
                  <td><strong>${idx + 1}. ${m.medicine_name}</strong></td>
                  <td>${m.dosage_form} ${m.strength}</td>
                  <td><strong style="color: #00c853;">${m.frequency}</strong></td>
                  <td>${m.duration}</td>
                  <td>${m.instruction}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="color: #64748b;">No medications prescribed.</p>'}

        <!-- Advice & Instructions -->
        ${c.advice || c.dietary_restrictions ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.85rem;">
            ${c.advice ? `<div style="margin-bottom: 0.35rem;"><strong>Doctor Advice:</strong> ${c.advice}</div>` : ''}
            ${c.dietary_restrictions ? `<div><strong>Dietary Restrictions:</strong> ${c.dietary_restrictions}</div>` : ''}
          </div>
        ` : ''}

        <!-- Follow-up -->
        ${c.follow_up_date ? `
          <div style="font-size: 0.85rem; color: #0284c7; margin-bottom: 2rem;">
            <strong>Next Follow-up Review:</strong> ${new Date(c.follow_up_date).toLocaleDateString()} ${c.follow_up_instructions ? `(${c.follow_up_instructions})` : ''}
          </div>
        ` : ''}

        <!-- Doctor Signature Footer -->
        <div style="margin-top: 4rem; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 0.75rem; color: #94a3b8;">
            <div>* Electronic Medical Prescription generated from Dream Garden PolyClinic System *</div>
            <div style="margin-top: 4px; font-weight: 700; color: #475569;">Made by AR Works.</div>
          </div>
          <div style="text-align: center; border-top: 1.5px solid #0f172a; width: 220px; padding-top: 6px;">
            <div style="font-weight: 700; font-size: 0.9rem;">${c.doctor_name}</div>
            <div style="font-size: 0.75rem; color: #64748b;">Authorized Signature & Stamp</div>
          </div>
        </div>
      </div>
    `;

    app.printDocument(rxHtml);
  },

  async openPatientSearchModal() {
    const res = await app.api('/patients?limit=100');
    const patients = res.data || [];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Select Patient from Directory</label>
        <select id="sw-patient-select" class="form-control" size="8" style="height: auto;">
          ${patients.map(p => `
            <option value="${p.id}">${p.mrn} - ${p.full_name} (${p.phone}) - ${p.gender}, ${p.age} Yrs</option>
          `).join('')}
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="consultationComponent.selectPatientFromModal()">Open Consultation Workspace</button>
    `;

    app.openModal('<i class="fa-solid fa-user-check"></i> Choose Patient for Consultation', bodyHtml, footerHtml);
  },

  selectPatientFromModal() {
    const sel = document.getElementById('sw-patient-select');
    if (!sel || !sel.value) {
      app.toast('Please select a patient.', 'warning');
      return;
    }
    const patientId = sel.value;
    app.closeModal();
    this.loadPatientWorkspace(patientId);
  }
};
