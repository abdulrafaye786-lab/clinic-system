// ==========================================================================
// BILLING & CASHIER POINT OF SALE COMPONENT
// ==========================================================================

const billingComponent = {
  billItems: [],
  activeTab: 'opd-register', // 'opd-register' | 'invoices'

  async render(container) {
    container.innerHTML = `
      <div id="billing-metrics-strip" class="metrics-strip">
        <div class="metric-strip-card">
          <div class="metric-strip-icon" style="background: #e0f2fe; color: #0284c7;">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div>
            <div class="metric-strip-val" id="stat-total-billed">-</div>
            <div class="metric-strip-lbl">Total Billed</div>
          </div>
        </div>

        <div class="metric-strip-card">
          <div class="metric-strip-icon" style="background: #d1fae5; color: #059669;">
            <i class="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div>
            <div class="metric-strip-val" id="stat-total-collected">-</div>
            <div class="metric-strip-lbl">Collected Revenue</div>
          </div>
        </div>

        <!-- Doctor Share vs Admin Share Breakdown -->
        <div class="metric-strip-card">
          <div class="metric-strip-icon" style="background: rgba(16, 185, 129, 0.15); color: #059669;">
            <i class="fa-solid fa-user-doctor"></i>
          </div>
          <div>
            <div class="metric-strip-val" id="stat-doctor-share" style="color: #059669;">-</div>
            <div class="metric-strip-lbl">Doctor Payout Share</div>
          </div>
        </div>

        <div class="metric-strip-card">
          <div class="metric-strip-icon" style="background: rgba(37, 99, 235, 0.12); color: #2563eb;">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div class="metric-strip-val" id="stat-admin-share" style="color: #2563eb;">-</div>
            <div class="metric-strip-lbl">Admin / Clinic Retention</div>
          </div>
        </div>

        <div class="metric-strip-card">
          <div class="metric-strip-icon" style="background: #ffe4e6; color: #e11d48;">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <div class="metric-strip-val" id="stat-total-due">-</div>
            <div class="metric-strip-lbl">Outstanding Due</div>
          </div>
        </div>
      </div>

      <div class="card u-morphism-card">
        <div class="card-header" style="padding: 0.55rem 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.65rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <!-- Tab switcher between OPD Register and Invoices -->
            <div class="view-mode-toggle" style="background: var(--bg-canvas); border: 1.5px solid var(--border-color); border-radius: 8px; padding: 2px;">
              <button class="view-mode-btn ${this.activeTab === 'opd-register' ? 'active' : ''}" onclick="billingComponent.switchTab('opd-register')" style="padding: 0.25rem 0.65rem; font-size: 0.76rem; font-weight: 700;">
                <i class="fa-solid fa-book-medical"></i> OPD Register
              </button>
              <button class="view-mode-btn ${this.activeTab === 'invoices' ? 'active' : ''}" onclick="billingComponent.switchTab('invoices')" style="padding: 0.25rem 0.65rem; font-size: 0.76rem; font-weight: 700;">
                <i class="fa-solid fa-cash-register"></i> Invoices & Receipts
              </button>
            </div>

            <div class="search-box">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="bill-search" placeholder="Search Reg #, MRN, Patient, Doctor..." oninput="billingComponent.load(this.value)" style="height: 28px; font-size: 0.76rem;">
            </div>
          </div>

          <div style="display: flex; gap: 0.45rem;">
            <button onclick="billingComponent.downloadOpdCsv()" class="btn btn-outline btn-sm" title="Export OPD Register (CSV)" style="padding: 0.22rem 0.55rem; font-size: 0.74rem;">
              <i class="fa-solid fa-file-csv" style="color: var(--primary);"></i> Export CSV
            </button>
          </div>
        </div>

        <!-- OPD Register Table View -->
        <div id="opd-register-view" style="display: ${this.activeTab === 'opd-register' ? 'block' : 'none'};">
          <div class="table-responsive table-viewport" style="max-height: calc(100vh - 220px); overflow-y: auto;">
            <table class="table table-dense" style="min-width: 1100px; width: 100%;">
              <thead style="position: sticky; top: 0; z-index: 5;">
                <tr style="background: var(--bg-card); border-bottom: 1.5px solid var(--border-color);">
                  <th style="width: 105px;">Reg. No.</th>
                  <th style="width: 90px;">MR. No</th>
                  <th style="width: 140px;">Date/Time</th>
                  <th style="width: 75px; text-align: center;">Visit #</th>
                  <th style="min-width: 170px;">Patient Name</th>
                  <th style="width: 65px;">Age</th>
                  <th style="width: 75px;">Sex</th>
                  <th style="width: 85px;">Weight</th>
                  <th style="width: 120px;">Mobile No</th>
                  <th style="min-width: 160px;">Dr. Name</th>
                  <th style="width: 140px;">Fee & Split</th>
                  <th style="min-width: 140px;">Remarks</th>
                </tr>
              </thead>
              <tbody id="opd-register-table-body">
                <tr><td colspan="12" style="text-align: center; padding: 3rem; color: #94a3b8;">Loading OPD register...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Standard Invoices & Receipts View -->
        <div id="invoices-list-view" style="display: ${this.activeTab === 'invoices' ? 'block' : 'none'};">
          <div class="table-responsive table-viewport" style="max-height: calc(100vh - 220px); overflow-y: auto;">
            <table class="table table-dense" style="min-width: 1050px; width: 100%;">
              <thead style="position: sticky; top: 0; z-index: 5;">
                <tr style="background: var(--bg-card); border-bottom: 1.5px solid var(--border-color);">
                  <th style="width: 130px;">Invoice #</th>
                  <th style="min-width: 230px;">Patient Details</th>
                  <th style="width: 110px;">Subtotal</th>
                  <th style="width: 100px;">Discount</th>
                  <th style="width: 120px;">Total Billed</th>
                  <th style="width: 120px;">Amount Paid</th>
                  <th style="width: 110px;">Balance Due</th>
                  <th style="width: 110px;">Status</th>
                  <th style="width: 110px;">Date</th>
                  <th style="text-align: right; min-width: 190px;">Print & POS</th>
                </tr>
              </thead>
              <tbody id="billing-table-body">
                <tr><td colspan="10" style="text-align: center; padding: 3rem; color: #94a3b8;">Loading billing records...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.load();
  },

  switchTab(tab) {
    this.activeTab = tab;
    const opdView = document.getElementById('opd-register-view');
    const invView = document.getElementById('invoices-list-view');
    if (opdView && invView) {
      opdView.style.display = tab === 'opd-register' ? 'block' : 'none';
      invView.style.display = tab === 'invoices' ? 'block' : 'none';
    }
    const btns = document.querySelectorAll('.card-header .view-mode-btn');
    if (btns.length >= 2) {
      btns[0].classList.toggle('active', tab === 'opd-register');
      btns[1].classList.toggle('active', tab === 'invoices');
    }
  },

  async load(search = '') {
    const res = await app.api(`/billing/invoices?search=${encodeURIComponent(search)}`);
    if (!res.success) return;

    const invoices = res.data || [];
    this.cachedInvoices = invoices;

    // Calculate financial metrics and Doctor vs Admin Share
    let totalBilled = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let totalDoctorShare = 0;
    let totalAdminShare = 0;

    invoices.forEach(inv => {
      const billed = parseFloat(inv.total_amount || 0);
      const paid = parseFloat(inv.paid_amount || 0);
      const due = parseFloat(inv.balance_due || 0);
      const docPercent = parseFloat(inv.doctor_share_percent !== undefined ? inv.doctor_share_percent : 60);
      const clinicPercent = 100 - docPercent;

      totalBilled += billed;
      totalCollected += paid;
      totalDue += due;

      totalDoctorShare += (paid * docPercent) / 100;
      totalAdminShare += (paid * clinicPercent) / 100;
    });

    const elBilled = document.getElementById('stat-total-billed');
    const elCollected = document.getElementById('stat-total-collected');
    const elDue = document.getElementById('stat-total-due');
    const elDocShare = document.getElementById('stat-doctor-share');
    const elAdminShare = document.getElementById('stat-admin-share');

    if (elBilled) elBilled.textContent = `${app.clinic.currency} ${Math.round(totalBilled).toLocaleString()}`;
    if (elCollected) elCollected.textContent = `${app.clinic.currency} ${Math.round(totalCollected).toLocaleString()}`;
    if (elDue) elDue.textContent = `${app.clinic.currency} ${Math.round(totalDue).toLocaleString()}`;
    if (elDocShare) elDocShare.textContent = `${app.clinic.currency} ${Math.round(totalDoctorShare).toLocaleString()}`;
    if (elAdminShare) elAdminShare.textContent = `${app.clinic.currency} ${Math.round(totalAdminShare).toLocaleString()}`;

    // 1. Render OPD Register Table
    const opdTbody = document.getElementById('opd-register-table-body');
    if (opdTbody) {
      if (invoices.length === 0) {
        opdTbody.innerHTML = `
          <tr>
            <td colspan="12" style="text-align: center; padding: 3.5rem; color: #94a3b8;">
              <i class="fa-solid fa-book-medical" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; color: #cbd5e1;"></i>
              No OPD register entries found.
            </td>
          </tr>
        `;
      } else {
        opdTbody.innerHTML = invoices.map(inv => {
          const rawDate = inv.created_at ? new Date(inv.created_at) : new Date();
          const formattedDateTime = rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
            ' ' + rawDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

          const docSharePct = parseFloat(inv.doctor_share_percent !== undefined ? inv.doctor_share_percent : 60);
          const clinicSharePct = 100 - docSharePct;
          const feePaid = parseFloat(inv.paid_amount || inv.total_amount || 0);
          const docAmount = Math.round((feePaid * docSharePct) / 100);
          const adminAmount = Math.round((feePaid * clinicSharePct) / 100);

          const rawMrn = (inv.mrn || '').toString().replace(/MRN-?/gi, '');
          const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${inv.patient_id}`;

          return `
            <tr style="border-bottom: 1px solid var(--border-color); height: 40px;">
              <td class="cell-nowrap">
                <span style="font-family: monospace; font-weight: 800; color: #007a33; background: #e8fbf0; padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid #bbf7d0; font-size: 0.78rem;">
                  ${inv.reg_no || `R-${inv.id}`}
                </span>
              </td>
              <td class="cell-nowrap">
                <span class="mrn-tag" style="font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.4rem;">${formattedMrn}</span>
              </td>
              <td class="cell-nowrap" style="font-size: 0.75rem; color: var(--text-body);">
                <i class="fa-regular fa-clock" style="color: var(--primary); font-size: 0.7rem; margin-right: 3px;"></i>${formattedDateTime}
              </td>
              <td style="text-align: center; font-weight: 800; font-size: 0.78rem; color: var(--text-main);">
                #${inv.visit_number || 1}
              </td>
              <td class="cell-nowrap">
                <strong style="color: var(--text-main); font-size: 0.82rem; cursor: pointer;" onclick="app.openPatientHistoryModal(${inv.patient_id})">${inv.patient_name}</strong>
              </td>
              <td class="cell-nowrap" style="font-size: 0.76rem; font-weight: 600;">${inv.age || '-'} Y</td>
              <td class="cell-nowrap">
                <span class="badge ${inv.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.68rem; padding: 0.12rem 0.4rem;">${inv.gender || 'PT'}</span>
              </td>
              <td class="cell-nowrap" style="font-size: 0.76rem;">
                ${inv.weight_kg ? `<strong>${inv.weight_kg}</strong> kg` : '<span style="color: #94a3b8;">--</span>'}
              </td>
              <td class="cell-nowrap" style="font-size: 0.76rem; font-family: monospace; font-weight: 600;">${inv.patient_phone || '-'}</td>
              <td class="cell-nowrap">
                <strong style="color: var(--text-main); font-size: 0.8rem;">${inv.doctor_name || 'General OPD'}</strong>
                ${inv.doctor_specialty ? `<small style="display: block; color: var(--text-muted); font-size: 0.68rem;">${inv.doctor_specialty}</small>` : ''}
              </td>
              <td class="cell-nowrap" style="font-size: 0.74rem;">
                <div style="font-weight: 800; color: var(--caramel); font-family: monospace;">${app.clinic.currency} ${feePaid.toLocaleString()}</div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">
                  Doc: <span style="color: #059669; font-weight: 700;">${docAmount}</span> • Adm: <span style="color: #2563eb; font-weight: 700;">${adminAmount}</span>
                </div>
              </td>
              <td style="font-size: 0.73rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${inv.chief_complaint || inv.vitals_notes || inv.notes || 'Routine Consultation'}">
                ${inv.chief_complaint || inv.vitals_notes || inv.notes || 'Routine Consultation'}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Render Invoices Table
    const tbody = document.getElementById('billing-table-body');
    if (!tbody) return;

    if (invoices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3.5rem; color: #94a3b8;">
            <i class="fa-solid fa-receipt" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; color: #cbd5e1;"></i>
            No invoices found.
          </td>
        </tr>
      `;
      return;
    }

    const avatarGradients = ['avatar-teal', 'avatar-blue', 'avatar-purple', 'avatar-indigo', 'avatar-rose', 'avatar-amber', 'avatar-emerald'];

    tbody.innerHTML = invoices.map((inv, idx) => {
      const avatarClass = avatarGradients[idx % avatarGradients.length];
      const initials = (inv.patient_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

      let statusBadge = 'badge-rose';
      let beaconDot = '';
      if (inv.payment_status === 'paid') {
        statusBadge = 'badge-green';
        beaconDot = '<span class="pulse-dot green"></span> ';
      } else if (inv.payment_status === 'partial') {
        statusBadge = 'badge-amber';
        beaconDot = '<span class="pulse-dot amber"></span> ';
      }

      const invDate = inv.created_at ? new Date(inv.created_at) : new Date();
      const formattedDate = invDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
        ' ' + invDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      return `
        <tr>
          <td class="cell-nowrap">
            <span style="font-family: monospace; font-weight: 800; color: #00c853; background: #e8fbf0; padding: 0.3rem 0.6rem; border-radius: 6px; border: 1px solid #bbf7d0; font-size: 0.82rem; white-space: nowrap;">
              ${inv.invoice_number}
            </span>
          </td>
          <td class="patient-details-cell">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="avatar-bubble ${avatarClass}" style="width: 32px; height: 32px; font-size: 0.75rem; cursor: pointer; flex-shrink: 0;" onclick="app.openPatientHistoryModal(${inv.patient_id})" title="View 360 EHR History">${initials}</div>
              <div>
                <div style="font-weight: 700; color: var(--text-main); cursor: pointer; white-space: nowrap;" onclick="app.openPatientHistoryModal(${inv.patient_id})" title="View 360 EHR History">${inv.patient_name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; margin-top: 1px;">${inv.mrn} • ${inv.patient_phone}</div>
              </div>
            </div>
          </td>
          <td class="cell-nowrap" style="color: var(--text-muted); font-weight: 600;">${app.clinic.currency} ${parseFloat(inv.subtotal).toLocaleString()}</td>
          <td class="cell-nowrap" style="color: var(--text-muted);">${app.clinic.currency} ${parseFloat(inv.discount_amount).toLocaleString()}</td>
          <td class="cell-nowrap"><strong style="color: var(--text-main); font-size: 0.95rem;">${app.clinic.currency} ${parseFloat(inv.total_amount).toLocaleString()}</strong></td>
          <td class="cell-nowrap" style="color: #10b981; font-weight: 800;">${app.clinic.currency} ${parseFloat(inv.paid_amount).toLocaleString()}</td>
          <td class="cell-nowrap" style="color: ${inv.balance_due > 0 ? '#ef4444' : '#10b981'}; font-weight: 800;">
            ${inv.balance_due > 0 ? `${app.clinic.currency} ${parseFloat(inv.balance_due).toLocaleString()}` : '<span style="color: #10b981;"><i class="fa-solid fa-check"></i> Settled</span>'}
          </td>
          <td class="cell-nowrap"><span class="badge ${statusBadge}">${beaconDot}${inv.payment_status}</span></td>
          <td class="cell-nowrap" style="font-size: 0.75rem; color: var(--text-muted);">${formattedDate}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button onclick="app.openEditInvoiceModal(${inv.id})" class="btn-edit-action" title="Re-edit Invoice & Discounts">
              <i class="fa-solid fa-pen-to-square"></i> Re-edit
            </button>
            <button onclick="app.openPatientHistoryModal(${inv.patient_id})" class="btn btn-outline btn-sm" title="View Patient 360 History" style="padding: 0.35rem 0.55rem;">
              <i class="fa-solid fa-folder-open"></i>
            </button>
            ${inv.balance_due > 0 ? `
              <button onclick="billingComponent.openPayModal(${inv.id}, '${inv.invoice_number}', ${inv.balance_due})" class="btn btn-success btn-sm" title="Collect Payment">
                <i class="fa-solid fa-hand-holding-dollar"></i> Pay
              </button>
            ` : ''}
            <button onclick="billingComponent.printInvoice(${inv.id}, 'pos')" class="btn btn-outline btn-sm" title="Print 80mm POS Receipt">
              <i class="fa-solid fa-receipt"></i> Slip
            </button>
            <button onclick="billingComponent.printInvoice(${inv.id}, 'a4')" class="btn btn-outline-primary btn-sm" title="Print Formal A4 Invoice">
              <i class="fa-solid fa-file-lines"></i> A4
            </button>
            <button onclick="app.deleteInvoice(${inv.id}, '${inv.invoice_number}')" class="btn btn-outline btn-sm" title="Delete Invoice from Database" style="color: #ef4444; border-color: #fca5a5;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  downloadOpdCsv() {
    if (!this.cachedInvoices || this.cachedInvoices.length === 0) {
      app.toast('No OPD register records available to export.', 'warning');
      return;
    }
    const headers = ['Reg No', 'MR No', 'Date Time', 'Visit #', 'Patient Name', 'Age', 'Sex', 'Weight (kg)', 'Mobile', 'Doctor Name', 'Total Fee', 'Doctor Share', 'Admin Share', 'Remarks'];
    const rows = this.cachedInvoices.map(inv => {
      const rawDate = inv.created_at ? new Date(inv.created_at) : new Date();
      const dt = rawDate.toLocaleString();
      const docSharePct = parseFloat(inv.doctor_share_percent !== undefined ? inv.doctor_share_percent : 60);
      const fee = parseFloat(inv.paid_amount || inv.total_amount || 0);
      const docShare = Math.round((fee * docSharePct) / 100);
      const adminShare = Math.round((fee * (100 - docSharePct)) / 100);

      return [
        `"${inv.reg_no || 'R-' + inv.id}"`,
        `"${inv.mrn || ''}"`,
        `"${dt}"`,
        `"${inv.visit_number || 1}"`,
        `"${(inv.patient_name || '').replace(/"/g, '""')}"`,
        `"${inv.age || ''}"`,
        `"${inv.gender || ''}"`,
        `"${inv.weight_kg || ''}"`,
        `"${inv.patient_phone || ''}"`,
        `"${(inv.doctor_name || '').replace(/"/g, '""')}"`,
        `"${fee}"`,
        `"${docShare}"`,
        `"${adminShare}"`,
        `"${(inv.chief_complaint || inv.vitals_notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `OPD_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    app.toast('OPD Register CSV exported successfully!', 'success');
  },

  // OPEN CREATE CONSOLIDATED INVOICE MODAL
  async openCreateInvoiceModal() {
    const [patRes, docRes, labRes] = await Promise.all([
      app.api('/patients?limit=100'),
      app.api('/doctors'),
      app.api('/lab/catalog')
    ]);

    const patients = patRes.data || [];
    const doctors = docRes.data || [];
    const labCatalog = labRes.data || [];

    this.billItems = [];

    const bodyHtml = `
      <form id="create-invoice-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Patient</label>
            <select id="inv-patient-id" class="form-control" required>
              <option value="">-- Choose Registered Patient --</option>
              ${patients.map(p => `<option value="${p.id}">${p.mrn} - ${p.full_name} (${p.phone})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Payment Mode</label>
            <select id="inv-pay-method" class="form-control">
              <option value="cash">Cash Settlement</option>
              <option value="card">Debit / Credit Card</option>
              <option value="online">Online / Bank Transfer</option>
            </select>
          </div>
        </div>

        <!-- Quick Item Presets -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem; margin-bottom: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase;">
            <i class="fa-solid fa-bolt"></i> Quick Add Common Charges:
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" onclick="billingComponent.addPresetItem('OPD Doctor Consultation Fee', 1500, 'consultation')" class="btn btn-outline-primary btn-sm">
              + Doctor Consultation (1500)
            </button>
            <button type="button" onclick="billingComponent.addPresetItem('12-Lead Diagnostic ECG', 800, 'procedure')" class="btn btn-outline btn-sm">
              + ECG Test (800)
            </button>
            <button type="button" onclick="billingComponent.addPresetItem('Wound Dressing / Minor Procedure', 500, 'procedure')" class="btn btn-outline btn-sm">
              + Dressing (500)
            </button>
            <button type="button" onclick="billingComponent.addPresetItem('Blood Sugar Random (BSR Check)', 150, 'procedure')" class="btn btn-outline btn-sm">
              + Sugar BSR (150)
            </button>
            <button type="button" onclick="billingComponent.addPresetItem('Emergency Nursing & Triage Fee', 600, 'nursing')" class="btn btn-outline btn-sm">
              + Emergency Triage (600)
            </button>
          </div>
        </div>

        <!-- Dynamic Bill Items Table -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 1rem;">
          <table class="table" style="font-size: 0.85rem; margin-bottom: 0;">
            <thead style="background: #f8fafc;">
              <tr>
                <th style="width: 45%;">Service / Item Description</th>
                <th style="width: 15%;">Qty</th>
                <th style="width: 20%;">Unit Price (${app.clinic.currency})</th>
                <th style="width: 15%;">Total</th>
                <th style="width: 5%;"></th>
              </tr>
            </thead>
            <tbody id="inv-items-tbody">
              <!-- Dynamic rows -->
            </tbody>
          </table>
          <div style="padding: 0.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0;">
            <button type="button" onclick="billingComponent.addCustomItemRow()" class="btn btn-outline-primary btn-sm">
              <i class="fa-solid fa-plus"></i> Add Custom Bill Line
            </button>
          </div>
        </div>

        <!-- Calculations Bar -->
        <div style="background: #e8fbf0; border: 1px solid #bbf7d0; border-radius: 8px; padding: 1.25rem;">
          <div class="form-row">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Subtotal</label>
              <div style="font-size: 1.2rem; font-weight: 800; color: #007a33;" id="modal-inv-subtotal">${app.clinic.currency} 0.00</div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Discount Amount (${app.clinic.currency})</label>
              <input type="number" id="modal-inv-discount" class="form-control" value="0" min="0" oninput="billingComponent.recalculateInvoiceModal()">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Initial Payment Collected</label>
              <input type="number" id="modal-inv-payment" class="form-control" value="0" min="0" oninput="billingComponent.recalculateInvoiceModal()">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Net Payable</label>
              <div style="font-size: 1.35rem; font-weight: 900; color: #00c853;" id="modal-inv-net">${app.clinic.currency} 0.00</div>
            </div>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary btn-lg" onclick="billingComponent.submitInvoice(true)"><i class="fa-solid fa-print"></i> Generate & Print POS Slip</button>
    `;

    app.openModal('<i class="fa-solid fa-receipt"></i> Generate Unified Clinical Invoice', bodyHtml, footerHtml, 'modal-lg');

    // Add initial item
    this.addPresetItem('OPD Doctor Consultation Fee', 1500, 'consultation');
  },

  addPresetItem(desc, price, type = 'procedure') {
    this.addCustomItemRow(desc, 1, price, type);
  },

  addCustomItemRow(desc = '', qty = 1, price = 0, type = 'procedure') {
    const tbody = document.getElementById('inv-items-tbody');
    if (!tbody) return;

    const rowId = 'inv-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.className = 'inv-item-row';
    tr.setAttribute('data-type', type);

    tr.innerHTML = `
      <td>
        <input type="text" class="form-control item-desc" value="${desc}" placeholder="Item description" required>
      </td>
      <td>
        <input type="number" class="form-control item-qty" value="${qty}" min="1" oninput="billingComponent.recalculateInvoiceModal()">
      </td>
      <td>
        <input type="number" step="0.1" class="form-control item-price" value="${price}" min="0" oninput="billingComponent.recalculateInvoiceModal()">
      </td>
      <td>
        <strong class="item-subtotal">${app.clinic.currency} ${(qty * price).toFixed(2)}</strong>
      </td>
      <td style="text-align: center;">
        <button type="button" onclick="document.getElementById('${rowId}').remove(); billingComponent.recalculateInvoiceModal();" style="background: none; border: none; color: #ef4444; cursor: pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
    this.recalculateInvoiceModal();
  },

  recalculateInvoiceModal() {
    let subtotal = 0;
    document.querySelectorAll('.inv-item-row').forEach(tr => {
      const q = parseInt(tr.querySelector('.item-qty').value) || 1;
      const p = parseFloat(tr.querySelector('.item-price').value) || 0;
      const lineTot = q * p;
      tr.querySelector('.item-subtotal').textContent = `${app.clinic.currency} ${lineTot.toFixed(2)}`;
      subtotal += lineTot;
    });

    const discInput = document.getElementById('modal-inv-discount');
    const discount = discInput ? parseFloat(discInput.value) || 0 : 0;
    const net = Math.max(0, subtotal - discount);

    const payInput = document.getElementById('modal-inv-payment');
    if (payInput && (payInput.value === '0' || payInput.value === '')) {
      payInput.value = net.toFixed(2);
    }

    const subEl = document.getElementById('modal-inv-subtotal');
    const netEl = document.getElementById('modal-inv-net');

    if (subEl) subEl.textContent = `${app.clinic.currency} ${subtotal.toFixed(2)}`;
    if (netEl) netEl.textContent = `${app.clinic.currency} ${net.toFixed(2)}`;
  },

  async submitInvoice(printSlip = true) {
    const patient_id = document.getElementById('inv-patient-id').value;
    const payment_method = document.getElementById('inv-pay-method').value;
    const discount_value = parseFloat(document.getElementById('modal-inv-discount').value) || 0;
    const initial_payment = parseFloat(document.getElementById('modal-inv-payment').value) || 0;

    const items = [];
    document.querySelectorAll('.inv-item-row').forEach(tr => {
      const desc = tr.querySelector('.item-desc').value.trim();
      const qty = parseInt(tr.querySelector('.item-qty').value) || 1;
      const unit_price = parseFloat(tr.querySelector('.item-price').value) || 0;
      const item_type = tr.getAttribute('data-type') || 'procedure';

      if (desc && unit_price >= 0) {
        items.push({
          item_type,
          description: desc,
          quantity: qty,
          unit_price
        });
      }
    });

    if (!patient_id || items.length === 0) {
      app.toast('Please select a patient and add at least one bill item.', 'error');
      return;
    }

    const res = await app.api('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify({
        patient_id,
        items,
        discount_value,
        payment_method,
        initial_payment
      })
    });

    if (res.success) {
      app.toast(`Invoice #${res.invoiceNumber} created successfully!`, 'success');
      app.closeModal();

      if (printSlip) {
        this.printInvoice(res.invoiceId, 'pos');
      }

      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to create invoice', 'error');
    }
  },

  // RECORD PARTIAL PAYMENT MODAL
  openPayModal(invoiceId, invNum, balance) {
    const bodyHtml = `
      <form id="record-pay-form">
        <p style="margin-bottom: 1rem; font-size: 0.9rem;">
          Settling Balance for Invoice: <strong style="color: #00c853;">${invNum}</strong><br>
          Outstanding Balance: <strong style="color: #ef4444; font-size: 1.1rem;">${app.clinic.currency} ${parseFloat(balance).toLocaleString()}</strong>
        </p>

        <div class="form-group">
          <label class="form-label"><span class="required">*</span> Payment Amount (${app.clinic.currency})</label>
          <input type="number" step="0.1" id="rp-amount" class="form-control" value="${balance}" max="${balance}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select id="rp-method" class="form-control">
            <option value="cash">Cash Settlement</option>
            <option value="card">Credit / Debit Card</option>
            <option value="online">Online Bank Transfer</option>
          </select>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-success" onclick="billingComponent.submitPayment(${invoiceId})"><i class="fa-solid fa-check"></i> Collect Payment</button>
    `;

    app.openModal('<i class="fa-solid fa-hand-holding-dollar"></i> Collect Invoice Payment', bodyHtml, footerHtml);
  },

  async submitPayment(invoiceId) {
    const amount = document.getElementById('rp-amount').value;
    const payment_method = document.getElementById('rp-method').value;

    const res = await app.api(`/billing/invoices/${invoiceId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method })
    });

    if (res.success) {
      app.toast('Payment collected successfully!', 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Payment failed', 'error');
    }
  },

  // PRINT ENGINE: POS SLIP vs A4 INVOICE
  async printInvoice(invoiceId, format = 'pos') {
    const res = await app.api(`/billing/invoices/${invoiceId}`);
    if (!res.success) return;

    const inv = res.data;
    const items = inv.items || [];

    if (format === 'pos') {
      const posHtml = `
        <div class="thermal-receipt">
          <div class="center bold title">${app.clinic.name}</div>
          <div class="center" style="font-size: 11px;">OFFICIAL CASH RECEIPT</div>
          <div class="center" style="font-size: 10px;">${app.clinic.address} • Tel: ${app.clinic.phone}</div>
          <div class="divider"></div>
          <div class="row-flex"><span>Invoice #:</span><span class="bold">${inv.invoice_number}</span></div>
          <div class="row-flex"><span>Patient MRN:</span><span class="bold">${inv.mrn}</span></div>
          <div class="row-flex"><span>Patient Name:</span><span>${inv.patient_name}</span></div>
          <div class="row-flex"><span>Date:</span><span>${new Date(inv.created_at).toLocaleString()}</span></div>
          <div class="divider"></div>
          <div class="bold" style="margin-bottom: 4px;">SERVICES / CHARGES:</div>
          ${items.map(it => `
            <div style="margin-bottom: 3px;">
              <div>${it.description}</div>
              <div class="row-flex" style="font-size: 11px; color: #333;">
                <span>${it.quantity} x ${app.clinic.currency} ${parseFloat(it.unit_price).toFixed(2)}</span>
                <span>${app.clinic.currency} ${parseFloat(it.total_price).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="row-flex"><span>Subtotal:</span><span>${app.clinic.currency} ${parseFloat(inv.subtotal).toFixed(2)}</span></div>
          ${inv.discount_amount > 0 ? `<div class="row-flex"><span>Discount:</span><span>-${app.clinic.currency} ${parseFloat(inv.discount_amount).toFixed(2)}</span></div>` : ''}
          <div class="row-flex bold" style="font-size: 14px; margin-top: 4px;">
            <span>TOTAL AMOUNT:</span><span>${app.clinic.currency} ${parseFloat(inv.total_amount).toFixed(2)}</span>
          </div>
          <div class="row-flex bold" style="color: #007a33;">
            <span>AMOUNT PAID:</span><span>${app.clinic.currency} ${parseFloat(inv.paid_amount).toFixed(2)}</span>
          </div>
          ${inv.balance_due > 0 ? `
            <div class="row-flex bold" style="color: #ef4444;">
              <span>BALANCE DUE:</span><span>${app.clinic.currency} ${parseFloat(inv.balance_due).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="center" style="font-size: 10px;">Cashier: ${inv.cashier_name}</div>
          <div class="center" style="font-size: 10px; margin-top: 4px;">Thank you for choosing Dream Garden PolyClinic!</div>
        </div>
      `;
      app.printDocument(posHtml);
    } else {
      // Formal A4 Invoice Layout
      const a4Html = `
        <div class="prescription-layout">
          <div class="rx-header">
            <div>
              <div class="rx-clinic-title">${app.clinic.name}</div>
              <div class="rx-clinic-sub">Multi-Specialty Healthcare & Diagnostic Center</div>
              <div class="rx-clinic-sub">${app.clinic.address} • Phone: ${app.clinic.phone}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 1.3rem; color: #00c853;">PATIENT INVOICE</div>
              <div style="font-weight: 700; font-size: 0.95rem;">Invoice #: ${inv.invoice_number}</div>
              <div style="font-size: 0.8rem; color: #64748b;">Date: ${new Date(inv.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div class="rx-patient-bar">
            <div><strong>MRN:</strong> ${inv.mrn}</div>
            <div><strong>Patient Name:</strong> ${inv.patient_name}</div>
            <div><strong>Gender / Age:</strong> ${inv.gender} / ${inv.age} Yrs</div>
            <div><strong>Contact:</strong> ${inv.patient_phone}</div>
          </div>

          <table class="table" style="font-size: 0.9rem; margin: 2rem 0; border: 1px solid #e2e8f0;">
            <thead style="background: #f8fafc;">
              <tr>
                <th style="width: 10%;">#</th>
                <th style="width: 50%;">Item / Procedure Description</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 15%;">Unit Rate</th>
                <th style="width: 15%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.description}</strong></td>
                  <td>${it.quantity}</td>
                  <td>${app.clinic.currency} ${parseFloat(it.unit_price).toFixed(2)}</td>
                  <td style="text-align: right;"><strong>${app.clinic.currency} ${parseFloat(it.total_price).toFixed(2)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <span>Subtotal:</span>
                <strong>${app.clinic.currency} ${parseFloat(inv.subtotal).toFixed(2)}</strong>
              </div>
              ${inv.discount_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; color: #d97706;">
                  <span>Discount:</span>
                  <strong>-${app.clinic.currency} ${parseFloat(inv.discount_amount).toFixed(2)}</strong>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 0.5rem; font-size: 1.15rem; font-weight: 800;">
                <span>Total Amount:</span>
                <span style="color: #00c853;">${app.clinic.currency} ${parseFloat(inv.total_amount).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; font-weight: 700; color: #10b981;">
                <span>Paid Amount:</span>
                <span>${app.clinic.currency} ${parseFloat(inv.paid_amount).toFixed(2)}</span>
              </div>
              ${inv.balance_due > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; font-weight: 800; color: #ef4444;">
                  <span>Balance Due:</span>
                  <span>${app.clinic.currency} ${parseFloat(inv.balance_due).toFixed(2)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="margin-top: 4rem; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 0.75rem; color: #94a3b8;">
              Thank you for trusting Dream Garden PolyClinic.
            </div>
            <div style="text-align: center; border-top: 1.5px solid #0f172a; width: 220px; padding-top: 6px;">
              <div style="font-weight: 700; font-size: 0.9rem;">${inv.cashier_name}</div>
              <div style="font-size: 0.75rem; color: #64748b;">Authorized Cashier Signature</div>
            </div>
          </div>
        </div>
      `;
      app.printDocument(a4Html);
    }
  }
};
