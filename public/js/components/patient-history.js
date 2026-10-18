// ==========================================================================
// PATIENT 360° & MEDICAL RECORDS - INTUITIVE GRID VIEW SYSTEM
// Features: Grid View Layout, Edit / View / History actions, Register Patient, Zero Screen Scroll
// ==========================================================================

const patientHistoryComponent = {
  patientsList: [],
  selectedPatientId: null,
  searchQuery: '',
  genderFilter: 'all',
  bloodFilter: 'all',
  sortBy: 'newest',
  viewMode: 'grid',

  async render(container, preselectedPatientId = null) {
    if (preselectedPatientId) {
      this.selectedPatientId = preselectedPatientId;
    }

    container.innerHTML = `
      <style id="p360-scoped-styles">
        .p360-viewport {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: calc(100vh - var(--header-height) - 1.5rem);
          max-height: calc(100vh - var(--header-height) - 1rem);
          overflow: hidden;
          gap: 0.65rem;
        }
        .p360-toolbar-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.55rem 0.95rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .p360-toolbar-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
          flex: 1;
        }
        .p360-title-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--text-main);
          white-space: nowrap;
        }
        .p360-search-wrap {
          position: relative;
          width: 250px;
          flex-shrink: 0;
        }
        .p360-search-wrap i {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 0.78rem;
          pointer-events: none;
        }
        .p360-search-input {
          width: 100%;
          padding: 0.35rem 0.65rem 0.35rem 2rem;
          font-size: 0.78rem;
          height: 30px;
          border-radius: 8px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-input, var(--bg-card));
          color: var(--text-main);
          outline: none;
          transition: all 0.2s ease;
        }
        .p360-search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .p360-filters-row {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .p360-filter-pill {
          padding: 0.25rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 700;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
          height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .p360-filter-pill:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .p360-filter-pill.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }
        .p360-grid-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.4rem 0.5rem 1.5rem 0.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 1.15rem;
          align-content: start;
        }
        .p360-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 0.95rem 1.05rem 0.85rem 1.05rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 18px -3px rgba(0, 0, 0, 0.05), 0 2px 6px -2px rgba(0, 0, 0, 0.02);
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: visible;
        }
        .p360-card:hover {
          transform: translateY(-3px);
          border-color: rgba(37, 99, 235, 0.4);
          box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.14), 0 4px 10px -2px rgba(0, 0, 0, 0.04);
        }
        .p360-card-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #059669, #10b981, #14b8a6);
          opacity: 0.85;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          transition: all 0.25s ease;
        }
        .p360-card:hover .p360-card-top-accent {
          height: 4.5px;
          opacity: 1;
        }
        .p360-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.55rem;
        }
        .p360-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.95rem;
          color: #ffffff;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
          letter-spacing: 0.5px;
        }
        .p360-info {
          flex: 1;
          min-width: 0;
        }
        .p360-patient-name {
          font-size: 0.98rem;
          font-weight: 800;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.25;
          letter-spacing: -0.2px;
        }
        .p360-mrn-badge {
          font-family: 'Courier Prime', monospace;
          font-size: 0.72rem;
          font-weight: 800;
          background: rgba(37, 99, 235, 0.09);
          color: var(--primary);
          border: 1px solid rgba(37, 99, 235, 0.25);
          border-radius: 6px;
          padding: 1.5px 6px;
          display: inline-block;
          margin-top: 2px;
        }
        .p360-meta-tags {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
          margin-bottom: 0.55rem;
        }
        .p360-contact-row {
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--bg-canvas, rgba(148, 163, 184, 0.04));
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.45rem 0.65rem;
          margin-bottom: 0.65rem;
        }
        .p360-contact-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .p360-contact-item i {
          color: var(--primary);
          width: 14px;
          text-align: center;
          flex-shrink: 0;
          font-size: 0.76rem;
        }
        .p360-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 0.35rem;
          margin-top: 0.4rem;
          padding-top: 0.65rem;
          border-top: 1px solid var(--border-color);
          position: relative;
          z-index: 2;
        }
        .p360-btn {
          padding: 0.35rem 0.5rem;
          font-size: 0.74rem;
          font-weight: 700;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }
        .p360-btn:hover {
          transform: translateY(-1.5px);
        }
        .p360-btn-edit {
          background: rgba(37, 99, 235, 0.08);
          border-color: rgba(37, 99, 235, 0.22);
          color: var(--primary);
        }
        .p360-btn-edit:hover {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.32);
        }
        .p360-btn-view {
          background: rgba(13, 148, 136, 0.08);
          border-color: rgba(13, 148, 136, 0.22);
          color: var(--secondary);
        }
        .p360-btn-view:hover {
          background: var(--secondary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.32);
        }
        .p360-btn-history {
          background: rgba(225, 29, 72, 0.08);
          border-color: rgba(225, 29, 72, 0.22);
          color: var(--danger);
        }
        .p360-btn-history:hover {
          background: var(--danger);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.32);
        }
        .p360-btn-book {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.28);
          color: #059669;
          padding: 0.4rem 0.65rem;
        }
        .p360-btn-book:hover {
          background: #059669;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.36);
        }
        .p360-allergy-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: 6px;
          padding: 0.18rem 0.5rem;
          margin-top: 0.1rem;
        }
        .p360-allergy-none {
          background: rgba(100, 116, 139, 0.08);
          color: var(--text-muted);
          border: 1px solid rgba(100, 116, 139, 0.15);
        }
        .p360-allergy-alert {
          background: rgba(225, 29, 72, 0.1);
          color: var(--danger);
          border: 1px solid rgba(225, 29, 72, 0.25);
        }
        .p360-empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3.5rem 1.5rem;
          background: var(--bg-card);
          border: 2px dashed var(--border-color);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }
      </style>

      <div class="p360-viewport">
        
        <!-- Top Toolbar & Filter Header -->
        <div class="p360-toolbar-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.55rem 0.95rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
          <div class="p360-toolbar-left" style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; flex: 1;">
            <div class="p360-title-badge" style="display: flex; align-items: center; gap: 0.45rem; font-weight: 800; font-size: 0.95rem; color: var(--text-main); white-space: nowrap;">
              <i class="fa-solid fa-id-card-clip" style="color: var(--primary);"></i>
              <span>Patient Records</span>
              <span class="badge badge-teal" id="p360-total-badge" style="font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.45rem;">0 Patients</span>
            </div>

            <!-- Instant Search Input -->
            <div class="p360-search-wrap" style="position: relative; width: 250px; flex-shrink: 0;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.78rem;"></i>
              <input type="text" id="p360-search-input" class="p360-search-input" placeholder="Search by Name, MRN, Phone..." oninput="patientHistoryComponent.handleSearch(this.value)" value="${this.searchQuery}" style="width: 100%; padding: 0.35rem 0.65rem 0.35rem 2rem; font-size: 0.78rem; height: 30px; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
            </div>

            <!-- Gender Filter Pills -->
            <div class="p360-filters-row" style="display: flex; align-items: center; gap: 0.3rem;">
              <button class="p360-filter-pill ${this.genderFilter === 'all' ? 'active' : ''}" onclick="patientHistoryComponent.setGenderFilter('all')">All</button>
              <button class="p360-filter-pill ${this.genderFilter === 'Male' ? 'active' : ''}" onclick="patientHistoryComponent.setGenderFilter('Male')"><i class="fa-solid fa-mars"></i> Male</button>
              <button class="p360-filter-pill ${this.genderFilter === 'Female' ? 'active' : ''}" onclick="patientHistoryComponent.setGenderFilter('Female')"><i class="fa-solid fa-venus"></i> Female</button>
            </div>

            <!-- Blood Group Filter -->
            <select class="form-control" style="width: auto; height: 30px; padding: 0.15rem 0.55rem; font-size: 0.76rem; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-card); color: var(--text-main);" onchange="patientHistoryComponent.setBloodFilter(this.value)">
              <option value="all" ${this.bloodFilter === 'all' ? 'selected' : ''}>Blood: All</option>
              <option value="A+" ${this.bloodFilter === 'A+' ? 'selected' : ''}>A+</option>
              <option value="A-" ${this.bloodFilter === 'A-' ? 'selected' : ''}>A-</option>
              <option value="B+" ${this.bloodFilter === 'B+' ? 'selected' : ''}>B+</option>
              <option value="B-" ${this.bloodFilter === 'B-' ? 'selected' : ''}>B-</option>
              <option value="AB+" ${this.bloodFilter === 'AB+' ? 'selected' : ''}>AB+</option>
              <option value="AB-" ${this.bloodFilter === 'AB-' ? 'selected' : ''}>AB-</option>
              <option value="O+" ${this.bloodFilter === 'O+' ? 'selected' : ''}>O+</option>
              <option value="O-" ${this.bloodFilter === 'O-' ? 'selected' : ''}>O-</option>
            </select>
          </div>

          <!-- Right Action: Grid/List View Toggle, Registration & Sorting -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
            <!-- Grid Menu / List Table Switcher -->
            <div style="display: flex; border: 1.5px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--bg-card);">
              <button id="p360-view-grid-btn" class="btn btn-sm ${this.viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}" onclick="patientHistoryComponent.setViewMode('grid')" title="Card Grid Menu View" style="padding: 0.15rem 0.6rem; font-size: 0.74rem; height: 30px; border-radius: 0; border: none;">
                <i class="fa-solid fa-grip"></i> Grid
              </button>
              <button id="p360-view-list-btn" class="btn btn-sm ${this.viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" onclick="patientHistoryComponent.setViewMode('list')" title="Dense Table List View" style="padding: 0.15rem 0.6rem; font-size: 0.74rem; height: 30px; border-radius: 0; border: none; border-left: 1px solid var(--border-color);">
                <i class="fa-solid fa-table-list"></i> List
              </button>
            </div>

            <select class="form-control" style="width: auto; height: 30px; padding: 0.15rem 0.55rem; font-size: 0.76rem; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-card); color: var(--text-main);" onchange="patientHistoryComponent.setSortBy(this.value)">
              <option value="newest" ${this.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
              <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name (A-Z)</option>
              <option value="visits" ${this.sortBy === 'visits' ? 'selected' : ''}>Most Visits</option>
            </select>

            <button onclick="app.openNewPatientModal()" class="btn btn-primary btn-sm" id="p360-register-btn" style="font-size: 0.78rem; padding: 0.35rem 0.8rem; display: flex; align-items: center; gap: 0.4rem; height: 30px;">
              <i class="fa-solid fa-user-plus"></i> Register Patient
            </button>
          </div>
        </div>

        <!-- Main Patients Grid (Contained, No Page Scroll) -->
        <div id="p360-grid-container" class="p360-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 0.85rem; flex: 1; overflow-y: auto; padding: 0.2rem 0.2rem 1rem 0.2rem;">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--primary); margin-bottom: 0.5rem; display: block;"></i>
            Loading patient records...
          </div>
        </div>

      </div>
    `;

    await this.loadPatientsList();

    if (this.selectedPatientId) {
      app.openPatientHistoryModal(this.selectedPatientId);
    }
  },

  async loadPatientsList() {
    const res = await app.api('/patients');
    if (!res.success) {
      const container = document.getElementById('p360-grid-container');
      if (container) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--danger);">Failed to load patients list.</div>`;
      }
      return;
    }

    this.patientsList = res.data || [];
    this.renderGrid();
  },

  handleSearch(val) {
    this.searchQuery = (val || '').toLowerCase().trim();
    this.renderGrid();
  },

  setGenderFilter(gender) {
    this.genderFilter = gender;
    document.querySelectorAll('.p360-filter-pill').forEach(pill => {
      pill.classList.remove('active');
      if (pill.getAttribute('data-gender') === gender || (gender === 'all' && !pill.getAttribute('data-gender'))) {
        pill.classList.add('active');
      }
    });
    this.renderGrid();
  },

  setBloodFilter(val) {
    this.bloodFilter = val;
    this.renderGrid();
  },

  setSortBy(val) {
    this.sortBy = val;
    this.renderGrid();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    const gridBtn = document.getElementById('p360-view-grid-btn');
    const listBtn = document.getElementById('p360-view-list-btn');
    if (gridBtn && listBtn) {
      if (mode === 'grid') {
        gridBtn.className = 'btn btn-primary btn-sm';
        listBtn.className = 'btn btn-outline btn-sm';
      } else {
        gridBtn.className = 'btn btn-outline btn-sm';
        listBtn.className = 'btn btn-primary btn-sm';
      }
    }
    this.renderGrid();
  },

  renderGrid() {
    const container = document.getElementById('p360-grid-container');
    const badge = document.getElementById('p360-total-badge');
    if (!container) return;

    let filtered = [...this.patientsList];

    // Search filter
    if (this.searchQuery) {
      filtered = filtered.filter(p => 
        (p.full_name && p.full_name.toLowerCase().includes(this.searchQuery)) ||
        (p.mrn && p.mrn.toLowerCase().includes(this.searchQuery)) ||
        (p.phone && p.phone.includes(this.searchQuery)) ||
        (p.cnic && p.cnic.includes(this.searchQuery))
      );
    }

    // Gender filter
    if (this.genderFilter !== 'all') {
      filtered = filtered.filter(p => (p.gender || '').toLowerCase() === this.genderFilter.toLowerCase());
    }

    // Blood group filter
    if (this.bloodFilter && this.bloodFilter !== 'all') {
      filtered = filtered.filter(p => (p.blood_group || '').trim() === this.bloodFilter.trim());
    }

    // Sorting
    if (this.sortBy === 'name') {
      filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    } else if (this.sortBy === 'visits') {
      filtered.sort((a, b) => parseInt(b.total_visits || 0, 10) - parseInt(a.total_visits || 0, 10));
    } else {
      // Newest first (by ID descending)
      filtered.sort((a, b) => b.id - a.id);
    }

    if (badge) {
      badge.textContent = `${filtered.length} Patient${filtered.length === 1 ? '' : 's'}`;
    }

    // Empty state
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p360-empty-state">
          <div style="width: 72px; height: 72px; border-radius: 20px; background: rgba(37, 99, 235, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.15);">
            <i class="fa-solid fa-hospital-user"></i>
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">
            ${this.searchQuery || this.genderFilter !== 'all' || this.bloodFilter !== 'all' ? 'No Matching Patients Found' : 'No Patients Registered Yet'}
          </div>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 420px; margin: 0 auto; line-height: 1.45;">
            ${this.searchQuery || this.genderFilter !== 'all' || this.bloodFilter !== 'all' 
              ? 'Try modifying your search query or reset the gender / blood group filter.' 
              : 'Register your first patient to manage their 360° medical history, digital prescriptions, OPD vitals, and billing.'}
          </p>
          <button onclick="app.openNewPatientModal()" class="btn btn-primary" style="margin-top: 0.5rem; font-weight: 800; box-shadow: var(--primary-glow); padding: 0.6rem 1.4rem;">
            <i class="fa-solid fa-user-plus"></i> Register New Patient
          </button>
        </div>
      `;
      return;
    }

    // List Table View (Ultra-Compact Single Row, High Efficiency)
    if (this.viewMode === 'list') {
      container.className = 'table-responsive';
      container.style.display = 'block';
      container.style.gridTemplateColumns = 'none';
      container.style.background = 'var(--bg-card)';
      container.style.border = '1px solid var(--border-color)';
      container.style.borderRadius = '10px';
      container.style.padding = '0';
      container.style.overflowX = 'auto';

      container.innerHTML = `
        <table class="table table-hover" style="font-size: 0.78rem; margin-bottom: 0; width: 100%; border-collapse: collapse; white-space: nowrap;">
          <thead>
            <tr style="background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border-color);">
              <th style="padding: 0.45rem 0.65rem; width: 85px;">MRN</th>
              <th style="padding: 0.45rem 0.65rem; min-width: 170px;">Patient Name</th>
              <th style="padding: 0.45rem 0.65rem; width: 110px;">Gender & Age</th>
              <th style="padding: 0.45rem 0.65rem; width: 80px;">Blood</th>
              <th style="padding: 0.45rem 0.65rem; width: 120px;">Phone</th>
              <th style="padding: 0.45rem 0.65rem; min-width: 180px;">Address / Area</th>
              <th style="padding: 0.45rem 0.65rem; width: 75px; text-align: center;">Visits</th>
              <th style="padding: 0.45rem 0.65rem; text-align: right; min-width: 190px;">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p, idx) => {
              const isFemale = p.gender === 'Female';
              const rawMrn = (p.mrn || '').toString().replace(/MRN-?/gi, '');
              const formattedMrn = rawMrn ? `#${rawMrn}` : `#${p.id}`;
              const visits = parseInt(p.total_visits || 0, 10);
              const safeName = (p.full_name || 'Patient').replace(/'/g, "\\'");
              return `
                <tr style="border-bottom: 1px solid var(--border-color); height: 38px; line-height: 1.2;">
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle;">
                    <span style="font-family: monospace; font-weight: 800; color: var(--primary); background: rgba(37,99,235,0.08); padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.74rem;">${formattedMrn}</span>
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle; font-weight: 700; color: var(--text-main);">
                    <span style="cursor: pointer;" onclick="app.openPatientHistoryModal(${p.id})" title="Click to view full 360 EHR">${p.full_name}</span>
                    ${p.cnic ? `<span style="font-weight: 400; font-size: 0.68rem; color: var(--text-muted); margin-left: 0.35rem; font-family: monospace;">(${p.cnic})</span>` : ''}
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle;">
                    <span class="badge ${isFemale ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.69rem; padding: 0.12rem 0.4rem; font-weight: 600;">
                      <i class="fa-solid ${isFemale ? 'fa-venus' : 'fa-mars'}"></i> ${p.gender || '-'}, ${p.age ? p.age + 'Y' : '-'}
                    </span>
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle;">
                    <span class="badge ${p.blood_group && p.blood_group !== 'Unknown' ? 'badge-rose' : 'badge-gray'}" style="font-size: 0.69rem; padding: 0.12rem 0.38rem; font-weight: 700;">
                      ${p.blood_group || 'N/A'}
                    </span>
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle; font-weight: 600; color: var(--text-body);">
                    <i class="fa-solid fa-phone" style="font-size: 0.68rem; color: var(--text-muted); margin-right: 0.2rem;"></i>${p.phone || '-'}
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle; color: var(--text-muted); font-size: 0.74rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${p.address || ''}">
                    ${p.address || '-'}
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle; text-align: center;">
                    <span class="badge ${visits > 0 ? 'badge-teal' : 'badge-gray'}" style="font-size: 0.69rem; padding: 0.12rem 0.4rem; font-weight: 700;">
                      ${visits}
                    </span>
                  </td>
                  <td style="padding: 0.35rem 0.65rem; vertical-align: middle; text-align: right;">
                    <div style="display: inline-flex; gap: 0.25rem; align-items: center;">
                      <button onclick="patientsComponent.openEditPatientModal(${p.id})" class="btn btn-outline btn-sm" title="Edit Patient Info" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; height: 24px; line-height: 1;">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                      </button>
                      <button onclick="patientHistoryComponent.openQuickViewModal(${p.id})" class="btn btn-outline btn-sm" title="Quick Overview" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; height: 24px; line-height: 1;">
                        <i class="fa-solid fa-eye"></i> View
                      </button>
                      <button onclick="app.openPatientHistoryModal(${p.id})" class="btn btn-primary btn-sm" title="Full Medical History" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; height: 24px; line-height: 1;">
                        <i class="fa-solid fa-clock-rotate-left"></i> History
                      </button>
                      <button onclick="app.openBookAppointmentModal(${p.id})" class="btn btn-success btn-sm" title="Book Doctor Consultation" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; height: 24px; line-height: 1;">
                        <i class="fa-solid fa-calendar-plus"></i> Book
                      </button>
                      <button onclick="patientsComponent.deletePatient(${p.id}, '${safeName}')" class="btn btn-outline btn-sm" title="Delete Patient Record" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; height: 24px; line-height: 1; color: var(--wine-red); border-color: rgba(136, 19, 55, 0.35);">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      return;
    }

    // Grid Menu Cards View
    container.className = 'p360-grid-container';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(310px, 1fr))';
    container.style.background = 'transparent';
    container.style.border = 'none';
    container.style.padding = '0.2rem 0.2rem 1rem 0.2rem';

    const avatarGradients = [
      'linear-gradient(135deg, #0284c7, #38bdf8)',
      'linear-gradient(135deg, #0d9488, #2dd4bf)',
      'linear-gradient(135deg, #8b5cf6, #c084fc)',
      'linear-gradient(135deg, #6366f1, #818cf8)',
      'linear-gradient(135deg, #c67d0a, #f59e0b)',
      'linear-gradient(135deg, #e11d48, #fb7185)'
    ];

    container.innerHTML = filtered.map((p, idx) => {
      const isFemale = p.gender === 'Female';
      const avatarBg = isFemale ? 'linear-gradient(135deg, #e11d48, #fb7185)' : avatarGradients[idx % avatarGradients.length];
      const initials = (p.full_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const rawMrn = (p.mrn || '').toString().replace(/MRN-?/gi, '');
      const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${p.id}`;
      const visits = parseInt(p.total_visits || 0, 10);

      const hasAllergy = p.allergies && p.allergies.trim().length > 0 && !p.allergies.toLowerCase().includes('none');

      return `
        <div class="p360-card" id="patient-card-${p.id}">
          <div class="p360-card-top-accent"></div>

          <div>
            <!-- Card Header: Avatar & Name -->
            <div class="p360-card-header">
              <div class="p360-avatar" style="background: ${avatarBg};">
                ${initials}
              </div>
              <div class="p360-info">
                <div class="p360-patient-name" title="${p.full_name}">${p.full_name}</div>
                <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                  <span class="p360-mrn-badge">${formattedMrn}</span>
                  ${p.cnic ? `<span style="font-size: 0.68rem; color: var(--text-muted); font-family: monospace;">${p.cnic}</span>` : ''}
                </div>
              </div>
            </div>

            <!-- Meta Tags: Gender, Age, Blood, Visits -->
            <div class="p360-meta-tags">
              <span class="badge ${isFemale ? 'badge-rose' : 'badge-blue'}" style="font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                <i class="fa-solid ${isFemale ? 'fa-venus' : 'fa-mars'}"></i> ${p.gender || 'N/A'}, ${p.age || 'N/A'} Yrs
              </span>
              <span class="badge ${p.blood_group && p.blood_group !== 'Unknown' ? 'badge-rose' : 'badge-teal'}" style="font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                <i class="fa-solid fa-droplet"></i> ${p.blood_group && p.blood_group !== 'Unknown' ? p.blood_group : 'Blood N/A'}
              </span>
              <span class="badge badge-teal" style="font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                <i class="fa-solid fa-calendar-check"></i> ${visits} Visit${visits === 1 ? '' : 's'}
              </span>
            </div>

            <!-- Contact & Address -->
            <div class="p360-contact-row">
              <div class="p360-contact-item">
                <i class="fa-solid fa-phone" style="color: var(--primary);"></i>
                <strong style="color: var(--text-main); font-weight: 700; font-size: 0.78rem;">${p.phone || 'No phone registered'}</strong>
              </div>
              <div class="p360-contact-item">
                <i class="fa-solid fa-location-dot" style="color: #0284c7;"></i>
                <span title="${p.address || 'Dream Garden Registered'}" style="color: var(--text-body);">${p.address || 'Dream Garden PolyClinic'}</span>
              </div>
              <div class="p360-contact-item" style="margin-top: 0.15rem;">
                <i class="fa-solid ${hasAllergy ? 'fa-triangle-exclamation' : 'fa-shield-halved'}" style="color: ${hasAllergy ? 'var(--danger)' : '#10b981'};"></i>
                <span class="p360-allergy-badge ${hasAllergy ? 'p360-allergy-alert' : 'p360-allergy-none'}" title="${hasAllergy ? 'Known Allergy: ' + p.allergies : 'No known allergies reported'}">
                  ${hasAllergy ? 'Allergy: ' + p.allergies : 'Allergies: None Reported'}
                </span>
              </div>
            </div>
          </div>

          <!-- Card Actions: Edit, View, History, Book, and Delete -->
          <div class="p360-card-actions">
            <button onclick="patientsComponent.openEditPatientModal(${p.id})" class="p360-btn p360-btn-edit" title="Edit Demographics & Info">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button onclick="patientHistoryComponent.openQuickViewModal(${p.id})" class="p360-btn p360-btn-view" title="Quick View Summary">
              <i class="fa-solid fa-eye"></i> View
            </button>
            <button onclick="app.openPatientHistoryModal(${p.id})" class="p360-btn p360-btn-history" title="Full 360° Medical History">
              <i class="fa-solid fa-clock-rotate-left"></i> History
            </button>
            <button onclick="app.openBookAppointmentModal(${p.id})" class="p360-btn p360-btn-book" title="Book Doctor Consultation">
              <i class="fa-solid fa-calendar-plus"></i>
            </button>
            <button onclick="patientsComponent.deletePatient(${p.id}, '${(p.full_name || 'Patient').replace(/'/g, "\\'")}')" class="p360-btn" title="Delete Patient Record" style="color: var(--wine-red); border: 1px solid rgba(136, 19, 55, 0.35); background: transparent;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

        </div>
      `;
    }).join('');
  },

  // Quick View Patient Overview Modal (Instant 0ms opening + background hydration)
  async openQuickViewModal(patientId) {
    const cachedP = this.patientsList ? this.patientsList.find(item => item.id == patientId) : null;

    const renderModalContent = (p, appointments = [], vitals = [], invoices = [], isLoadingExtra = false) => {
      const isFemale = p.gender === 'Female';
      const initials = (p.full_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const rawMrn = (p.mrn || '').toString().replace(/MRN-?/gi, '');
      const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${p.id}`;

      let totalBilled = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      invoices.forEach(inv => {
        totalBilled += parseFloat(inv.total_amount || 0);
        totalPaid += parseFloat(inv.paid_amount || 0);
        totalBalance += parseFloat(inv.balance_due || 0);
      });

      const bodyHtml = `
        <div style="display: flex; flex-direction: column; gap: 1.15rem;">
          
          <!-- Top Profile Card -->
          <div style="background: var(--bg-main); border: 1.5px solid var(--border-color); border-radius: 14px; padding: 1.15rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="avatar-bubble ${isFemale ? 'avatar-rose' : 'avatar-blue'}" style="width: 56px; height: 56px; font-size: 1.3rem; font-weight: 800;">
                ${initials}
              </div>
              <div>
                <div style="font-size: 1.25rem; font-weight: 900; color: var(--text-main);">${p.full_name}</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 4px;">
                  <span class="badge ${isFemale ? 'badge-rose' : 'badge-blue'}">${p.gender}, ${p.age || '-'} Yrs</span>
                  <span class="p360-mrn-badge">${formattedMrn}</span>
                  <span class="badge badge-teal">${p.blood_group ? `Blood: ${p.blood_group}` : 'Blood: Unknown'}</span>
                </div>
              </div>
            </div>

            <!-- Quick Counters -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.45rem 0.85rem; border-radius: 10px; text-align: center;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase;">Visits</div>
                <div id="qv-visits-count" style="font-size: 1.1rem; font-weight: 900; color: var(--primary);">
                  ${isLoadingExtra ? (p.appointment_count || '<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.9rem;"></i>') : appointments.length}
                </div>
              </div>
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.45rem 0.85rem; border-radius: 10px; text-align: center;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase;">Vitals Recorded</div>
                <div id="qv-vitals-count" style="font-size: 1.1rem; font-weight: 900; color: var(--secondary);">
                  ${isLoadingExtra ? '<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.9rem;"></i>' : vitals.length}
                </div>
              </div>
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.45rem 0.85rem; border-radius: 10px; text-align: center;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase;">Outstanding</div>
                <div id="qv-balance-count" style="font-size: 1.1rem; font-weight: 900; color: ${totalBalance > 0 ? 'var(--danger)' : 'var(--success)'};">
                  ${isLoadingExtra ? '<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.9rem;"></i>' : `${app.clinic.currency} ${totalBalance.toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>

          <!-- Detailed Demographics & Medical History Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            
            <!-- Contact & Personal Info -->
            <div class="card" style="margin: 0; padding: 1rem; border: 1px solid var(--border-color); border-radius: 12px;">
              <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                <i class="fa-solid fa-address-book" style="color: var(--primary);"></i> Contact & Identification
              </div>
              <table class="table" style="font-size: 0.82rem; margin: 0;">
                <tbody>
                  <tr>
                    <td style="color: var(--text-muted); width: 120px; padding: 0.4rem 0;">Primary Phone:</td>
                    <td style="font-weight: 700; color: var(--text-main); padding: 0.4rem 0;"><i class="fa-solid fa-phone" style="color: var(--primary);"></i> ${p.phone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="color: var(--text-muted); padding: 0.4rem 0;">CNIC / ID:</td>
                    <td style="font-weight: 700; color: var(--text-main); padding: 0.4rem 0;">${p.cnic || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="color: var(--text-muted); padding: 0.4rem 0;">Date of Birth:</td>
                    <td style="font-weight: 700; color: var(--text-main); padding: 0.4rem 0;">${p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="color: var(--text-muted); padding: 0.4rem 0;">Marital Status:</td>
                    <td style="font-weight: 700; color: var(--text-main); padding: 0.4rem 0;">${p.marital_status || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="color: var(--text-muted); padding: 0.4rem 0;">Address:</td>
                    <td style="font-weight: 700; color: var(--text-main); padding: 0.4rem 0;">${p.address || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Clinical History & Alerts -->
            <div class="card" style="margin: 0; padding: 1rem; border: 1px solid var(--border-color); border-radius: 12px;">
              <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                <i class="fa-solid fa-heart-pulse" style="color: var(--danger);"></i> Clinical Alerts & Conditions
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                <div style="background: rgba(225, 29, 72, 0.08); border: 1px solid rgba(225, 29, 72, 0.25); border-radius: 8px; padding: 0.55rem 0.75rem;">
                  <div style="font-size: 0.72rem; font-weight: 800; color: var(--danger); text-transform: uppercase;">Known Drug & Food Allergies</div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">
                    ${p.allergies || 'No known allergies reported (NKDA)'}
                  </div>
                </div>
                <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.25); border-radius: 8px; padding: 0.55rem 0.75rem;">
                  <div style="font-size: 0.72rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">Chronic Conditions</div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">
                    ${p.chronic_conditions || 'No chronic conditions recorded'}
                  </div>
                </div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.25rem;">
                  Registered on: <strong>${p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Active Record'}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      `;

      const footerHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <button class="btn btn-outline btn-sm" onclick="app.closeModal()">Close</button>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-outline btn-sm" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.4);" onclick="patientsComponent.deletePatient(${p.id}, '${(p.full_name || 'Patient').replace(/'/g, "\\'")}')" title="Delete Patient Record">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
            <button class="btn btn-outline btn-sm" onclick="app.closeModal(); patientsComponent.openEditPatientModal(${p.id})">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-primary btn-sm" onclick="app.closeModal(); app.openPatientHistoryModal(${p.id})">
              <i class="fa-solid fa-clock-rotate-left"></i> Full 360° History
            </button>
            <button class="btn btn-success btn-sm" onclick="app.closeModal(); app.openBookAppointmentModal(${p.id})">
              <i class="fa-solid fa-calendar-plus"></i> Book
            </button>
          </div>
        </div>
      `;

      app.openModal(`<i class="fa-solid fa-user-check"></i> Patient Overview (${formattedMrn})`, bodyHtml, footerHtml, 'modal-xl');
    };

    // If cached patient is present, open modal immediately (0ms delay)
    if (cachedP) {
      renderModalContent(cachedP, [], [], [], true);
    }

    // Hydrate full data asynchronously
    const res = await app.api(`/patients/${patientId}`);
    if (res.success && res.data) {
      const { patient: p, appointments = [], vitals = [], invoices = [] } = res.data;
      renderModalContent(p, appointments, vitals, invoices, false);
    } else if (!cachedP) {
      app.toast(res.message || 'Failed to load patient summary', 'error');
    }
  },

  // Compatibility helper for external invocations
  selectPatient(patientId) {
    this.selectedPatientId = patientId;
    app.openPatientHistoryModal(patientId);
  },

  printPatientDossier(patientId) {
    if (typeof patientsComponent !== 'undefined' && patientsComponent.printMedicalSummary) {
      patientsComponent.printMedicalSummary(patientId);
    } else {
      window.print();
    }
  }
};
