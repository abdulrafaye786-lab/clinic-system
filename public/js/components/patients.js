// ==========================================================================
// PATIENTS COMPONENT - PATIENT REGISTRY & 360 MEDICAL RECORDS
// ==========================================================================

const patientsComponent = {
  currentSearch: '',

  async render(container) {
    container.innerHTML = `
      <div class="card u-morphism-card">
        <div class="card-header" style="padding: 0.55rem 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <div class="card-title" style="margin-bottom: 0; font-size: 0.95rem;">
              <i class="fa-solid fa-hospital-user" style="color: var(--primary);"></i> Registered Patients Directory
            </div>
            <span class="badge badge-teal" id="stat-total-patients-pill" style="font-weight: 800; font-size: 0.72rem; padding: 0.15rem 0.45rem;">0 Patients</span>
            <div class="search-box">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="patient-search-input" placeholder="Search by MRN, Name, Phone..." oninput="patientsComponent.handleSearch(this.value)" style="height: 28px; font-size: 0.76rem;">
            </div>
          </div>

          <div style="display: flex; gap: 0.4rem;">
            <button onclick="app.openNewPatientModal()" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;" title="Register New Patient [Alt + N]">
              <i class="fa-solid fa-user-plus"></i> Register Patient <span style="opacity: 0.75; font-size: 0.7rem; font-weight: 500; margin-left: 2px;">[Alt+N]</span>
            </button>
          </div>
        </div>

        <div class="table-responsive table-viewport" style="max-height: calc(100vh - 170px); overflow-y: auto;">
          <table class="table table-dense" style="min-width: 900px; width: 100%;">
            <thead style="position: sticky; top: 0; z-index: 5;">
              <tr>
                <th style="width: 100px;">MRN</th>
                <th style="min-width: 220px;">Patient Name & Demographics</th>
                <th style="width: 150px;">Contact Phone</th>
                <th style="width: 100px;">Blood</th>
                <th style="width: 100px;">Total Visits</th>
                <th style="text-align: right; min-width: 220px;">Actions</th>
              </tr>
            </thead>
            <tbody id="patients-table-body">
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Loading patients registry...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.load();
  },

  handleSearch(val) {
    this.currentSearch = val;
    this.load();
  },

  async load() {
    const handlePatientsRes = (res) => {
      if (!res || !res.success) return;
      const tbody = document.getElementById('patients-table-body');
      if (!tbody) return;

      const patients = res.data || [];
      this.patientsList = patients;

      const totalPill = document.getElementById('stat-total-patients-pill');
      if (totalPill) totalPill.textContent = `${patients.length} Patient${patients.length === 1 ? '' : 's'}`;

      if (patients.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3.5rem; color: #94a3b8;">
              <i class="fa-regular fa-user" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; color: #cbd5e1;"></i>
              No patient records found matching "${this.currentSearch}".
            </td>
          </tr>
        `;
        return;
      }

      const avatarGradients = [
        'avatar-teal', 'avatar-blue', 'avatar-purple', 'avatar-indigo', 'avatar-rose', 'avatar-amber', 'avatar-emerald'
      ];

      tbody.innerHTML = patients.map((p, idx) => {
        const avatarClass = p.gender === 'Female' ? 'avatar-rose' : (avatarGradients[idx % avatarGradients.length]);
        const initials = (p.full_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const totalVisitsCount = parseInt(p.total_visits || 0, 10);

        return `
          <tr>
            <td class="cell-nowrap">
              <span style="font-family: monospace; font-weight: 800; color: var(--cyber-green); background: var(--cyber-green-light); padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid rgba(5, 181, 85, 0.25); font-size: 0.85rem; white-space: nowrap;">
                ${p.mrn}
              </span>
            </td>
            <td class="patient-details-cell">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="avatar-bubble ${avatarClass}" style="flex-shrink: 0; cursor: pointer;" onclick="app.openPatientHistoryModal(${p.id})" title="View 360 EHR Record">${initials}</div>
                <div>
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; white-space: nowrap; cursor: pointer;" onclick="app.openPatientHistoryModal(${p.id})" title="View 360 EHR Record">${p.full_name}</div>
                  <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap;">
                    <span class="badge ${p.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${p.gender}</span>
                    <span style="font-weight: 600; color: var(--text-body); margin-left: 3px;">${p.age} Yrs</span>
                    ${p.address ? `• <span style="color: var(--text-muted);">${p.address}</span>` : ''}
                  </div>
                </div>
              </div>
            </td>
            <td class="cell-nowrap">
              <div style="font-weight: 700; color: var(--cyber-green-dark); white-space: nowrap;"><i class="fa-solid fa-phone" style="font-size: 0.75rem; margin-right: 3px;"></i>${p.phone}</div>
            </td>
            <td class="cell-nowrap">
              <span class="badge ${p.blood_group && p.blood_group !== 'Unknown' ? 'badge-rose' : 'badge-gray'}" style="font-weight: 800; white-space: nowrap;">
                <i class="fa-solid fa-droplet" style="color: #f43f5e;"></i> ${p.blood_group || 'Unknown'}
              </span>
            </td>
            <td class="cell-nowrap">
              <span class="badge ${totalVisitsCount > 0 ? 'badge-teal' : 'badge-gray'}" style="font-weight: 700; white-space: nowrap;">
                ${totalVisitsCount} Visit${totalVisitsCount === 1 ? '' : 's'}
              </span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: inline-flex; gap: 0.4rem; align-items: center;">
                <button onclick="app.openBookAppointmentModal(${p.id})" class="btn btn-outline-primary btn-sm" title="Book Appointment for this Patient">
                  <i class="fa-solid fa-calendar-plus"></i> Book
                </button>
                <button onclick="app.openPatientHistoryModal(${p.id})" class="btn btn-primary btn-sm" title="View 360 EHR Record" style="box-shadow: var(--green-glow);">
                  <i class="fa-solid fa-folder-open"></i> 360 EHR
                </button>
                <button onclick="patientsComponent.openEditPatientModal(${p.id})" class="btn-edit-action" title="Re-edit Patient Information">
                  <i class="fa-solid fa-pen-to-square"></i> Re-edit
                </button>
                <button onclick="patientsComponent.deletePatient(${p.id}, '${p.full_name.replace(/'/g, "\\'")}')" class="btn btn-outline btn-sm" title="Delete Patient Record" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3);">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    };

    const endpoint = `/patients?search=${encodeURIComponent(this.currentSearch)}`;
    const res = await app.swrApi(endpoint, (fresh) => {
      handlePatientsRes(fresh);
    }, 20000);

    if (res && res.success) {
      handlePatientsRes(res);
    }
  },



  async viewPatientDossier(patientId) {
    const res = await app.api(`/patients/${patientId}`);
    if (!res.success) return;

    const data = res.data;
    const p = data.patient;
    const vitals = data.vitals || [];
    const consults = data.consultations || [];
    const labOrders = data.labOrders || [];
    const invoices = data.invoices || [];

    const bodyHtml = `
      <!-- Top Patient Dossier Header -->
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 1.35rem; font-weight: 800;">${p.full_name}</div>
            <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
              <span style="color: #2dd4bf; font-weight: 700;">MRN: ${p.mrn}</span> • ${p.gender}, ${p.age} Years • Blood: <strong>${p.blood_group}</strong> • Phone: <strong>${p.phone}</strong>
            </div>
            <div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 0.35rem;">
              <i class="fa-solid fa-location-dot" style="color: #38bdf8;"></i> ${p.address || 'No address registered'}
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button onclick="patientsComponent.openEditPatientModal(${p.id})" class="btn btn-outline-primary btn-sm" style="background: rgba(255,255,255,0.1); border-color: #2dd4bf; color: #2dd4bf;" title="Re-edit Patient Information">
              <i class="fa-solid fa-user-pen"></i> Edit Patient Info
            </button>
            <button onclick="patientsComponent.printMedicalSummary(${p.id})" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-print"></i> Print Medical Summary
            </button>
          </div>
        </div>

        <!-- Clinical Alerts Banner -->
        <div style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
          <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.8rem;">
            <strong><i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> Known Allergies:</strong> ${p.allergies || 'No known drug allergies (NKDA)'}
          </div>
          <div style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.8rem;">
            <strong><i class="fa-solid fa-heart-circle-check" style="color: #38bdf8;"></i> Chronic Conditions:</strong> ${p.chronic_conditions || 'None reported'}
          </div>
        </div>
      </div>

      <!-- Tabbed Navigation Inside Dossier -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.25rem; gap: 0.5rem;">
        <button class="btn btn-sm btn-outline-primary active" id="tab-btn-vitals" onclick="patientsComponent.switchDossierTab('vitals')">
          <i class="fa-solid fa-heart-pulse"></i> Vitals Timeline (${vitals.length})
        </button>
        <button class="btn btn-sm btn-outline" id="tab-btn-consults" onclick="patientsComponent.switchDossierTab('consults')">
          <i class="fa-solid fa-stethoscope"></i> Consultations & Rx (${consults.length})
        </button>
        <button class="btn btn-sm btn-outline" id="tab-btn-billing" onclick="patientsComponent.switchDossierTab('billing')">
          <i class="fa-solid fa-file-invoice-dollar"></i> Billing History (${invoices.length})
        </button>
      </div>

      <!-- TAB 1: VITALS -->
      <div id="dossier-tab-vitals" class="dossier-tab-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">Recorded Vitals History</h4>
          <button onclick="patientsComponent.openAddVitalsModal(${p.id}, '${p.full_name}')" class="btn btn-outline-primary btn-sm">
            <i class="fa-solid fa-plus"></i> Record New Vitals
          </button>
        </div>
        ${vitals.length === 0 ? '<p style="color: #94a3b8; text-align: center; padding: 2rem;">No vitals recorded yet.</p>' : `
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Blood Pressure</th>
                  <th>Pulse</th>
                  <th>Temp (°F)</th>
                  <th>SpO2</th>
                  <th>Weight / BMI</th>
                  <th>Blood Sugar</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                ${vitals.map(v => `
                  <tr>
                    <td><strong>${v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : '-'}</strong></td>
                    <td><span style="font-weight: 700; color: #007a33;">${v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp} mmHg` : '-'}</span></td>
                    <td>${v.pulse_rate ? `${v.pulse_rate} bpm` : '-'}</td>
                    <td>${v.temperature_f ? `${v.temperature_f} °F` : '-'}</td>
                    <td>${v.spo2 ? `<span class="badge ${v.spo2 < 95 ? 'badge-rose' : 'badge-teal'}">${v.spo2}%</span>` : '-'}</td>
                    <td>${v.weight_kg ? `${v.weight_kg} kg (BMI: ${v.bmi || '-'})` : '-'}</td>
                    <td>${v.blood_sugar_random ? `R: ${v.blood_sugar_random} mg/dL` : (v.blood_sugar_fasting ? `F: ${v.blood_sugar_fasting} mg/dL` : '-')}</td>
                    <td><small style="color: #64748b;">${v.recorded_by || 'Nurse'}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- TAB 2: CONSULTATIONS & RX -->
      <div id="dossier-tab-consults" class="dossier-tab-content" style="display: none;">
        ${consults.length === 0 ? '<p style="color: #94a3b8; text-align: center; padding: 2rem;">No consultation records found.</p>' : `
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            ${consults.map(c => `
              <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; background: #ffffff;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
                  <div>
                    <strong style="color: #00c853; font-size: 1rem;"><i class="fa-solid fa-user-doctor"></i> ${c.doctor_name}</strong>
                    <span style="font-size: 0.8rem; color: #64748b;">(${c.doctor_specialty})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 0.8rem; color: #64748b;"><i class="fa-regular fa-clock"></i> ${new Date(c.consultation_date).toLocaleString()}</span>
                    <button onclick="consultationComponent.printPrescription(${c.id})" class="btn btn-outline-primary btn-sm">
                      <i class="fa-solid fa-print"></i> Print Rx
                    </button>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; margin-bottom: 0.75rem;">
                  <div><strong>Chief Complaint:</strong> ${c.chief_complaint}</div>
                  <div><strong>Diagnosis:</strong> <span class="badge badge-teal">${c.diagnosis}</span></div>
                </div>

                ${c.medicines && c.medicines.length > 0 ? `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem; margin-top: 0.75rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: #007a33; margin-bottom: 0.5rem;"><i class="fa-solid fa-pills"></i> Prescribed Medications:</div>
                    <table class="table" style="font-size: 0.8rem; background: white;">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Form & Strength</th>
                          <th>Dosage & Frequency</th>
                          <th>Duration</th>
                          <th>Instruction</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${c.medicines.map(m => `
                          <tr>
                            <td><strong>${m.medicine_name}</strong> <small style="color:#64748b;">(${m.generic_name || ''})</small></td>
                            <td>${m.dosage_form} ${m.strength}</td>
                            <td><span class="badge badge-blue">${m.frequency}</span> (${m.dosage})</td>
                            <td>${m.duration}</td>
                            <td>${m.instruction}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
          </div>

      <!-- TAB 4: BILLING -->
      <div id="dossier-tab-billing" class="dossier-tab-content" style="display: none;">
        ${invoices.length === 0 ? '<p style="color: #94a3b8; text-align: center; padding: 2rem;">No invoices generated.</p>' : `
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(inv => `
                  <tr>
                    <td><strong>${inv.invoice_number}</strong></td>
                    <td>${new Date(inv.created_at).toLocaleDateString()}</td>
                    <td><strong>${app.clinic.currency} ${parseFloat(inv.total_amount).toLocaleString()}</strong></td>
                    <td style="color: #10b981;">${app.clinic.currency} ${parseFloat(inv.paid_amount).toLocaleString()}</td>
                    <td style="color: #ef4444;">${app.clinic.currency} ${parseFloat(inv.balance_due).toLocaleString()}</td>
                    <td><span class="badge ${inv.payment_status === 'paid' ? 'badge-green' : (inv.payment_status === 'partial' ? 'badge-amber' : 'badge-rose')}">${inv.payment_status}</span></td>
                    <td>
                      <button onclick="billingComponent.printInvoice(${inv.id}, 'pos')" class="btn btn-outline btn-sm"><i class="fa-solid fa-receipt"></i> Slip</button>
                      <button onclick="billingComponent.printInvoice(${inv.id}, 'a4')" class="btn btn-outline-primary btn-sm"><i class="fa-solid fa-file-invoice"></i> A4</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-primary" onclick="app.closeModal()">Close Dossier</button>
    `;

    app.openModal(`<i class="fa-solid fa-id-card-clip"></i> Patient Electronic Health Record (EHR)`, bodyHtml, footerHtml, 'modal-xl');
  },

  switchDossierTab(tabName) {
    document.querySelectorAll('.dossier-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#tab-btn-vitals, #tab-btn-consults, #tab-btn-labs, #tab-btn-billing').forEach(el => {
      el.classList.remove('btn-outline-primary');
      el.classList.add('btn-outline');
    });

    const activeTab = document.getElementById(`dossier-tab-${tabName}`);
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeTab) activeTab.style.display = 'block';
    if (activeBtn) {
      activeBtn.classList.remove('btn-outline');
      activeBtn.classList.add('btn-outline-primary');
    }
  },

  openAddVitalsModal(patientId, patientName) {
    const bodyHtml = `
      <form id="vitals-entry-form">
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1rem;">
          Recording vital signs for: <strong style="color: #00c853;">${patientName}</strong>
        </p>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Systolic BP (mmHg)</label>
            <input type="number" id="v-sys" class="form-control" placeholder="e.g. 120">
          </div>
          <div class="form-group">
            <label class="form-label">Diastolic BP (mmHg)</label>
            <input type="number" id="v-dia" class="form-control" placeholder="e.g. 80">
          </div>
          <div class="form-group">
            <label class="form-label">Pulse Rate (bpm)</label>
            <input type="number" id="v-pulse" class="form-control" placeholder="e.g. 72">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Temperature (°F)</label>
            <input type="number" step="0.1" id="v-temp" class="form-control" placeholder="e.g. 98.6">
          </div>
          <div class="form-group">
            <label class="form-label">Oxygen SpO2 (%)</label>
            <input type="number" id="v-spo2" class="form-control" placeholder="e.g. 98">
          </div>
          <div class="form-group">
            <label class="form-label">Resp. Rate (/min)</label>
            <input type="number" id="v-resp" class="form-control" placeholder="e.g. 16">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Weight (kg)</label>
            <input type="number" step="0.1" id="v-weight" class="form-control" placeholder="e.g. 70.5">
          </div>
          <div class="form-group">
            <label class="form-label">Height (cm)</label>
            <input type="number" step="0.1" id="v-height" class="form-control" placeholder="e.g. 175">
          </div>
          <div class="form-group">
            <label class="form-label">Random Blood Sugar (mg/dL)</label>
            <input type="number" step="0.1" id="v-sugar" class="form-control" placeholder="e.g. 120">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Clinical Observations / Notes</label>
          <input type="text" id="v-notes" class="form-control" placeholder="e.g. Patient feels slightly dizzy">
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="patientsComponent.submitVitals(${patientId})"><i class="fa-solid fa-save"></i> Save Vitals</button>
    `;

    app.openModal(`<i class="fa-solid fa-heart-pulse"></i> Record Patient Vitals`, bodyHtml, footerHtml);
  },

  async submitVitals(patientId) {
    const systolic_bp = document.getElementById('v-sys').value;
    const diastolic_bp = document.getElementById('v-dia').value;
    const pulse_rate = document.getElementById('v-pulse').value;
    const temperature_f = document.getElementById('v-temp').value;
    const spo2 = document.getElementById('v-spo2').value;
    const respiratory_rate = document.getElementById('v-resp').value;
    const weight_kg = document.getElementById('v-weight').value;
    const height_cm = document.getElementById('v-height').value;
    const blood_sugar_random = document.getElementById('v-sugar').value;
    const notes = document.getElementById('v-notes').value;

    const res = await app.api(`/patients/${patientId}/vitals`, {
      method: 'POST',
      body: JSON.stringify({
        systolic_bp,
        diastolic_bp,
        pulse_rate,
        temperature_f,
        spo2,
        respiratory_rate,
        weight_kg,
        height_cm,
        blood_sugar_random,
        notes
      })
    });

    if (res.success) {
      app.toast('Vitals recorded successfully!', 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to save vitals', 'error');
    }
  },

  async openEditPatientModal(patientIdOrObj) {
    let p = null;
    if (patientIdOrObj && typeof patientIdOrObj === 'object') {
      p = patientIdOrObj;
    } else {
      // Look up in-memory cache first (from patientHistoryComponent or patientsComponent)
      if (typeof patientHistoryComponent !== 'undefined' && patientHistoryComponent.patientsList) {
        p = patientHistoryComponent.patientsList.find(item => item.id == patientIdOrObj);
      }
      if (!p && this.patientsList) {
        p = this.patientsList.find(item => item.id == patientIdOrObj);
      }
      if (!p) {
        const res = await app.api(`/patients/${patientIdOrObj}?basic=true`);
        if (!res.success) return;
        p = res.data.patient;
      }
    }
    if (!p) return;

    const bodyHtml = `
      <form id="edit-patient-form">
        <!-- Row 1: Core Demographics (Name, Gender, Blood) -->
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.65rem; margin-bottom: 0.55rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label"><span class="required">*</span> Full Name</label>
            <input type="text" id="ep-name" class="form-control" value="${p.full_name}" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label"><span class="required">*</span> Gender</label>
            <select id="ep-gender" class="form-control" required>
              <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Blood Group</label>
            <select id="ep-blood" class="form-control">
              ${['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => `
                <option value="${bg}" ${p.blood_group === bg ? 'selected' : ''}>${bg}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Row 2: Contact, Date of Birth & Identification -->
        <div style="display: grid; grid-template-columns: 1.2fr 1.1fr 1.1fr; gap: 0.65rem; margin-bottom: 0.55rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label"><span class="required">*</span> Phone (Digits Only)</label>
            <input type="tel" id="ep-phone" class="form-control" value="${p.phone || ''}" placeholder="03001234567" maxlength="11" oninput="this.value = this.value.replace(/\\D/g, '').slice(0, 11)" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <label class="form-label" style="margin-bottom: 0;"><span class="required">*</span> Date of Birth</label>
              <div id="ep-age-display">
                ${p.age ? `<span class="badge badge-teal" style="font-size: 0.76rem; font-weight: 800;"><i class="fa-solid fa-cake-candles"></i> ${p.age} Yrs</span>` : ''}
              </div>
            </div>
            <input type="date" id="ep-dob" class="form-control" value="${p.dob ? new Date(p.dob).toISOString().slice(0,10) : ''}" onchange="app.calcAgeFromDob('ep-dob', 'ep-age-display')" oninput="app.calcAgeFromDob('ep-dob', 'ep-age-display')" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">CNIC (13 Digits Only)</label>
            <input type="text" id="ep-cnic" class="form-control" value="${(p.cnic || '').replace(/\\D/g, '')}" placeholder="3520212345671" maxlength="13" oninput="this.value = this.value.replace(/\\D/g, '').slice(0, 13)">
          </div>
        </div>

        <!-- Row 3: Residence, Email & Marital Status -->
        <div style="display: grid; grid-template-columns: 1.8fr 1.3fr 1fr; gap: 0.65rem; margin-bottom: 0.55rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Residential Address</label>
            <input type="text" id="ep-address" class="form-control" value="${p.address || ''}" placeholder="House #, Street, Block, Area / City">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Email Address (Optional)</label>
            <input type="email" id="ep-email" class="form-control" value="${p.email || ''}" placeholder="patient@example.com">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Marital Status</label>
            <select id="ep-marital" class="form-control">
              ${['Single', 'Married', 'Divorced', 'Widowed'].map(m => `
                <option value="${m}" ${p.marital_status === m ? 'selected' : ''}>${m}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Row 4: Clinical History & Alerts -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label"><i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i> Known Allergies</label>
            <input type="text" id="ep-allergies" class="form-control" value="${p.allergies || ''}" placeholder="e.g. Penicillin, NSAIDs (or None)">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label"><i class="fa-solid fa-heart-pulse" style="color: var(--primary);"></i> Chronic Conditions</label>
            <input type="text" id="ep-chronic" class="form-control" value="${p.chronic_conditions || ''}" placeholder="e.g. Diabetes, Hypertension">
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" class="btn btn-outline btn-sm" style="color: var(--wine-red); border-color: var(--wine-red);" onclick="patientsComponent.deletePatient(${p.id}, '${p.full_name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-trash-can"></i> Delete Patient Record
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline btn-sm" onclick="app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="patientsComponent.submitEditPatient(${p.id})"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
        </div>
      </div>
    `;

    app.openModal(`<i class="fa-solid fa-user-pen"></i> Update Patient Information (${p.mrn})`, bodyHtml, footerHtml, 'modal-lg');
  },

  async submitEditPatient(patientId) {
    const full_name = document.getElementById('ep-name').value.trim();
    const gender = document.getElementById('ep-gender').value;
    const phone = document.getElementById('ep-phone').value.replace(/\\D/g, '').trim();
    const dob = document.getElementById('ep-dob').value;
    const age = app.calcAgeFromDob('ep-dob', 'ep-age-display') || 0;
    const blood_group = document.getElementById('ep-blood').value;
    const cnic = document.getElementById('ep-cnic').value.replace(/\\D/g, '').trim();
    const email = document.getElementById('ep-email').value.trim();
    const marital_status = document.getElementById('ep-marital').value;
    const address = document.getElementById('ep-address').value.trim();
    const allergies = document.getElementById('ep-allergies').value.trim();
    const chronic_conditions = document.getElementById('ep-chronic').value.trim();

    app.clearAllHighlights(document.getElementById('edit-patient-form'));

    let hasError = false;
    if (!full_name || full_name.length < 2) {
      app.highlightField('ep-name', 'Full name is required');
      hasError = true;
    }
    if (!phone || phone.length < 10) {
      app.highlightField('ep-phone', 'Please enter a valid phone number (10-11 digits only)');
      hasError = true;
    }
    if (cnic && cnic.length !== 13) {
      app.highlightField('ep-cnic', 'CNIC Number must be exactly 13 digits');
      hasError = true;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      app.highlightField('ep-email', 'Please enter a valid email address or leave blank');
      hasError = true;
    }
    if (!dob) {
      app.highlightField('ep-dob', 'Date of birth is required');
      hasError = true;
    }

    if (hasError) {
      app.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const res = await app.api(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify({
        full_name,
        gender,
        phone,
        dob,
        age,
        blood_group,
        cnic,
        email,
        marital_status,
        address,
        allergies,
        chronic_conditions
      })
    });

    if (res.success) {
      app.toast('Patient profile updated successfully!', 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to update patient', 'error');
    }
  },

  async printMedicalSummary(patientId) {
    const res = await app.api(`/patients/${patientId}`);
    if (!res.success) return;
    const { patient: p, vitals, consultations } = res.data;

    const summaryHtml = `
      <div class="prescription-layout">
        <div class="rx-header">
          <div>
            <div class="rx-clinic-title">${app.clinic.name}</div>
            <div class="rx-clinic-sub">${app.clinic.address} • Phone: ${app.clinic.phone}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">PATIENT MEDICAL DOSSIER</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Printed: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="rx-patient-bar">
          <div><strong>MRN:</strong> ${p.mrn}</div>
          <div><strong>Name:</strong> ${p.full_name}</div>
          <div><strong>Gender/Age:</strong> ${p.gender} / ${p.age} Yrs</div>
          <div><strong>Blood:</strong> ${p.blood_group}</div>
        </div>

        <div style="margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div style="margin-bottom: 0.4rem;"><strong>Allergies:</strong> ${p.allergies || 'No Known Drug Allergies'}</div>
          <div><strong>Chronic Conditions:</strong> ${p.chronic_conditions || 'None reported'}</div>
        </div>

        <h3 style="font-size: 1.1rem; color: #00c853; border-bottom: 1px solid #00c853; padding-bottom: 0.25rem; margin-bottom: 0.75rem;">Past Consultations & Diagnoses</h3>
        ${consultations.length === 0 ? '<p>No past consultations recorded.</p>' : `
          <table class="table" style="font-size: 0.85rem; margin-bottom: 1.5rem;">
            <thead>
              <tr><th>Date</th><th>Doctor</th><th>Complaint</th><th>Diagnosis</th></tr>
            </thead>
            <tbody>
              ${consultations.map(c => `
                <tr>
                  <td>${new Date(c.consultation_date).toLocaleDateString()}</td>
                  <td>${c.doctor_name} (${c.doctor_specialty})</td>
                  <td>${c.chief_complaint}</td>
                  <td><strong>${c.diagnosis}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <div style="margin-top: 3rem; display: flex; justify-content: space-between;">
          <div style="font-size: 0.8rem; color: #94a3b8;">* Electronic Health Record Document generated from Dream Garden PolyClinic System *</div>
          <div style="text-align: center; border-top: 1px solid #333; width: 200px; padding-top: 4px; font-size: 0.85rem;">
            Medical Officer Signature
          </div>
        </div>
      </div>
    `;

    app.printDocument(summaryHtml);
  },

  async deletePatient(patientId, patientName) {
    if (!confirm(`Are you sure you want to delete patient "${patientName}"? This will permanently remove the patient profile and all associated vitals, appointments, and medical history from the database.`)) {
      return;
    }
    const res = await app.api(`/patients/${patientId}`, { method: 'DELETE' });
    if (res.success) {
      app.toast(`Patient "${patientName}" deleted successfully from Supabase database!`, 'success');
      app.closeModal();
      if (app.clearClientCache) {
        app.clearClientCache('/patients');
      }
      this.load();
      if (typeof patientHistoryComponent !== 'undefined' && patientHistoryComponent.loadPatientsList) {
        patientHistoryComponent.loadPatientsList();
      }
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to delete patient', 'error');
    }
  }
};
