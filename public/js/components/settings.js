// ==========================================================================
// SETTINGS & USER ROLES COMPONENT
// ==========================================================================

const settingsComponent = {
  activeTab: 'clinic', // 'clinic', 'users', 'guide'

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <button class="btn btn-sm ${this.activeTab === 'clinic' ? 'btn-primary' : 'btn-outline'}" onclick="settingsComponent.switchTab('clinic')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-hospital"></i> Clinic Profile & Setup
          </button>
          <button class="btn btn-sm ${this.activeTab === 'users' ? 'btn-primary' : 'btn-outline'}" onclick="settingsComponent.switchTab('users')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-users-gear"></i> Staff Users & Permissions
          </button>
          <button class="btn btn-sm ${this.activeTab === 'guide' ? 'btn-primary' : 'btn-outline'}" onclick="settingsComponent.switchTab('guide')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem; border-color: #059669;">
            <i class="fa-solid fa-book-medical"></i> Application User Guide & Manual
          </button>
        </div>

        <div id="settings-header-action">
          <!-- Context action -->
        </div>
      </div>

      <div id="settings-content-area">
        <!-- Loaded dynamically -->
      </div>
    `;

    this.switchTab(this.activeTab);
  },

  switchTab(tab) {
    this.activeTab = tab;
    const actionEl = document.getElementById('settings-header-action');
    const contentEl = document.getElementById('settings-content-area');
    if (!contentEl) return;

    if (tab === 'clinic') {
      if (actionEl) actionEl.innerHTML = '';
      this.renderClinicSettings(contentEl);
    } else if (tab === 'users') {
      if (actionEl) {
        actionEl.innerHTML = `
          <button onclick="settingsComponent.openAddUserModal()" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">
            <i class="fa-solid fa-user-plus"></i> Add Staff Account
          </button>
        `;
      }
      this.renderUsers(contentEl);
    } else if (tab === 'guide') {
      if (actionEl) {
        actionEl.innerHTML = `
          <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
            <i class="fa-solid fa-circle-check" style="color: #059669;"></i> Interactive Workflow Manual
          </div>
        `;
      }
      this.renderUserGuide(contentEl);
    }
  },

  // USER GUIDE & OPERATIONAL MANUAL
  renderUserGuide(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">

        <!-- Quick Start Workflow Hero Banner -->
        <div style="background: linear-gradient(135deg, #062319 0%, #0d3829 60%, #0f4633 100%); color: #ffffff; border-radius: 12px; padding: 1.25rem 1.5rem; position: relative; overflow: hidden; box-shadow: 0 10px 25px rgba(6, 35, 25, 0.25);">
          <div style="position: absolute; right: -20px; top: -20px; width: 140px; height: 140px; background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #34d399;">
              <i class="fa-solid fa-compass"></i>
            </div>
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: -0.01em;">Dream Garden PolyClinic — Quick Operational Guide</h2>
              <p style="font-size: 0.75rem; margin: 0; color: #a7f3d0;">Standard Operating Procedures (SOP) & step-by-step instructions for front-desk, consultants, and clinic staff.</p>
            </div>
          </div>

          <!-- Step Progress Ribbon -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.65rem; margin-top: 1rem;">
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 0.6rem 0.75rem;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #34d399; margin-bottom: 0.2rem;">STEP 1</div>
              <div style="font-size: 0.78rem; font-weight: 700;">Check Roster</div>
              <div style="font-size: 0.67rem; color: rgba(255, 255, 255, 0.7);">Doctors & Rosters</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 0.6rem 0.75rem;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #34d399; margin-bottom: 0.2rem;">STEP 2</div>
              <div style="font-size: 0.78rem; font-weight: 700;">Issue Token</div>
              <div style="font-size: 0.67rem; color: rgba(255, 255, 255, 0.7);">Appointments Queue</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 0.6rem 0.75rem;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #34d399; margin-bottom: 0.2rem;">STEP 3</div>
              <div style="font-size: 0.78rem; font-weight: 700;">Vitals & Consultation</div>
              <div style="font-size: 0.67rem; color: rgba(255, 255, 255, 0.7);">Patient Records</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 0.6rem 0.75rem;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #34d399; margin-bottom: 0.2rem;">STEP 4</div>
              <div style="font-size: 0.78rem; font-weight: 700;">Billing & POS</div>
              <div style="font-size: 0.67rem; color: rgba(255, 255, 255, 0.7);">Thermal Receipt</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 0.6rem 0.75rem;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #34d399; margin-bottom: 0.2rem;">STEP 5</div>
              <div style="font-size: 0.78rem; font-weight: 700;">History & Reports</div>
              <div style="font-size: 0.67rem; color: rgba(255, 255, 255, 0.7);">All Patients & Dashboard</div>
            </div>
          </div>
        </div>

        <!-- Detailed Module-by-Module Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 0.85rem;">

          <!-- 1. Dashboard Module -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-gauge-high" style="color: #059669;"></i> 1. Dashboard Overview
              </div>
              <span class="badge" style="background: rgba(5, 150, 105, 0.12); color: #059669; font-size: 0.68rem;">Alt + 1</span>
            </div>
            <div class="card-body" style="padding: 0.75rem 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Live Daily Counters:</strong> Displays today's patient arrivals, consultations completed, pending queues, and total collection revenue.</li>
                <li><strong>Consultant Roster Status:</strong> Quickly check which doctors are currently on-duty and their room numbers.</li>
                <li><strong>Recent Activity Feed:</strong> Monitored in real-time as tokens are issued or marked completed.</li>
              </ul>
            </div>
          </div>

          <!-- 2. Doctors & Rosters Module -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-user-doctor" style="color: #2563eb;"></i> 2. Doctors & Rosters
              </div>
              <span class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563eb; font-size: 0.68rem;">Alt + 2</span>
            </div>
            <div class="card-body" style="padding: 0.75rem 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Add / Edit Doctors:</strong> Register doctor name, <em>Specialization / Area of Specialization</em>, qualifications, room number, consultation fee, and revenue share percentage.</li>
                <li><strong>Roster Scheduling:</strong> Set weekly duty shifts and timings so the system automatically calculates doctor on-duty status.</li>
                <li><strong>Export Roster:</strong> Download complete consultant list and schedules to CSV or print directory.</li>
              </ul>
            </div>
          </div>

          <!-- 3. Appointments & Token Queue -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-calendar-check" style="color: #7c3aed;"></i> 3. Appointments & Queue
              </div>
              <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-size: 0.68rem;">Alt + 3</span>
            </div>
            <div class="card-body" style="padding: 0.75rem 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Book Walk-in / OPD Token:</strong> Search an existing patient or type name, phone, age, and select consultant. The system automatically assigns token serial numbers.</li>
                <li><strong>Print Thermal Token Slip:</strong> Instantly print 80mm or 58mm token slips for the patient with room and token #.</li>
                <li><strong>Queue Management:</strong> Update appointment state to <em>Waiting, In-Consultation, Completed, or Cancelled</em>.</li>
              </ul>
            </div>
          </div>

          <!-- 4. Patient Records & Digital EMR -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-heart-pulse" style="color: #e11d48;"></i> 4. Patient Records (EMR)
              </div>
              <span class="badge" style="background: rgba(225, 29, 72, 0.12); color: #e11d48; font-size: 0.68rem;">Alt + 4</span>
            </div>
            <div class="card-body" style="padding: 0.75rem 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Vitals Entry:</strong> Record Blood Pressure (BP), Pulse, Temperature (°F), Weight (kg), and SpO2 levels.</li>
                <li><strong>Clinical Notes & Prescription:</strong> Enter Chief Complaints, Clinical Findings, Diagnosis, and prescribe medicines with dosage/frequency.</li>
                <li><strong>Print Rx:</strong> Print official branded clinic prescriptions with QR codes and doctor signatures.</li>
              </ul>
            </div>
          </div>

          <!-- 5. All Patients & Medical History -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-id-card-clip" style="color: #0284c7;"></i> 5. All Patients History
              </div>
              <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: #0284c7; font-size: 0.68rem;">Alt + 5</span>
            </div>
            <div class="card-body" style="padding: 0.75rem 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Master Patient Directory:</strong> Search by MR Number, Phone Number, or Patient Name.</li>
                <li><strong>Timeline View:</strong> View every past visit, previous vitals graph, past prescriptions, and billing receipts.</li>
                <li><strong>Patient ID Card:</strong> Generate and print a laminated clinic membership / OPD ID card.</li>
              </ul>
            </div>
          </div>

          <!-- 6. Billing, POS & Register -->
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-cash-register" style="color: #d97706;"></i> 6. Billing & POS Register
              </div>
              <span class="badge" style="background: rgba(217, 119, 6, 0.12); color: #d97706; font-size: 0.68rem;">Alt + 6</span>
            </div>
            <div class="card-body" style="padding: 0.75rem 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Instant Invoicing:</strong> Generate invoices for consultation fees, procedures, or medicines.</li>
                <li><strong>Discounts & Payments:</strong> Support for Cash, Card, Online, and customized discount approvals.</li>
                <li><strong>Thermal Receipts:</strong> Generate 80mm/58mm thermal receipts with barcode and clinic footer note.</li>
              </ul>
            </div>
          </div>

        </div>

        <!-- Keyboard Shortcuts Reference Table -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header" style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
              <i class="fa-solid fa-keyboard" style="color: #059669;"></i> Pro-User Keyboard Shortcuts
            </div>
          </div>
          <div class="card-body" style="padding: 0.65rem 0.85rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; font-size: 0.76rem;">
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-canvas); border-radius: 6px;">
                <span><kbd style="padding: 2px 5px; background: #e2e8f0; border-radius: 4px; font-weight: bold;">Alt + 1</kbd></span>
                <span style="color: var(--text-muted);">Dashboard</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-canvas); border-radius: 6px;">
                <span><kbd style="padding: 2px 5px; background: #e2e8f0; border-radius: 4px; font-weight: bold;">Alt + 2</kbd></span>
                <span style="color: var(--text-muted);">Doctors & Rosters</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-canvas); border-radius: 6px;">
                <span><kbd style="padding: 2px 5px; background: #e2e8f0; border-radius: 4px; font-weight: bold;">Alt + 3</kbd></span>
                <span style="color: var(--text-muted);">Appointments Queue</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-canvas); border-radius: 6px;">
                <span><kbd style="padding: 2px 5px; background: #e2e8f0; border-radius: 4px; font-weight: bold;">Alt + 4</kbd></span>
                <span style="color: var(--text-muted);">Patient Records</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-canvas); border-radius: 6px;">
                <span><kbd style="padding: 2px 5px; background: #e2e8f0; border-radius: 4px; font-weight: bold;">Alt + 5</kbd></span>
                <span style="color: var(--text-muted);">All Patients</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-canvas); border-radius: 6px;">
                <span><kbd style="padding: 2px 5px; background: #e2e8f0; border-radius: 4px; font-weight: bold;">Alt + 6</kbd></span>
                <span style="color: var(--text-muted);">Billing & POS</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  // 1. CLINIC PROFILE FORM
  async renderClinicSettings(container) {
    const res = await app.api('/settings');
    const s = res.data || {};

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="padding: 0.55rem 0.85rem;">
          <div class="card-title" style="margin-bottom: 0; font-size: 0.95rem;">
            <i class="fa-solid fa-sliders" style="color: var(--primary);"></i> Clinic Profile & Receipt Header Configuration
          </div>
        </div>

        <div class="card-body" style="padding: 0.75rem 1rem;">
          <form id="clinic-settings-form" onsubmit="settingsComponent.saveSettings(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label"><span class="required">*</span> Clinic Name</label>
                <input type="text" id="set-name" class="form-control" value="${s.clinic_name || 'Dream Garden PolyClinic'}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Tagline / Subtitle</label>
                <input type="text" id="set-tagline" class="form-control" value="${s.tagline || 'Comprehensive Multi-Specialty Healthcare & Diagnostic Center'}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label"><span class="required">*</span> Contact Phone Numbers</label>
                <input type="text" id="set-phone" class="form-control" value="${s.phone || '+92 42 35890123 / +92 300 8472910'}" required>
              </div>
              <div class="form-group">
                <label class="form-label">24/7 Emergency Helpline</label>
                <input type="text" id="set-emergency" class="form-control" value="${s.emergency_contact || '+92 300 1122334 (24/7)'}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Official Email</label>
                <input type="email" id="set-email" class="form-control" value="${s.email || 'info@dreamgardenclinic.com'}">
              </div>
              <div class="form-group">
                <label class="form-label">Website URL</label>
                <input type="text" id="set-web" class="form-control" value="${s.website || 'www.dreamgardenclinic.com'}">
              </div>
              <div class="form-group">
                <label class="form-label">Currency Symbol</label>
                <input type="text" id="set-currency" class="form-control" value="${s.currency_symbol || 'Rs.'}" style="width: 120px;" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><span class="required">*</span> Clinic Physical Address</label>
              <input type="text" id="set-address" class="form-control" value="${s.address || 'Plot # 14-B, Medical Avenue, Main Boulevard, Garden Town'}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Thermal Slip & Receipt Footer Note</label>
              <textarea id="set-footer" class="form-control" rows="2">${s.receipt_footer_note || 'Thank you for trusting Dream Garden PolyClinic. We wish you good health!'}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
              <button type="submit" class="btn btn-primary btn-lg">
                <i class="fa-solid fa-save"></i> Save Clinic Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async saveSettings(e) {
    e.preventDefault();
    const clinic_name = document.getElementById('set-name').value.trim();
    const tagline = document.getElementById('set-tagline').value.trim();
    const phone = document.getElementById('set-phone').value.trim();
    const emergency_contact = document.getElementById('set-emergency').value.trim();
    const email = document.getElementById('set-email').value.trim();
    const website = document.getElementById('set-web').value.trim();
    const currency_symbol = document.getElementById('set-currency').value.trim();
    const address = document.getElementById('set-address').value.trim();
    const receipt_footer_note = document.getElementById('set-footer').value.trim();

    const res = await app.api('/settings', {
      method: 'PUT',
      body: JSON.stringify({
        clinic_name,
        tagline,
        phone,
        emergency_contact,
        email,
        website,
        currency_symbol,
        address,
        receipt_footer_note
      })
    });

    if (res.success) {
      app.clinic.name = clinic_name;
      app.clinic.currency = currency_symbol;
      app.clinic.phone = phone;
      app.clinic.address = address;
      app.toast('Clinic settings updated successfully!', 'success');
    } else {
      app.toast(res.message || 'Failed to update settings', 'error');
    }
  },

  // 2. STAFF USERS TABLE
  async renderUsers(container) {
    const res = await app.api('/auth/users');
    const users = res.data || [];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="fa-solid fa-users-gear" style="color: #00c853;"></i> System Users & Staff Accounts
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-dense" style="min-width: 950px;">
            <thead>
              <tr>
                <th style="width: 130px;">Username</th>
                <th style="min-width: 200px;">Full Name</th>
                <th style="width: 140px;">Role</th>
                <th style="width: 130px;">Phone</th>
                <th style="width: 180px;">Email</th>
                <th style="width: 110px;">Status</th>
                <th style="width: 120px;">Created At</th>
                <th style="text-align: right; min-width: 120px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                let roleBadge = 'badge-gray';
                if (u.role === 'admin') roleBadge = 'badge-rose';
                else if (u.role === 'doctor') roleBadge = 'badge-teal';
                else if (u.role === 'pharmacist') roleBadge = 'badge-amber';
                else if (u.role === 'receptionist') roleBadge = 'badge-blue';

                return `
                  <tr>
                    <td class="cell-nowrap"><strong style="font-family: monospace; color: #0f172a; white-space: nowrap;">${u.username}</strong></td>
                    <td class="cell-nowrap"><strong style="white-space: nowrap;">${u.full_name}</strong></td>
                    <td class="cell-nowrap"><span class="badge ${roleBadge}">${u.role.replace('_', ' ')}</span></td>
                    <td class="cell-nowrap">${u.phone || '-'}</td>
                    <td class="cell-nowrap">${u.email || '-'}</td>
                    <td class="cell-nowrap"><span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-gray'}">${u.status}</span></td>
                    <td class="cell-nowrap">${new Date(u.created_at).toLocaleDateString()}</td>
                    <td class="cell-nowrap" style="text-align: right; white-space: nowrap;">
                      <button onclick="settingsComponent.openEditUserModal(${u.id})" class="btn-edit-action" title="Re-edit Staff User Account">
                        <i class="fa-solid fa-pen-to-square"></i> Re-edit
                      </button>
                      <button onclick="settingsComponent.deleteUser(${u.id}, '${u.username}')" class="btn btn-outline btn-sm" title="Delete User" style="color: #ef4444; border-color: #fca5a5;">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openAddUserModal() {
    const bodyHtml = `
      <form id="add-user-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Username</label>
            <input type="text" id="nu-user" class="form-control" placeholder="e.g. reception2" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Password</label>
            <input type="password" id="nu-pass" class="form-control" placeholder="••••••••" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label"><span class="required">*</span> Full Name</label>
          <input type="text" id="nu-name" class="form-control" placeholder="e.g. Bilal Asghar" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Assigned Role</label>
            <select id="nu-role" class="form-control" required>
              <option value="receptionist">Receptionist / Front Desk</option>
              <option value="admin">Administrator / Clinic Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="nu-phone" class="form-control" placeholder="0300-1234567">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="nu-email" class="form-control" placeholder="staff@dreamgardenclinic.com">
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="settingsComponent.submitAddUser()"><i class="fa-solid fa-save"></i> Create Staff User</button>
    `;

    app.openModal('<i class="fa-solid fa-user-plus"></i> Add Staff Account', bodyHtml, footerHtml);
  },

  async submitAddUser() {
    const username = document.getElementById('nu-user').value.trim();
    const password = document.getElementById('nu-pass').value;
    const full_name = document.getElementById('nu-name').value.trim();
    const role = document.getElementById('nu-role').value;
    const phone = document.getElementById('nu-phone').value.trim();
    const email = document.getElementById('nu-email').value.trim();

    if (!username || !password || !full_name) {
      app.toast('Please fill all required fields.', 'error');
      return;
    }

    const res = await app.api('/auth/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name, role, phone, email })
    });

    if (res.success) {
      app.toast('Staff account created successfully in database!', 'success');
      app.closeModal();
      this.renderUsers(document.getElementById('settings-content-area'));
    } else {
      app.toast(res.message || 'Failed to create user', 'error');
    }
  },

  async openEditUserModal(userId) {
    const res = await app.api('/auth/users');
    if (!res.success) return;
    const u = res.data.find(user => user.id === userId);
    if (!u) return;

    const bodyHtml = `
      <form id="edit-user-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Username (Read-only)</label>
            <input type="text" class="form-control" value="${u.username}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">New Password (Leave blank to keep current)</label>
            <input type="password" id="eu-pass" class="form-control" placeholder="••••••••">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label"><span class="required">*</span> Full Name</label>
          <input type="text" id="eu-name" class="form-control" value="${u.full_name}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Assigned Role</label>
            <select id="eu-role" class="form-control" required>
              <option value="receptionist" ${u.role === 'receptionist' ? 'selected' : ''}>Receptionist / Front Desk</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator / Clinic Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Account Status</label>
            <select id="eu-status" class="form-control">
              <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="eu-phone" class="form-control" value="${u.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="eu-email" class="form-control" value="${u.email || ''}">
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="settingsComponent.submitEditUser(${u.id})"><i class="fa-solid fa-save"></i> Save Changes</button>
    `;

    app.openModal(`<i class="fa-solid fa-user-pen"></i> Edit Staff Account: ${u.username}`, bodyHtml, footerHtml);
  },

  async submitEditUser(userId) {
    const full_name = document.getElementById('eu-name').value.trim();
    const password = document.getElementById('eu-pass').value;
    const role = document.getElementById('eu-role').value;
    const status = document.getElementById('eu-status').value;
    const phone = document.getElementById('eu-phone').value.trim();
    const email = document.getElementById('eu-email').value.trim();

    if (!full_name) {
      app.toast('Full name is required.', 'error');
      return;
    }

    const payload = { full_name, role, status, phone, email };
    if (password && password.trim().length > 0) {
      payload.password = password;
    }

    const res = await app.api(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      app.toast('Staff account updated successfully in database!', 'success');
      app.closeModal();
      this.renderUsers(document.getElementById('settings-content-area'));
    } else {
      app.toast(res.message || 'Failed to update user', 'error');
    }
  },

  async deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to permanently delete user "${username}" from the database?`)) return;
    const res = await app.api(`/auth/users/${userId}`, { method: 'DELETE' });
    if (res.success) {
      app.toast(`User "${username}" deleted from database.`, 'success');
      this.renderUsers(document.getElementById('settings-content-area'));
    } else {
      app.toast(res.message || 'Failed to delete user', 'error');
    }
  }
};
