// ==========================================================================
// ALL VITALS & BILLS UNIFIED AUDIT COMPONENT (NO HORIZONTAL SCROLLING)
// ==========================================================================

const vitalsBillsComponent = {
  currentSubTab: 'vitals', // 'vitals' or 'bills'
  vitalsData: [],
  billsData: [],
  vitalsFilter: 'all',
  billsFilter: 'all',
  searchQuery: '',

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
        <!-- Sub-tabs Selector -->
        <div style="display: inline-flex; background: var(--light-gray); padding: 0.15rem; border-radius: 8px; gap: 0.2rem; border: 1px solid var(--border-color);">
          <button id="subtab-btn-vitals" onclick="vitalsBillsComponent.switchSubTab('vitals')" class="btn btn-sm ${this.currentSubTab === 'vitals' ? 'btn-primary' : 'btn-outline'}" style="${this.currentSubTab === 'vitals' ? 'background: var(--primary); color: white;' : 'background: transparent; border: none; color: var(--text-muted);'} font-weight: 700; padding: 0.25rem 0.75rem; font-size: 0.78rem;">
            <i class="fa-solid fa-heart-pulse"></i> All Patient Vitals History
          </button>
          <button id="subtab-btn-bills" onclick="vitalsBillsComponent.switchSubTab('bills')" class="btn btn-sm ${this.currentSubTab === 'bills' ? 'btn-primary' : 'btn-outline'}" style="${this.currentSubTab === 'bills' ? 'background: var(--primary); color: white;' : 'background: transparent; border: none; color: var(--text-muted);'} font-weight: 700; padding: 0.25rem 0.75rem; font-size: 0.78rem;">
            <i class="fa-solid fa-file-invoice-dollar"></i> All Patient Invoices & Bills
          </button>
        </div>

        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button onclick="vitalsBillsComponent.refreshCurrentTab()" class="btn btn-outline btn-sm" title="Refresh records" style="font-size: 0.76rem; padding: 0.25rem 0.6rem;">
            <i class="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Dynamic Sub-Tab View Outlet -->
      <div id="vitals-bills-content">
        <!-- Rendered dynamically -->
      </div>
    `;

    this.renderSubTabContent();
  },

  switchSubTab(tab) {
    this.currentSubTab = tab;
    this.searchQuery = '';
    const btnVitals = document.getElementById('subtab-btn-vitals');
    const btnBills = document.getElementById('subtab-btn-bills');

    if (btnVitals && btnBills) {
      if (tab === 'vitals') {
        btnVitals.style.background = 'var(--cyber-green)';
        btnVitals.style.color = '#ffffff';
        btnVitals.style.boxShadow = 'var(--green-glow)';
        btnBills.style.background = 'transparent';
        btnBills.style.color = 'var(--text-muted)';
        btnBills.style.boxShadow = 'none';
      } else {
        btnBills.style.background = 'var(--cyber-green)';
        btnBills.style.color = '#ffffff';
        btnBills.style.boxShadow = 'var(--green-glow)';
        btnVitals.style.background = 'transparent';
        btnVitals.style.color = 'var(--text-muted)';
        btnVitals.style.boxShadow = 'none';
      }
    }

    this.renderSubTabContent();
  },

  async refreshCurrentTab() {
    if (this.currentSubTab === 'vitals') {
      await this.loadVitals();
    } else {
      await this.loadBills();
    }
  },

  renderSubTabContent() {
    const content = document.getElementById('vitals-bills-content');
    if (!content) return;

    if (this.currentSubTab === 'vitals') {
      this.renderVitalsView(content);
    } else {
      this.renderBillsView(content);
    }
  },

  // =========================================================================
  // SUB-TAB 1: ALL VITALS
  // =========================================================================
  async renderVitalsView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom: 0;">
        <div class="card-header" style="padding: 0.75rem 1rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; width: 100%; justify-content: space-between;">
            <div style="display: flex; gap: 0.65rem; align-items: center; flex: 1; min-width: 260px;">
              <div style="position: relative; width: 100%; max-width: 280px;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 9px; color: #94a3b8; font-size: 0.8rem;"></i>
                <input type="text" id="vitals-search-input" class="form-control form-control-sm" style="padding-left: 2rem; font-size: 0.82rem;" placeholder="Search patient name, MRN..." oninput="vitalsBillsComponent.handleVitalsSearch(this.value)">
              </div>

              <!-- Filter Pills -->
              <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                <button class="btn btn-sm ${this.vitalsFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setVitalsFilter('all')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">All</button>
                <button class="btn btn-sm ${this.vitalsFilter === 'high_bp' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setVitalsFilter('high_bp')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; color: #ef4444; border-color: #fca5a5;">High BP</button>
                <button class="btn btn-sm ${this.vitalsFilter === 'fever' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setVitalsFilter('fever')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; color: #d97706; border-color: #fde68a;">Fever</button>
                <button class="btn btn-sm ${this.vitalsFilter === 'low_spo2' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setVitalsFilter('low_spo2')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; color: #7c3aed; border-color: #ddd6fe;">Low SpO2</button>
              </div>
            </div>
            
            <div id="vitals-summary-count" style="font-size: 0.8rem; font-weight: 700; color: var(--cyber-green);">
              Loading records...
            </div>
          </div>
        </div>

        <div class="table-responsive table-viewport">
          <table class="table table-dense" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 110px;">Recorded Date</th>
                <th style="min-width: 180px;">Patient & MRN</th>
                <th style="min-width: 140px;">Consultant</th>
                <th style="width: 130px;">Blood Pressure</th>
                <th style="min-width: 160px;">Pulse / Temp / SpO2</th>
                <th style="text-align: right; width: 140px;">Actions</th>
              </tr>
            </thead>
            <tbody id="all-vitals-table-body">
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Loading vitals records...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadVitals();
  },

  async loadVitals() {
    const res = await app.api('/vitals/all');
    if (!res.success) return;

    this.vitalsData = res.data || [];
    this.renderVitalsTable();
  },

  handleVitalsSearch(q) {
    this.searchQuery = q.toLowerCase().trim();
    this.renderVitalsTable();
  },

  setVitalsFilter(filter) {
    this.vitalsFilter = filter;
    this.renderVitalsView(document.getElementById('vitals-bills-content'));
  },

  renderVitalsTable() {
    const tbody = document.getElementById('all-vitals-table-body');
    const countEl = document.getElementById('vitals-summary-count');
    if (!tbody) return;

    let filtered = [...this.vitalsData];

    if (this.searchQuery) {
      filtered = filtered.filter(v => 
        (v.patient_name && v.patient_name.toLowerCase().includes(this.searchQuery)) ||
        (v.mrn && v.mrn.toLowerCase().includes(this.searchQuery)) ||
        (v.phone && v.phone.includes(this.searchQuery)) ||
        (v.doctor_name && v.doctor_name.toLowerCase().includes(this.searchQuery))
      );
    }

    if (this.vitalsFilter === 'high_bp') {
      filtered = filtered.filter(v => (v.systolic_bp >= 140 || v.diastolic_bp >= 90));
    } else if (this.vitalsFilter === 'fever') {
      filtered = filtered.filter(v => v.temperature_f >= 100.4);
    } else if (this.vitalsFilter === 'low_spo2') {
      filtered = filtered.filter(v => v.spo2 && v.spo2 < 95);
    }

    if (countEl) countEl.textContent = `${filtered.length} Vitals Record${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
            <i class="fa-solid fa-heart-pulse" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: #cbd5e1;"></i>
            No vitals records match your search or filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    const avatarColors = ['avatar-teal', 'avatar-blue', 'avatar-purple', 'avatar-indigo', 'avatar-rose', 'avatar-amber', 'avatar-emerald'];

    tbody.innerHTML = filtered.map((v, idx) => {
      const avatarColor = avatarColors[idx % avatarColors.length];
      const initials = (v.patient_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const dateStr = new Date(v.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = new Date(v.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      let bpBadge = `<span style="color: #94a3b8; font-style: italic;">--</span>`;
      if (v.systolic_bp && v.diastolic_bp) {
        let isAlert = v.systolic_bp >= 140 || v.diastolic_bp >= 90;
        let isWarn = v.systolic_bp >= 120 || v.diastolic_bp >= 80;
        let bpBg = isAlert ? '#fee2e2' : (isWarn ? '#fef3c7' : '#e0f2fe');
        let bpColor = isAlert ? '#b91c1c' : (isWarn ? '#b45309' : '#0369a1');
        bpBadge = `
          <span style="display: inline-block; background: ${bpBg}; color: ${bpColor}; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.78rem; white-space: nowrap;">
            <i class="fa-solid fa-heart-pulse"></i> ${v.systolic_bp}/${v.diastolic_bp}
          </span>
        `;
      }

      const rawMrn = (v.mrn || '').toString().replace(/MRN-?/gi, '');
      const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${v.patient_id}`;

      return `
        <tr>
          <td class="cell-nowrap">
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.82rem; white-space: nowrap;">${dateStr}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); font-family: monospace; white-space: nowrap;">${timeStr}</div>
          </td>
          <td class="patient-details-cell">
            <div style="display: flex; align-items: center; gap: 0.55rem;">
              <div class="avatar-bubble ${avatarColor}" style="cursor: pointer; width: 30px; height: 30px; font-size: 0.74rem; flex-shrink: 0;" onclick="app.openPatientHistoryModal(${v.patient_id})" title="Open Patient 360">${initials}</div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.86rem; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="app.openPatientHistoryModal(${v.patient_id})">${v.patient_name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap;">
                  <span style="font-family: monospace; color: var(--cyber-green); font-weight: 700;">${formattedMrn}</span>
                </div>
              </div>
            </div>
          </td>
          <td class="doctor-details-cell">
            <div style="font-weight: 600; color: var(--text-body); font-size: 0.82rem; white-space: nowrap;">${v.doctor_name || 'General OPD'}</div>
          </td>
          <td class="cell-nowrap">${bpBadge}</td>
          <td class="cell-nowrap">
            <div style="font-size: 0.76rem; color: var(--text-body); white-space: nowrap; display: flex; gap: 0.4rem; align-items: center;">
              ${v.pulse_rate ? `<span><i class="fa-solid fa-wave-square" style="color:#0284c7;"></i> ${v.pulse_rate}</span>` : ''}
              ${v.temperature_f ? `<span><i class="fa-solid fa-temperature-half" style="color:#d97706;"></i> ${v.temperature_f}°F</span>` : ''}
              ${v.spo2 ? `<span><i class="fa-solid fa-lungs" style="color:#059669;"></i> ${v.spo2}%</span>` : ''}
            </div>
          </td>
          <td class="cell-nowrap" style="text-align: right;">
            <div style="display: inline-flex; gap: 0.3rem;">
              <button onclick="app.openEditVitalsModal(${v.id})" class="btn btn-outline btn-sm" title="Re-edit Vitals" style="padding: 0.2rem 0.45rem; font-size: 0.72rem;">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button onclick="app.openPatientHistoryModal(${v.patient_id})" class="btn btn-outline-primary btn-sm" title="View Patient 360" style="padding: 0.2rem 0.45rem; font-size: 0.72rem;">
                <i class="fa-solid fa-folder-open"></i> EHR
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // =========================================================================
  // SUB-TAB 2: ALL BILLS & INVOICES
  // =========================================================================
  async renderBillsView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom: 0;">
        <div class="card-header" style="padding: 0.75rem 1rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; width: 100%; justify-content: space-between;">
            <div style="display: flex; gap: 0.65rem; align-items: center; flex: 1; min-width: 260px;">
              <div style="position: relative; width: 100%; max-width: 280px;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 9px; color: #94a3b8; font-size: 0.8rem;"></i>
                <input type="text" id="bills-search-input" class="form-control form-control-sm" style="padding-left: 2rem; font-size: 0.82rem;" placeholder="Search invoice #, patient..." oninput="vitalsBillsComponent.handleBillsSearch(this.value)">
              </div>

              <!-- Filter Pills -->
              <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                <button class="btn btn-sm ${this.billsFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setBillsFilter('all')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem;">All</button>
                <button class="btn btn-sm ${this.billsFilter === 'paid' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setBillsFilter('paid')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; color: #059669; border-color: #a7f3d0;">Paid</button>
                <button class="btn btn-sm ${this.billsFilter === 'unpaid' ? 'btn-primary' : 'btn-outline'}" onclick="vitalsBillsComponent.setBillsFilter('unpaid')" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; color: #ef4444; border-color: #fca5a5;">Unpaid</button>
              </div>
            </div>

            <div id="bills-summary-count" style="font-size: 0.8rem; font-weight: 700; color: var(--cyber-green);">
              Loading invoices...
            </div>
          </div>
        </div>

        <div class="table-responsive table-viewport">
          <table class="table table-dense" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 110px;">Invoice / Date</th>
                <th style="min-width: 180px;">Patient & MRN</th>
                <th style="min-width: 140px;">Doctor</th>
                <th style="width: 120px;">Net Total</th>
                <th style="width: 100px;">Status</th>
                <th style="text-align: right; width: 140px;">Print & Actions</th>
              </tr>
            </thead>
            <tbody id="all-bills-table-body">
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Loading bills records...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadBills();
  },

  async loadBills() {
    const res = await app.api('/billing/invoices');
    if (!res.success) return;

    this.billsData = res.data || [];
    this.renderBillsTable();
  },

  handleBillsSearch(q) {
    this.searchQuery = q.toLowerCase().trim();
    this.renderBillsTable();
  },

  setBillsFilter(filter) {
    this.billsFilter = filter;
    this.renderBillsView(document.getElementById('vitals-bills-content'));
  },

  renderBillsTable() {
    const tbody = document.getElementById('all-bills-table-body');
    const countEl = document.getElementById('bills-summary-count');
    if (!tbody) return;

    let filtered = [...this.billsData];

    if (this.searchQuery) {
      filtered = filtered.filter(b => 
        (b.invoice_number && b.invoice_number.toLowerCase().includes(this.searchQuery)) ||
        (b.patient_name && b.patient_name.toLowerCase().includes(this.searchQuery)) ||
        (b.mrn && b.mrn.toLowerCase().includes(this.searchQuery)) ||
        (b.doctor_name && b.doctor_name.toLowerCase().includes(this.searchQuery))
      );
    }

    if (this.billsFilter === 'paid') {
      filtered = filtered.filter(b => b.payment_status === 'paid');
    } else if (this.billsFilter === 'unpaid') {
      filtered = filtered.filter(b => b.payment_status === 'unpaid' || b.payment_status === 'partial');
    }

    if (countEl) countEl.textContent = `${filtered.length} Invoice${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
            <i class="fa-solid fa-file-invoice-dollar" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: #cbd5e1;"></i>
            No billing records found matching your filters.
          </td>
        </tr>
      `;
      return;
    }

    const avatarColors = ['avatar-teal', 'avatar-blue', 'avatar-purple', 'avatar-indigo', 'avatar-rose', 'avatar-amber', 'avatar-emerald'];

    tbody.innerHTML = filtered.map((b, idx) => {
      const avatarColor = avatarColors[idx % avatarColors.length];
      const initials = (b.patient_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const dateStr = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let statusBadge = `<span class="badge badge-green" style="font-size: 0.7rem; padding: 2px 6px;"><i class="fa-solid fa-circle-check"></i> Paid</span>`;
      if (b.payment_status === 'unpaid') {
        statusBadge = `<span class="badge badge-rose" style="font-size: 0.7rem; padding: 2px 6px;"><i class="fa-solid fa-circle-xmark"></i> Unpaid</span>`;
      } else if (b.payment_status === 'partial') {
        statusBadge = `<span class="badge badge-amber" style="font-size: 0.7rem; padding: 2px 6px;"><i class="fa-solid fa-circle-exclamation"></i> Partial</span>`;
      }

      const rawMrn = (b.mrn || '').toString().replace(/MRN-?/gi, '');
      const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${b.patient_id}`;

      return `
        <tr>
          <td class="cell-nowrap">
            <div style="font-weight: 800; color: var(--caramel); font-family: monospace; font-size: 0.84rem; white-space: nowrap;">${b.invoice_number}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap;">${dateStr}</div>
          </td>
          <td class="patient-details-cell">
            <div style="display: flex; align-items: center; gap: 0.55rem;">
              <div class="avatar-bubble ${avatarColor}" style="cursor: pointer; width: 30px; height: 30px; font-size: 0.74rem; flex-shrink: 0;" onclick="app.openPatientHistoryModal(${b.patient_id})" title="Open Patient 360">${initials}</div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.86rem; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="app.openPatientHistoryModal(${b.patient_id})">${b.patient_name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap;">
                  <span style="font-family: monospace; color: var(--cyber-green); font-weight: 700;">${formattedMrn}</span>
                </div>
              </div>
            </div>
          </td>
          <td class="doctor-details-cell">
            <div style="font-weight: 600; color: var(--text-body); font-size: 0.82rem; white-space: nowrap;">${b.doctor_name || 'General OPD'}</div>
          </td>
          <td class="cell-nowrap">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.88rem; white-space: nowrap;">${app.clinic.currency} ${parseFloat(b.total_amount || 0).toLocaleString()}</div>
          </td>
          <td class="cell-nowrap">${statusBadge}</td>
          <td class="cell-nowrap" style="text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; gap: 0.3rem;">
              <button onclick="billingComponent.printInvoice(${b.id}, 'pos')" class="btn btn-outline btn-sm" title="Print POS Thermal Slip" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; white-space: nowrap;">
                <i class="fa-solid fa-receipt" style="color: var(--cyber-green);"></i> Slip
              </button>
              <button onclick="app.openPatientHistoryModal(${b.patient_id})" class="btn btn-outline-primary btn-sm" title="View Patient 360 Record" style="padding: 0.2rem 0.45rem; font-size: 0.72rem; white-space: nowrap;">
                <i class="fa-solid fa-folder-open"></i> EHR
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
};
