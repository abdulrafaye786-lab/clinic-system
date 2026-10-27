// ==========================================================================
// DASHBOARD COMPONENT - CLINIC WORKFLOW, DATE-BASED APPOINTMENTS & ANALYTICS
// Unified Single-Page View: Live Analytics & Booked Appointments simultaneously
// ==========================================================================

const dashboardComponent = {
  charts: {},
  selectedDate: (typeof app !== 'undefined' && typeof app.getSelectedDate === 'function') 
    ? app.getSelectedDate() 
    : (localStorage.getItem('gclinic_selected_date') || (() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })()),
  searchQuery: '',
  statusFilter: 'all',
  doctorFilter: 'all',
  appointmentsData: [],
  cachedChartData: null,
  async render(container) {
    if (typeof app !== 'undefined' && typeof app.getSelectedDate === 'function') {
      this.selectedDate = app.getSelectedDate();
    } else {
      const saved = localStorage.getItem('gclinic_selected_date');
      if (saved) this.selectedDate = saved;
    }
    container.className = 'page-content';
    container.style.overflowY = 'auto';
    container.style.overflowX = 'hidden';
    container.style.display = 'block';
    container.style.height = 'calc(100vh - var(--header-height))';
    container.style.maxHeight = 'calc(100vh - var(--header-height))';
    container.style.padding = '0.5rem 0.85rem 3rem 0.85rem';

    const formattedDate = new Date(this.selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    container.innerHTML = `
      <!-- ================================================================= -->
      <!-- 1. TOP: DATE BAR & QUICK CONTROLS -->
      <!-- ================================================================= -->
      <div class="card u-morphism-card" style="margin-bottom: 0; padding: 0.35rem 0.75rem; flex-shrink: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="font-size: 0.94rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-regular fa-calendar-check" style="color: var(--primary);"></i>
              <span id="dash-date-display">${formattedDate}</span>
            </div>
            <span class="badge badge-teal" style="font-size: 0.68rem; padding: 0.1rem 0.4rem; font-weight: 700;">Live Clinic Roster</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.25rem; background: var(--bg-card); padding: 0.12rem 0.4rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-body); margin: 0; display: flex; align-items: center; gap: 3px;">
                <i class="fa-regular fa-calendar" style="color: var(--primary);"></i> Date:
              </label>
              <input type="date" id="dash-date-picker" class="form-control" style="width: auto; padding: 0.08rem 0.35rem; font-weight: 700; font-size: 0.74rem; height: 25px;" value="${this.selectedDate}" onchange="dashboardComponent.handleDateChange(this.value)">
            </div>

            <div class="btn-group" style="display: flex; gap: 2px;">
              <button type="button" id="dash-btn-yesterday" class="btn btn-sm ${this.isDateEqual(this.selectedDate, 'yesterday') ? 'btn-primary' : 'btn-outline'}" style="padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; height: 25px;" onclick="dashboardComponent.setDatePreset('yesterday')">Yesterday</button>
              <button type="button" id="dash-btn-today" class="btn btn-sm ${this.isDateEqual(this.selectedDate, 'today') ? 'btn-primary' : 'btn-outline'}" style="padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; height: 25px;" onclick="dashboardComponent.setDatePreset('today')">Today</button>
              <button type="button" id="dash-btn-tomorrow" class="btn btn-sm ${this.isDateEqual(this.selectedDate, 'tomorrow') ? 'btn-primary' : 'btn-outline'}" style="padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; height: 25px;" onclick="dashboardComponent.setDatePreset('tomorrow')">Tomorrow</button>
            </div>

            <button onclick="app.openBookAppointmentModal(null, null, dashboardComponent.selectedDate)" class="btn btn-primary btn-sm" style="font-weight: 800; padding: 0.15rem 0.65rem; font-size: 0.74rem; height: 25px; box-shadow: 0 3px 10px rgba(37, 99, 235, 0.35);">
              <i class="fa-solid fa-calendar-plus"></i> + Book Appointment
            </button>

            <button onclick="dashboardComponent.load()" class="btn btn-outline btn-sm" title="Refresh Live Data" style="padding: 0.15rem 0.5rem; font-size: 0.74rem; height: 25px;">
              <i class="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- 2. TOP: 4 METRIC STAT CARDS -->
      <!-- ================================================================= -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.45rem; margin-bottom: 0; flex-shrink: 0;">
        <!-- 1. Appointments KPI -->
        <div class="card u-morphism-card" style="margin-bottom: 0; padding: 0.45rem 0.75rem; border-left: 4px solid var(--primary); display: flex; align-items: center; justify-content: space-between;">
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">OPD Appointments</div>
            <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-main); line-height: 1.1; margin: 0.1rem 0;" id="kpi-today-appts">-</div>
            <div style="font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="kpi-waiting-appts"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>
          </div>
          <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(37, 99, 235, 0.12); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
            <i class="fa-solid fa-calendar-check"></i>
          </div>
        </div>

        <!-- 2. Collections KPI -->
        <div class="card u-morphism-card" style="margin-bottom: 0; padding: 0.45rem 0.75rem; border-left: 4px solid var(--secondary); display: flex; align-items: center; justify-content: space-between;">
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Collections & Revenue</div>
            <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-main); line-height: 1.1; margin: 0.1rem 0;" id="kpi-today-revenue">-</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="kpi-receivable">-</div>
          </div>
          <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(13, 148, 136, 0.12); color: var(--secondary); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
            <i class="fa-solid fa-coins"></i>
          </div>
        </div>

        <!-- 3. Total Patients KPI -->
        <div class="card u-morphism-card" style="margin-bottom: 0; padding: 0.45rem 0.75rem; border-left: 4px solid #10b981; display: flex; align-items: center; justify-content: space-between;">
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Patients</div>
            <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-main); line-height: 1.1; margin: 0.1rem 0;" id="kpi-total-patients">-</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="kpi-new-patients">-</div>
          </div>
          <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
            <i class="fa-solid fa-hospital-user"></i>
          </div>
        </div>

        <!-- 4. Active Doctors KPI -->
        <div class="card u-morphism-card" style="margin-bottom: 0; padding: 0.45rem 0.75rem; border-left: 4px solid #8b5cf6; display: flex; align-items: center; justify-content: space-between;">
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Rosters</div>
            <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-main); line-height: 1.1; margin: 0.1rem 0;" id="kpi-active-doctors">-</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="kpi-dept-info">Medical Rosters Active</div>
          </div>
          <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(139, 92, 246, 0.12); color: #8b5cf6; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
            <i class="fa-solid fa-user-doctor"></i>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- 3. MIDDLE: APPOINTMENTS QUEUE & SCHEDULE -->
      <!-- ================================================================= -->
      <div id="dash-view-appts" class="card u-morphism-card" style="margin-bottom: 0; flex-shrink: 0;">
        <div class="card-header" style="padding: 0.5rem 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div class="card-title" style="font-size: 0.92rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.45rem;">
              <i class="fa-solid fa-clipboard-list" style="color: var(--primary);"></i> Booked OPD Appointments & Queue
            </div>
            <span class="badge badge-green" id="dash-appt-count-badge" style="font-size: 0.72rem; font-weight: 800; padding: 0.12rem 0.5rem;">0 Appointments</span>
          </div>

          <!-- Quick Filters: Search & Status -->
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            <div class="search-box" style="width: 230px;">
              <i class="fa-solid fa-magnifying-glass" style="font-size: 0.75rem;"></i>
              <input type="text" id="dash-appt-search" placeholder="Search patient, MRN, doctor..." oninput="dashboardComponent.handleSearch(this.value)" style="height: 28px; font-size: 0.75rem; padding-left: 2rem;">
            </div>

            <select id="dash-status-filter" class="form-control" style="width: auto; padding: 0.12rem 0.6rem; font-size: 0.75rem; font-weight: 700; height: 28px;" onchange="dashboardComponent.handleStatusFilter(this.value)">
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled (Unpaid)</option>
              <option value="waiting">Waiting in Queue</option>
              <option value="in_consultation">With Doctor</option>
              <option value="completed">Completed & Billed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div class="card-body" style="padding: 0;">
          <div class="table-responsive" style="max-height: 280px; overflow-y: auto;">
            <table class="table table-dense" style="margin-bottom: 0; width: 100%;">
              <thead style="position: sticky; top: 0; z-index: 5;">
                <tr style="background: var(--bg-card); border-bottom: 2px solid var(--border-color);">
                  <th style="width: 90px;">MRN #</th>
                  <th style="min-width: 175px;">Patient Details</th>
                  <th style="min-width: 165px;">Consultant Doctor</th>
                  <th style="min-width: 125px;">Recorded Vitals</th>
                  <th style="min-width: 110px;">Queue Status</th>
                  <th style="min-width: 105px;">Billing Status</th>
                  <th style="min-width: 155px; text-align: right;">Workflow Action</th>
                </tr>
              </thead>
              <tbody id="dash-appointments-tbody">
                <tr>
                  <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 6px;"></i> Loading appointments for ${formattedDate}...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- 4. BOTTOM: CLINICAL & PRACTICE ANALYSIS (SCROLL DOWN) -->
      <!-- ================================================================= -->
      <div style="margin-top: 0.4rem; flex-shrink: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; padding: 0 0.2rem;">
          <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem;">
            <i class="fa-solid fa-chart-pie" style="color: var(--secondary);"></i> Practice Performance & Clinical Analytics
          </div>
          <span class="badge badge-teal" style="font-size: 0.7rem; padding: 0.12rem 0.5rem;">Live Analytics</span>
        </div>

        <div id="dash-view-analytics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.95rem;">
          
          <!-- Chart 1: 7-Day OPD Patient Volume & Revenue Velocity -->
          <div class="card u-morphism-card" style="margin-bottom: 0; display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06); border: 1px solid var(--border-color); overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <div class="card-header" style="padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); display: flex; align-items: center; justify-content: center; color: #10b981; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);">
                  <i class="fa-solid fa-chart-area" style="font-size: 0.9rem;"></i>
                </div>
                <div>
                  <div class="card-title" style="font-size: 0.88rem; font-weight: 800; margin: 0; line-height: 1.2;">OPD Patient Velocity (7-Day Flow)</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">Daily patient registrations & consultation throughput</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span id="dash-weekly-badge" class="badge badge-green" style="font-size: 0.68rem; padding: 0.2rem 0.55rem; font-weight: 700;">
                  <i class="fa-solid fa-bolt" style="margin-right: 3px;"></i> Live Inflow
                </span>
              </div>
            </div>
            <div class="card-body" style="padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="height: 230px; position: relative; width: 100%;">
                <canvas id="dash-weekly-chart"></canvas>
              </div>
              <div id="dash-weekly-note" class="chart-live-data-note" style="margin-top: 0.6rem; padding: 0.35rem 0.65rem; border-radius: 8px;"></div>
            </div>
          </div>

          <!-- Chart 2: Hourly Queue Rush -->
          <div class="card u-morphism-card" style="margin-bottom: 0; display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06); border: 1px solid var(--border-color); overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <div class="card-header" style="padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(2, 132, 199, 0.12); display: flex; align-items: center; justify-content: center; color: #0284c7; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.2);">
                  <i class="fa-solid fa-wave-square" style="font-size: 0.9rem;"></i>
                </div>
                <div>
                  <div class="card-title" style="font-size: 0.88rem; font-weight: 800; margin: 0; line-height: 1.2;">Peak Queue Hours (Inflow Rush)</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">OPD token arrival timeline & congestion detection</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span id="dash-hourly-badge" class="badge badge-teal" style="font-size: 0.68rem; padding: 0.2rem 0.55rem; font-weight: 700;">
                  <i class="fa-solid fa-clock" style="margin-right: 3px;"></i> Slot Load
                </span>
              </div>
            </div>
            <div class="card-body" style="padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="height: 230px; position: relative; width: 100%;">
                <canvas id="dash-hourly-chart"></canvas>
              </div>
              <div id="dash-hourly-note" class="chart-live-data-note" style="margin-top: 0.6rem; padding: 0.35rem 0.65rem; border-radius: 8px;"></div>
            </div>
          </div>

          <!-- Chart 3: Revenue Analytics & Category Breakdown -->
          <div class="card u-morphism-card" style="margin-bottom: 0; display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06); border: 1px solid var(--border-color); overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <div class="card-header" style="padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(5, 150, 105, 0.12); display: flex; align-items: center; justify-content: center; color: #059669; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);">
                  <i class="fa-solid fa-chart-pie" style="font-size: 0.9rem;"></i>
                </div>
                <div>
                  <div class="card-title" style="font-size: 0.88rem; font-weight: 800; margin: 0; line-height: 1.2;">Revenue Analytics & Collections</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">OPD clinical collections & service fee breakdown</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span id="dash-revenue-badge" class="badge badge-wine" style="font-size: 0.68rem; padding: 0.2rem 0.55rem; font-weight: 700;">
                  <i class="fa-solid fa-coins" style="margin-right: 3px;"></i> Financial
                </span>
              </div>
            </div>
            <div class="card-body" style="padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="height: 230px; position: relative; width: 100%;">
                <canvas id="dash-revenue-chart"></canvas>
              </div>
              <div id="dash-category-breakdown" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 0.5rem; justify-content: center;"></div>
              <div id="dash-revenue-note" class="chart-live-data-note" style="margin-top: 0.6rem; padding: 0.35rem 0.65rem; border-radius: 8px;"></div>
            </div>
          </div>

          <!-- Chart 4: Specialty & Department Demand -->
          <div class="card u-morphism-card" style="margin-bottom: 0; display: flex; flex-direction: column; border-radius: 14px; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06); border: 1px solid var(--border-color); overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <div class="card-header" style="padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(139, 92, 246, 0.12); display: flex; align-items: center; justify-content: center; color: #8b5cf6; box-shadow: 0 2px 6px rgba(139, 92, 246, 0.2);">
                  <i class="fa-solid fa-stethoscope" style="font-size: 0.9rem;"></i>
                </div>
                <div>
                  <div class="card-title" style="font-size: 0.88rem; font-weight: 800; margin: 0; line-height: 1.2;">Specialty Demand & Consultations</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">Clinical workload by department & specialty</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span id="dash-specialty-badge" class="badge badge-caramel" style="font-size: 0.68rem; padding: 0.2rem 0.55rem; font-weight: 700;">
                  <i class="fa-solid fa-hospital-user" style="margin-right: 3px;"></i> Workload
                </span>
              </div>
            </div>
            <div class="card-body" style="padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="height: 230px; position: relative; width: 100%;">
                <canvas id="dash-specialty-chart"></canvas>
              </div>
              <div id="dash-specialty-note" class="chart-live-data-note" style="margin-top: 0.6rem; padding: 0.35rem 0.65rem; border-radius: 8px;"></div>
            </div>
          </div>

        </div>
      </div>
    `;

    this.load();
  },


  switchVolumeView(view) {
    this.volumeView = view;
    const btnWeekly = document.getElementById('dash-btn-view-weekly');
    const btnHourly = document.getElementById('dash-btn-view-hourly');
    const wrapWeekly = document.getElementById('dash-weekly-chart-wrapper');
    const wrapHourly = document.getElementById('dash-hourly-chart-wrapper');
    const title = document.getElementById('dash-volume-card-title');

    if (btnWeekly && btnHourly && wrapWeekly && wrapHourly) {
      if (view === 'weekly') {
        btnWeekly.className = 'btn btn-sm btn-primary';
        btnHourly.className = 'btn btn-sm btn-outline';
        wrapWeekly.style.display = 'block';
        wrapHourly.style.display = 'none';
        if (title) title.textContent = 'Weekly OPD Patient Volume (7-Day Flow)';
        if (this.charts.weekly) this.charts.weekly.resize();
      } else {
        btnWeekly.className = 'btn btn-sm btn-outline';
        btnHourly.className = 'btn btn-sm btn-primary';
        wrapWeekly.style.display = 'none';
        wrapHourly.style.display = 'block';
        if (title) title.textContent = 'Peak Queue Inflow & Hourly Rush';
        if (this.charts.hourly) this.charts.hourly.resize();
      }
    }
  },

  switchRevenueView(view) {
    this.revenueView = view;
    const btnSplit = document.getElementById('dash-btn-rev-split');
    const btnRev = document.getElementById('dash-btn-rev-only');
    const btnSpec = document.getElementById('dash-btn-spec-only');
    const grid = document.getElementById('dash-bottom-charts-grid');
    const subRev = document.getElementById('dash-sub-revenue');
    const subSpec = document.getElementById('dash-sub-specialty');

    if (btnSplit) btnSplit.className = `btn btn-sm ${view === 'split' ? 'btn-primary' : 'btn-outline'}`;
    if (btnRev) btnRev.className = `btn btn-sm ${view === 'revenue' ? 'btn-primary' : 'btn-outline'}`;
    if (btnSpec) btnSpec.className = `btn btn-sm ${view === 'specialty' ? 'btn-primary' : 'btn-outline'}`;

    if (grid && subRev && subSpec) {
      if (view === 'split') {
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        subRev.style.display = 'flex';
        subSpec.style.display = 'flex';
      } else if (view === 'revenue') {
        grid.style.display = 'block';
        subRev.style.display = 'flex';
        subSpec.style.display = 'none';
      } else if (view === 'specialty') {
        grid.style.display = 'block';
        subRev.style.display = 'none';
        subSpec.style.display = 'flex';
      }
      setTimeout(() => {
        if (this.charts.revenue) this.charts.revenue.resize();
        if (this.charts.specialty) this.charts.specialty.resize();
      }, 50);
    }
  },

  getLocalISODate(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  isDateEqual(dateStr, preset) {
    const today = this.getLocalISODate(new Date());
    if (preset === 'today') return dateStr === today;
    if (preset === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return dateStr === this.getLocalISODate(d);
    }
    if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return dateStr === this.getLocalISODate(d);
    }
    return false;
  },

  updatePresetButtonStyles() {
    const btnYest = document.getElementById('dash-btn-yesterday');
    const btnToday = document.getElementById('dash-btn-today');
    const btnTmrw = document.getElementById('dash-btn-tomorrow');

    const isYest = this.isDateEqual(this.selectedDate, 'yesterday');
    const isToday = this.isDateEqual(this.selectedDate, 'today');
    const isTmrw = this.isDateEqual(this.selectedDate, 'tomorrow');

    if (btnYest) {
      btnYest.className = `btn btn-sm ${isYest ? 'btn-primary' : 'btn-outline'}`;
      if (isYest) {
        btnYest.style.boxShadow = '0 3px 10px rgba(37, 99, 235, 0.35)';
      } else {
        btnYest.style.boxShadow = 'none';
      }
    }
    if (btnToday) {
      btnToday.className = `btn btn-sm ${isToday ? 'btn-primary' : 'btn-outline'}`;
      if (isToday) {
        btnToday.style.boxShadow = '0 3px 10px rgba(37, 99, 235, 0.35)';
      } else {
        btnToday.style.boxShadow = 'none';
      }
    }
    if (btnTmrw) {
      btnTmrw.className = `btn btn-sm ${isTmrw ? 'btn-primary' : 'btn-outline'}`;
      if (isTmrw) {
        btnTmrw.style.boxShadow = '0 3px 10px rgba(37, 99, 235, 0.35)';
      } else {
        btnTmrw.style.boxShadow = 'none';
      }
    }
  },

  setDatePreset(preset) {
    let d = new Date();
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const newDate = this.getLocalISODate(d);
    this.handleDateChange(newDate);
  },

  handleDateChange(newDate) {
    if (!newDate) return;
    this.selectedDate = newDate;
    if (typeof app !== 'undefined' && typeof app.setSelectedDate === 'function') {
      app.setSelectedDate(newDate);
    } else {
      localStorage.setItem('gclinic_selected_date', newDate);
      if (typeof app !== 'undefined') app.globalSelectedDate = newDate;
    }
    const picker = document.getElementById('dash-date-picker');
    if (picker) picker.value = newDate;

    this.updatePresetButtonStyles();

    const formattedDate = new Date(this.selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const displayEl = document.getElementById('dash-date-display');
    if (displayEl) displayEl.textContent = formattedDate;

    this.load();
  },

  handleSearch(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderAppointmentsTable();
  },

  handleStatusFilter(status) {
    this.statusFilter = status || 'all';
    this.renderAppointmentsTable();
  },

  async load() {
    const handleData = (res) => {
      if (!res || !res.success || !res.data) return;
      const data = res.data;
      const currency = app.clinic.currency || 'PKR';

      // 1. Fill KPI Cards
      const appts = data.appointments || {};
      const todayEl = document.getElementById('kpi-today-appts');
      if (todayEl) todayEl.textContent = appts.total_today || 0;

      const waitEl = document.getElementById('kpi-waiting-appts');
      if (waitEl) {
        waitEl.innerHTML = `
          <span style="color: var(--caramel); font-weight: 700;">${appts.waiting_count || 0} Waiting</span> • 
          <span style="color: var(--cyber-green); font-weight: 700;">${appts.completed_count || 0} Done</span>
        `;
      }

      const rev = data.revenue || {};
      const revEl = document.getElementById('kpi-today-revenue');
      if (revEl) revEl.textContent = `${currency} ${parseFloat(rev.total_collected || 0).toLocaleString()}`;

      const recEl = document.getElementById('kpi-receivable');
      if (recEl) recEl.textContent = `Billed: ${currency} ${parseFloat(rev.total_billed || 0).toLocaleString()}`;

      const pat = data.patients || {};
      const patEl = document.getElementById('kpi-total-patients');
      if (patEl) patEl.textContent = pat.total_patients || 0;

      const newPatEl = document.getElementById('kpi-new-patients');
      if (newPatEl) newPatEl.textContent = `+${pat.new_this_week || 0} new this week`;

      const doc = data.doctors || {};
      const docEl = document.getElementById('kpi-active-doctors');
      if (docEl) docEl.textContent = `${doc.active_doctors || 0} Doctors`;

      const deptEl = document.getElementById('kpi-dept-info');
      if (deptEl) deptEl.textContent = `${doc.active_doctors || 0} Active Rosters`;

      // 2. Store appointments data & render table
      this.appointmentsData = data.appointmentsList || data.liveQueue || [];
      this.renderAppointmentsTable();

      // 3. Render Charts
      this.cachedChartData = data;
      this.renderAllCharts(data);
    };

    // Use SWR: Instant render from memory cache + silent background refresh
    const res = await app.swrApi(`/dashboard/summary?date=${this.selectedDate}`, (fresh) => {
      handleData(fresh);
    }, 15000);

    if (res && res.success) {
      handleData(res);
    } else {
      const waitEl = document.getElementById('kpi-waiting-appts');
      if (waitEl) waitEl.innerHTML = `<span style="color: #ef4444; font-size: 0.72rem;"><i class="fa-solid fa-triangle-exclamation"></i> Server sync failed</span>`;

      const tbody = document.getElementById('dash-appointments-tbody');
      if (tbody && (!this.appointmentsData || this.appointmentsData.length === 0)) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem; color: #ef4444;">
              <i class="fa-solid fa-circle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">Unable to load dashboard data</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${res?.message || 'The database connection timed out or is temporarily unavailable.'}</div>
              <button onclick="dashboardComponent.load()" class="btn btn-primary btn-sm" style="margin-top: 0.75rem; font-size: 0.75rem;">
                <i class="fa-solid fa-arrows-rotate"></i> Retry Connection
              </button>
            </td>
          </tr>
        `;
      }
    }
  },

  renderAppointmentsTable() {
    const tbody = document.getElementById('dash-appointments-tbody');
    const badgeEl = document.getElementById('dash-appt-count-badge');
    if (!tbody) return;

    let list = this.appointmentsData || [];

    // Filter by search query
    if (this.searchQuery) {
      list = list.filter(a => 
        (a.patient_name && a.patient_name.toLowerCase().includes(this.searchQuery)) ||
        (a.mrn && a.mrn.toLowerCase().includes(this.searchQuery)) ||
        (a.patient_phone && a.patient_phone.includes(this.searchQuery)) ||
        (a.doctor_name && a.doctor_name.toLowerCase().includes(this.searchQuery)) ||
        (a.token_display && a.token_display.toLowerCase().includes(this.searchQuery))
      );
    }

    // Filter by status
    if (this.statusFilter && this.statusFilter !== 'all') {
      list = list.filter(a => a.status === this.statusFilter);
    }

    if (badgeEl) {
      badgeEl.textContent = `${list.length} Appointment${list.length === 1 ? '' : 's'}`;
    }
    const tabCount = document.getElementById('dash-tab-appt-count');
    if (tabCount) {
      tabCount.textContent = list.length;
    }

    if (list.length === 0) {
      const formattedDate = new Date(this.selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 1.5rem 1rem; color: var(--text-muted);">
            <i class="fa-solid fa-calendar-xmark" style="font-size: 1.8rem; display: block; margin-bottom: 0.4rem; color: var(--border-color);"></i>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-body); margin-bottom: 0.2rem;">
              No appointments booked for ${formattedDate}
            </div>
            <div style="font-size: 0.74rem; margin-bottom: 0.65rem;">
              Click below to book a new appointment with any specialist consultant for this date.
            </div>
            <button onclick="app.openBookAppointmentModal(null, null, dashboardComponent.selectedDate)" class="btn btn-primary btn-xs" style="box-shadow: var(--green-glow); font-size: 0.74rem; padding: 0.25rem 0.65rem;">
              <i class="fa-solid fa-calendar-plus"></i> Book Appointment for this Date
            </button>
          </td>
        </tr>
      `;
      return;
    }

    const currency = app.clinic.currency || 'PKR';

    const avatarColors = ['avatar-teal', 'avatar-blue', 'avatar-purple', 'avatar-indigo', 'avatar-rose', 'avatar-amber', 'avatar-emerald'];

    tbody.innerHTML = list.map((a, idx) => {
      const avatarColor = avatarColors[idx % avatarColors.length];
      const initials = (a.patient_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const hasVitals = Boolean(a.systolic_bp || a.diastolic_bp || a.temperature_f || a.pulse_rate || a.spo2 || a.blood_sugar_random || a.weight_kg);
      
      let badgeClass = 'badge-gray';
      let beaconDot = '';
      let statusLabel = (a.status || 'scheduled').replace('_', ' ');

      if (a.status === 'in_consultation') {
        badgeClass = 'badge-blue';
        beaconDot = '<span class="pulse-dot blue"></span> ';
        statusLabel = 'With Doctor';
      } else if (a.status === 'waiting') {
        badgeClass = 'badge-amber';
        beaconDot = '<span class="pulse-dot amber"></span> ';
        statusLabel = 'Checked In / Waiting';
      } else if (a.status === 'completed') {
        badgeClass = 'badge-green';
        beaconDot = '<span class="pulse-dot green"></span> ';
        statusLabel = 'Completed';
      } else if (a.status === 'scheduled') {
        badgeClass = 'badge-purple';
        statusLabel = 'Scheduled';
      } else if (a.status === 'cancelled') {
        badgeClass = 'badge-rose';
        statusLabel = 'Cancelled';
      }

      // Vitals summary badge
      let vitalsHtml = `<span style="font-size: 0.74rem; color: #94a3b8; font-style: italic;"><i class="fa-solid fa-heart-circle-exclamation" style="color: #cbd5e1;"></i> Pending</span>`;
      if (hasVitals) {
        let bpChipClass = 'vital-chip-bp';
        if (a.systolic_bp >= 140 || a.diastolic_bp >= 90) {
          bpChipClass = 'vital-chip-bp-alert';
        } else if (a.systolic_bp >= 120 || a.diastolic_bp >= 80) {
          bpChipClass = 'vital-chip-bp-warn';
        }

        vitalsHtml = `
          <div class="vitals-summary-box">
            ${a.systolic_bp && a.diastolic_bp ? `
              <span class="vital-chip ${bpChipClass}" title="Blood Pressure">
                <i class="fa-solid fa-heart-pulse"></i> ${a.systolic_bp}/${a.diastolic_bp}
              </span>
            ` : ''}
            ${a.pulse_rate ? `
              <span class="vital-chip vital-chip-pulse" title="Pulse Rate">
                <i class="fa-solid fa-wave-square"></i> ${a.pulse_rate}
              </span>
            ` : ''}
            ${a.temperature_f ? `
              <span class="vital-chip vital-chip-temp" title="Temperature">
                <i class="fa-solid fa-temperature-half"></i> ${a.temperature_f}°F
              </span>
            ` : ''}
            ${a.spo2 ? `
              <span class="vital-chip vital-chip-spo2" title="Blood Oxygen SpO2">
                <i class="fa-solid fa-lungs"></i> ${a.spo2}%
              </span>
            ` : ''}
            ${a.weight_kg && !a.systolic_bp && !a.pulse_rate ? `
              <span class="vital-chip vital-chip-weight" title="Weight">
                <i class="fa-solid fa-weight-scale"></i> ${a.weight_kg}kg
              </span>
            ` : ''}
          </div>
        `;
      }

      // Billing status badge
      let billingBadge = `<span class="badge badge-gray"><i class="fa-regular fa-clock"></i> Unbilled</span>`;
      if (a.invoice_id) {
        if (a.invoice_payment_status === 'paid') {
          billingBadge = `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Paid (${currency} ${parseFloat(a.invoice_total || a.consultation_fee || 0).toLocaleString()})</span>`;
        } else {
          billingBadge = `<span class="badge badge-amber"><i class="fa-solid fa-triangle-exclamation"></i> Unpaid Bill</span>`;
        }
      } else {
        billingBadge = `<span class="badge badge-gray">Unbilled</span>`;
      }

      const vitalsObj = JSON.stringify({
        systolic_bp: a.systolic_bp,
        diastolic_bp: a.diastolic_bp,
        pulse_rate: a.pulse_rate,
        temperature_f: a.temperature_f,
        spo2: a.spo2,
        weight_kg: a.weight_kg,
        height_cm: a.height_cm,
        bmi: a.bmi,
        blood_sugar_random: a.blood_sugar_random
      }).replace(/"/g, '&quot;');

      // Strict In-Appointment Lifecycle Actions:
      // Stage 1: Booked/Scheduled -> ONLY "Check In"
      // Stage 2: Checked In (Pending Vitals) -> ONLY "Vitals" & "Check Out"
      // Stage 3: Vitals Recorded -> ONLY "To Doctor" & "Edit Vitals"
      // Stage 4: With Doctor / In Consultation -> ONLY "Make Bill"
      // Stage 5: Paid / Completed -> NO buttons (process is finished)
      let nextStepActionHtml = '';

      const isPaidOrCompleted = a.status === 'completed' || a.invoice_payment_status === 'paid';

      if (isPaidOrCompleted) {
        // Stage 5: Once the bill is paid, the appointment's process is done. Don't show any button there.
        nextStepActionHtml = '';
      } else if (a.status === 'scheduled') {
        // Stage 1: When appointment is booked, first see ONLY the button to check in the patient
        nextStepActionHtml = `
          <button onclick="appointmentsComponent.directCheckIn(${a.id})" class="btn btn-primary btn-xs" title="Check In Patient" style="font-weight: 700; padding: 0.18rem 0.5rem; font-size: 0.72rem;">
            <i class="fa-solid fa-user-check"></i> Check In
          </button>
        `;
      } else if (a.status === 'waiting') {
        if (!hasVitals) {
          // Stage 2: After check in (pending vitals) -> Record Vitals
          nextStepActionHtml = `
            <button onclick="app.openCheckInVitalsModal(${a.id}, ${a.patient_id}, '${(a.doctor_name || '').replace(/'/g, "\\'")}', '${(a.patient_name || '').replace(/'/g, "\\'")}', '', ${vitalsObj}, ${a.doctor_id}, ${a.consultation_fee})" class="btn btn-primary btn-xs" title="Record Patient Vitals" style="font-weight: 700; padding: 0.18rem 0.5rem; font-size: 0.72rem;">
              <i class="fa-solid fa-heart-pulse"></i> Vitals
            </button>
          `;
        } else {
          // Stage 3: Vitals recorded -> ONLY 2 buttons: Send to Doctor & Re-edit Vitals
          nextStepActionHtml = `
            <button onclick="app.sendToDoctor(${a.id})" class="btn btn-primary btn-xs" style="background: linear-gradient(135deg, #0284c7, #0369a1); border-color: #0284c7; font-weight: 700; padding: 0.18rem 0.5rem; font-size: 0.72rem;" title="Send Patient to Doctor">
              <i class="fa-solid fa-user-doctor"></i> To Doctor
            </button>
            <button onclick="app.openCheckInVitalsModal(${a.id}, ${a.patient_id}, '${(a.doctor_name || '').replace(/'/g, "\\'")}', '${(a.patient_name || '').replace(/'/g, "\\'")}', '', ${vitalsObj}, ${a.doctor_id}, ${a.consultation_fee})" class="btn btn-outline btn-xs" title="Edit Vitals" style="padding: 0.18rem 0.38rem; font-size: 0.72rem;">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          `;
        }
      } else if (a.status === 'in_consultation') {
        // Stage 4: Send to doctor clicked -> ONLY button to record the bill / pay
        nextStepActionHtml = `
          <button onclick="app.openMakeBillModal(${a.id}, ${a.patient_id}, ${a.doctor_id}, ${a.consultation_fee}, '${(a.doctor_name || '').replace(/'/g, "\\'")}', '${(a.patient_name || '').replace(/'/g, "\\'")}', '')" class="btn btn-success btn-xs" title="Proceed for Bill & Payment" style="font-weight: 700; padding: 0.18rem 0.5rem; font-size: 0.72rem;">
            <i class="fa-solid fa-file-invoice-dollar"></i> Make Bill
          </button>
        `;
      } else if (a.status === 'checked_out') {
        nextStepActionHtml = `
          <span class="badge badge-amber" style="font-size: 0.68rem;"><i class="fa-solid fa-person-walking-arrow-right"></i> Checked Out</span>
        `;
      } else {
        nextStepActionHtml = `<span class="badge badge-gray" style="font-size: 0.65rem;">${a.status}</span>`;
      }

      const rawMrn = (a.mrn || '').toString().replace(/MRN-?/gi, '');
      const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${a.patient_id}`;

      return `
        <tr>
          <td class="cell-nowrap">
            <span class="mrn-tag" style="font-size: 0.74rem; font-weight: 800; padding: 0.14rem 0.4rem; display: inline-block;">${formattedMrn}</span>
          </td>
          <td class="patient-details-cell">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <div class="avatar-bubble ${avatarColor}" style="cursor: pointer; flex-shrink: 0; width: 26px; height: 26px; font-size: 0.68rem;" onclick="app.openAppointmentDetailsModal(${a.id})" title="View Full Details">${initials}</div>
              <div style="min-width: 0; overflow: hidden;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.8rem; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="app.openAppointmentDetailsModal(${a.id})" title="View Full Details">${a.patient_name}</div>
                <div style="font-size: 0.66rem; color: var(--text-muted); white-space: nowrap;">${a.patient_phone || (a.gender ? `${a.gender}${a.age ? ', ' + a.age + 'y' : ''}` : 'Patient')}</div>
              </div>
            </div>
          </td>
          <td class="doctor-details-cell">
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.doctor_name}</div>
            <div style="font-size: 0.66rem; color: var(--text-muted); white-space: nowrap;">${a.doctor_specialty || 'General'}</div>
          </td>
          <td class="cell-nowrap">${vitalsHtml}</td>
          <td class="cell-nowrap"><span class="badge ${badgeClass}">${beaconDot}${statusLabel}</span></td>
          <td class="cell-nowrap">${billingBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 0.25rem;">
              ${nextStepActionHtml}
              <button onclick="app.openAppointmentDetailsModal(${a.id})" class="btn btn-outline btn-xs" title="View Full Booking Details" style="padding: 0.18rem 0.38rem; font-size: 0.72rem;">
                <i class="fa-solid fa-circle-info" style="color: var(--primary);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderAllCharts(data) {
    if (typeof Chart === 'undefined') {
      return;
    }
    try {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)';
      const textColor = isDark ? '#94a3b8' : '#64748b';
      const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.95)';
      const revenueBreakdown = data.revenueBreakdown || [];

      // Global aesthetic Chart defaults with smooth progressive animations
      Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      Chart.defaults.font.size = 11;
      Chart.defaults.color = textColor;

      // =====================================================================
      // 1. Weekly OPD Volume Curve (Animated Multi-Stop Cyan-Emerald Gradient Flow)
      // =====================================================================
      const weeklyCtx = document.getElementById('dash-weekly-chart');
      if (weeklyCtx) {
        if (this.charts.weekly) this.charts.weekly.destroy();
        const ctx = weeklyCtx.getContext('2d');

        // Multi-stop neon emerald & cyan luminous gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, 230);
        bgGradient.addColorStop(0, 'rgba(16, 185, 129, 0.42)');
        bgGradient.addColorStop(0.45, 'rgba(6, 182, 212, 0.18)');
        bgGradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

        // Stroke line gradient
        const strokeGradient = ctx.createLinearGradient(0, 0, 400, 0);
        strokeGradient.addColorStop(0, '#06b6d4');
        strokeGradient.addColorStop(1, '#10b981');

        // Build array for last 7 days ending at selectedDate
        const days = [];
        const counts = [];
        const trendMap = {};

        (data.revenueTrend || []).forEach(t => {
          if (t.date_key) trendMap[t.date_key] = parseInt(t.patient_count || 0);
          if (t.date_label) trendMap[t.date_label] = parseInt(t.patient_count || 0);
        });

        const anchorDate = new Date((this.selectedDate || new Date().toISOString().slice(0, 10)) + 'T12:00:00');
        for (let i = 6; i >= 0; i--) {
          const d = new Date(anchorDate);
          d.setDate(d.getDate() - i);
          const dateKey = d.toISOString().slice(0, 10);
          const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          days.push(dateLabel);
          
          let count = 0;
          if (trendMap[dateKey] !== undefined) count = trendMap[dateKey];
          else if (trendMap[dateLabel] !== undefined) count = trendMap[dateLabel];
          counts.push(count);
        }

        const maxCount = Math.max(...counts, 0);
        const avgDaily = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : 0;

        this.charts.weekly = new Chart(weeklyCtx, {
          type: 'line',
          data: {
            labels: days,
            datasets: [{
              label: 'OPD Patients',
              data: counts,
              borderColor: strokeGradient,
              borderWidth: 3.5,
              backgroundColor: bgGradient,
              tension: 0.38,
              fill: true,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#10b981',
              pointBorderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointHoverBackgroundColor: '#10b981',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: {
              duration: 1200,
              easing: 'easeOutQuart'
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                borderColor: '#10b981',
                borderWidth: 1.5,
                padding: 12,
                cornerRadius: 10,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                  label: (ctx) => `  ${ctx.parsed.y} Registered OPD Patients`,
                  afterLabel: (ctx) => `  Avg Flow: ${avgDaily} / day`
                }
              }
            },
            scales: {
              x: { 
                grid: { display: false }, 
                ticks: { color: textColor, font: { size: 10, weight: '600' } } 
              },
              y: { 
                beginAtZero: true, 
                suggestedMax: maxCount > 0 ? maxCount + 2 : 5,
                grid: { color: gridColor }, 
                ticks: { color: textColor, font: { size: 10 }, precision: 0 } 
              }
            }
          }
        });

        const compToday = data.appointments ? (data.appointments.completed_count || 0) : 0;
        const waitToday = data.appointments ? (data.appointments.waiting_count || 0) : 0;
        const totalVelocity = counts.reduce((a, b) => a + b, 0);
        const weeklyNoteEl = document.getElementById('dash-weekly-note');
        if (weeklyNoteEl) {
          weeklyNoteEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem; font-weight: 600; flex-wrap: wrap; gap: 0.4rem;">
              <span><i class="fa-solid fa-arrow-trend-up" style="color: #10b981; margin-right: 5px;"></i> 7-Day Velocity: <strong style="color: var(--text-main); font-size: 0.82rem;">${totalVelocity} Patients</strong> (Avg: <strong>${avgDaily}</strong>/day)</span>
              <span style="color: var(--text-muted);"><strong style="color: #0284c7;">${waitToday}</strong> in Waiting • <strong style="color: #10b981;">${compToday}</strong> Completed</span>
            </div>
          `;
        }
      }

      // =====================================================================
      // 2. Hourly Peak Queue Rush (Animated Curved Blue-Teal Bar Chart)
      // =====================================================================
      const hourlyCtx = document.getElementById('dash-hourly-chart');
      if (hourlyCtx) {
        if (this.charts.hourly) this.charts.hourly.destroy();
        const ctx = hourlyCtx.getContext('2d');

        const barGradient = ctx.createLinearGradient(0, 0, 0, 230);
        barGradient.addColorStop(0, '#38bdf8');
        barGradient.addColorStop(0.5, '#0284c7');
        barGradient.addColorStop(1, '#0369a1');

        const hourMap = {};

        // Parse hourly breakdown from backend
        (data.hourlyBreakdown || []).forEach(h => {
          if (h.time_slot) hourMap[h.time_slot] = parseInt(h.patient_count || 0);
        });

        // Supplement from live queue if needed
        if (data.liveQueue && data.liveQueue.length > 0 && Object.keys(hourMap).length === 0) {
          data.liveQueue.forEach(a => {
            const time = a.appointment_time || '10:00 AM';
            hourMap[time] = (hourMap[time] || 0) + 1;
          });
        }

        // Standard clinic OPD operational slots
        const standardSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '05:30 PM', '08:00 PM'];
        let sortedHours = [];
        if (Object.keys(hourMap).length > 0) {
          // Sort hours chronologically
          sortedHours = Object.keys(hourMap).sort((a, b) => {
            const da = new Date('1970-01-01 ' + a);
            const db = new Date('1970-01-01 ' + b);
            return da - db;
          });
        } else {
          sortedHours = standardSlots;
        }

        const hourlyPatients = sortedHours.map(h => hourMap[h] || 0);
        const maxHourly = Math.max(...hourlyPatients, 0);

        // Highlight the busiest bar with an accent amber gradient
        const barColors = hourlyPatients.map(val => {
          if (val === maxHourly && maxHourly > 0) return '#0ea5e9';
          return barGradient;
        });

        this.charts.hourly = new Chart(hourlyCtx, {
          type: 'bar',
          data: {
            labels: sortedHours,
            datasets: [{
              label: 'Slot Inflow',
              data: hourlyPatients,
              backgroundColor: barColors,
              hoverBackgroundColor: '#06b6d4',
              borderRadius: 10,
              borderSkipped: false,
              barThickness: sortedHours.length > 8 ? 18 : 28,
              maxBarThickness: 34
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 1100,
              easing: 'easeOutBounce'
            },
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                borderColor: '#0284c7',
                borderWidth: 1.5,
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                  label: (ctx) => `  ${ctx.parsed.y} Patients Scheduled`,
                  afterLabel: (ctx) => ctx.parsed.y === maxHourly && maxHourly > 0 ? '  🔥 Busiest OPD Slot of the Day' : ''
                }
              }
            },
            scales: {
              x: { 
                grid: { display: false }, 
                ticks: { color: textColor, font: { size: 9.5, weight: '600' } } 
              },
              y: { 
                beginAtZero: true, 
                suggestedMax: maxHourly > 0 ? maxHourly + 1 : 5,
                grid: { color: gridColor }, 
                ticks: { color: textColor, font: { size: 10 }, precision: 0 } 
              }
            }
          }
        });

        const hourlyNoteEl = document.getElementById('dash-hourly-note');
        if (hourlyNoteEl) {
          const peakSlotIndex = hourlyPatients.indexOf(maxHourly);
          const peakSlotName = maxHourly > 0 ? (sortedHours[peakSlotIndex] || '11:00 AM') : 'None';
          const totalScheduledToday = hourlyPatients.reduce((a, b) => a + b, 0);
          hourlyNoteEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem; font-weight: 600; flex-wrap: wrap; gap: 0.4rem;">
              <span><i class="fa-solid fa-clock-rotate-left" style="color: #0284c7; margin-right: 5px;"></i> Peak Slot: <strong style="color: var(--text-main); font-size: 0.82rem;">${peakSlotName}</strong> (${maxHourly} patients)</span>
              <span class="badge badge-teal" style="font-size: 0.65rem;">Total Today: <strong>${totalScheduledToday}</strong></span>
            </div>
          `;
        }
      }

      // =====================================================================
      // 3. Revenue Analytics & Category Breakdown (Smooth Donut with Centered Totals)
      // =====================================================================
      const revCtx = document.getElementById('dash-revenue-chart');
      if (revCtx) {
        if (this.charts.revenue) this.charts.revenue.destroy();

        const revCollected = parseFloat(data.revenue ? data.revenue.total_collected || 0 : 0);
        const revBilled = parseFloat(data.revenue ? data.revenue.total_billed || 0 : 0);

        let labels = [];
        let dataValues = [];

        // Filter out any non-clinical items if any remain
        const clinicalBreakdown = (revenueBreakdown || []).filter(b => {
          const raw = (b.item_type || '').toUpperCase();
          return raw !== 'PHARMACY' && raw !== 'LABORATORY' && raw !== 'LAB';
        });

        if (clinicalBreakdown.length > 0) {
          labels = clinicalBreakdown.map(b => {
            const raw = (b.item_type || 'Services').toUpperCase();
            if (raw === 'CONSULTATION') return 'OPD Consultations';
            if (raw === 'PROCEDURE') return 'Procedures';
            if (raw === 'NURSING') return 'Nursing Care';
            return b.item_type.charAt(0).toUpperCase() + b.item_type.slice(1);
          });
          dataValues = clinicalBreakdown.map(b => parseFloat(b.category_total || 0));
        } else {
          // Zero state: clean empty state when no bills exist
          labels = ['OPD Consultations'];
          dataValues = [0];
        }

        const colors = [
          '#059669', // Emerald (Consultation)
          '#8b5cf6', // Violet (Procedures)
          '#06b6d4', // Cyan (Nursing / Clinical)
          '#10b981', // Emerald Green
          '#f59e0b', // Amber
          '#ec4899'  // Pink
        ];

        // Custom center text plugin for Donut
        const totalSum = dataValues.reduce((a, b) => a + b, 0);
        const centerPlugin = {
          id: 'customCenterText',
          beforeDraw: (chart) => {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const centerX = chart.getDatasetMeta(0).data[0] ? chart.getDatasetMeta(0).data[0].x : width / 2;
            const centerY = chart.getDatasetMeta(0).data[0] ? chart.getDatasetMeta(0).data[0].y : height / 2;

            ctx.font = '700 0.72rem "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = textColor;
            ctx.fillText('COLLECTED', centerX, centerY - 11);

            ctx.font = '800 1.05rem "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
            const displayTotal = revCollected > 0 ? revCollected : totalSum;
            ctx.fillText(`${app.clinic.currency || 'Rs.'} ${displayTotal >= 1000 ? Math.round(displayTotal).toLocaleString() : displayTotal}`, centerX, centerY + 11);
            ctx.restore();
          }
        };

        this.charts.revenue = new Chart(revCtx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: totalSum === 0 ? [1] : dataValues,
              backgroundColor: totalSum === 0 ? ['#e2e8f0'] : colors.slice(0, labels.length),
              borderWidth: 3,
              borderColor: isDark ? '#111827' : '#ffffff',
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              animateScale: true,
              animateRotate: true,
              duration: 1200,
              easing: 'easeOutQuart'
            },
            plugins: {
              legend: {
                position: 'right',
                labels: { 
                  boxWidth: 12, 
                  boxHeight: 12,
                  borderRadius: 4,
                  color: textColor, 
                  font: { size: 10.5, weight: '700' },
                  padding: 12
                }
              },
              tooltip: {
                backgroundColor: tooltipBg,
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                borderColor: '#059669',
                borderWidth: 1.5,
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                  label: (ctx) => {
                    if (totalSum === 0) return '  No revenue recorded yet';
                    const val = dataValues[ctx.dataIndex] || 0;
                    const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : 0;
                    return `  ${app.clinic.currency || 'Rs.'} ${val.toLocaleString()} (${pct}%)`;
                  }
                }
              }
            },
            cutout: '70%'
          },
          plugins: [centerPlugin]
        });

        const listEl = document.getElementById('dash-category-breakdown');
        if (listEl) {
          if (totalSum === 0) {
            listEl.innerHTML = `
              <span class="badge" style="background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.25); color: var(--text-muted); font-size: 0.72rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 6px;">
                <i class="fa-solid fa-receipt" style="margin-right: 4px; opacity: 0.7;"></i> No OPD revenue recorded for selected date
              </span>
            `;
          } else {
            listEl.innerHTML = labels.map((lbl, idx) => {
              const val = dataValues[idx] || 0;
              const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(0) : 0;
              return `
                <span class="badge" style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.16); color: var(--text-main); font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 6px;">
                  <span style="color: ${colors[idx % colors.length]}; font-size: 0.85rem; line-height: 1;">●</span> ${lbl}: ${app.clinic.currency || 'Rs.'} ${val.toLocaleString()} <span style="color: var(--text-muted); font-size: 0.65rem;">(${pct}%)</span>
                </span>
              `;
            }).join(' ');
          }
        }

        const revNoteEl = document.getElementById('dash-revenue-note');
        if (revNoteEl) {
          const displayCollected = revCollected > 0 ? revCollected : totalSum;
          revNoteEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem; font-weight: 600; flex-wrap: wrap; gap: 0.4rem;">
              <span><i class="fa-solid fa-circle-check" style="color: #059669; margin-right: 5px;"></i> Total Inflow: <strong style="color: var(--text-main); font-size: 0.82rem;">${app.clinic.currency || 'Rs.'} ${displayCollected.toLocaleString()}</strong></span>
              <span class="badge badge-green" style="font-size: 0.65rem;">Real-time Settlement</span>
            </div>
          `;
        }
      }

      // =====================================================================
      // 4. Specialty Demand & Consultations (Vibrant Horizontal Bar Chart)
      // =====================================================================
      const specCtx = document.getElementById('dash-specialty-chart');
      if (specCtx) {
        if (this.charts.specialty) this.charts.specialty.destroy();
        const ctx = specCtx.getContext('2d');

        const specMap = {};
        if (data.liveQueue && data.liveQueue.length > 0) {
          data.liveQueue.forEach(a => {
            let spec = a.doctor_specialty || 'General Physician';
            if (spec === 'Specality Title') spec = 'Dermatology';
            specMap[spec] = (specMap[spec] || 0) + 1;
          });
        } else if (data.specialtyBreakdown && data.specialtyBreakdown.length > 0) {
          data.specialtyBreakdown.forEach(s => {
            if (s.specialty) {
              let spec = s.specialty;
              if (spec === 'Specality Title') spec = 'Dermatology';
              specMap[spec] = parseInt(s.appt_count || 0);
            }
          });
        }

        // Clean up & sort specialties by workload descending
        const sortedEntries = Object.entries(specMap).sort((a, b) => b[1] - a[1]);

        let specLabels = [];
        let specData = [];

        if (sortedEntries.length > 0) {
          specLabels = sortedEntries.map(e => e[0]);
          specData = sortedEntries.map(e => e[1]);
        } else {
          specLabels = ['No Active Consultations'];
          specData = [0];
        }

        // Modern vibrant medical palette with rounded bars
        const barColors = [
          '#6366f1', // Indigo
          '#10b981', // Emerald
          '#06b6d4', // Cyan
          '#f59e0b', // Amber
          '#ec4899', // Pink
          '#8b5cf6', // Purple
          '#3b82f6'  // Blue
        ];

        const maxSpec = Math.max(...specData, 0);
        const totalConsults = specData.reduce((a, b) => a + b, 0);

        this.charts.specialty = new Chart(specCtx, {
          type: 'bar',
          data: {
            labels: specLabels,
            datasets: [{
              label: 'Consultations',
              data: specData,
              backgroundColor: barColors.slice(0, specLabels.length),
              borderRadius: 8,
              borderSkipped: false,
              barThickness: specLabels.length > 5 ? 18 : 24,
              maxBarThickness: 28
            }]
          },
          options: {
            indexAxis: 'y', // Sleek Horizontal Bar Chart for maximum readability
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 1100,
              easing: 'easeOutQuart'
            },
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                borderColor: '#6366f1',
                borderWidth: 1.5,
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                  label: (ctx) => `  ${ctx.parsed.x} Active Patient Consultations`,
                  afterLabel: (ctx) => {
                    const pct = totalConsults > 0 ? ((ctx.parsed.x / totalConsults) * 100).toFixed(0) : 0;
                    return `  Share of Total OPD Load: ${pct}%`;
                  }
                }
              }
            },
            scales: {
              x: { 
                beginAtZero: true, 
                suggestedMax: maxSpec > 0 ? maxSpec + 1 : 5,
                grid: { color: gridColor }, 
                ticks: { color: textColor, font: { size: 10 }, precision: 0 } 
              },
              y: { 
                grid: { display: false }, 
                ticks: { 
                  color: textColor, 
                  font: { size: 10.5, weight: '700' },
                  callback: function(val, index) {
                    const label = this.getLabelForValue(val);
                    return label.length > 22 ? label.slice(0, 20) + '...' : label;
                  }
                } 
              }
            }
          }
        });

        const specNoteEl = document.getElementById('dash-specialty-note');
        if (specNoteEl) {
          const topSpecIndex = specData.indexOf(maxSpec);
          const topSpecName = specLabels[topSpecIndex] || 'Child Specialist';
          const topPct = totalConsults > 0 ? ((maxSpec / totalConsults) * 100).toFixed(0) : 0;
          specNoteEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem; font-weight: 600; flex-wrap: wrap; gap: 0.4rem;">
              <span><i class="fa-solid fa-stethoscope" style="color: #6366f1; margin-right: 5px;"></i> Busiest Department: <strong style="color: var(--text-main); font-size: 0.82rem;">${topSpecName}</strong> (${maxSpec} patients, ${topPct}%)</span>
              <span class="badge badge-caramel" style="font-size: 0.65rem;">Highest Load</span>
            </div>
          `;
        }
      }
    } catch (e) {
      console.warn('Dashboard charts rendering error:', e);
    }
  }
};

