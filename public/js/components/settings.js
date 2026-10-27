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
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button onclick="settingsComponent.downloadUserGuide()" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.75rem; font-size: 0.76rem; background: linear-gradient(135deg, #059669 0%, #0d9488 100%);">
              <i class="fa-solid fa-file-pdf"></i> Download / Print Guide (PDF)
            </button>
          </div>
        `;
      }
      this.renderUserGuide(contentEl);
    }
  },

  // USER GUIDE & OPERATIONAL MANUAL
  renderUserGuide(container) {
    container.innerHTML = `
      <div id="clinic-user-guide-doc" style="display: flex; flex-direction: column; gap: 1rem;">

        <!-- Quick Start Workflow Hero Banner -->
        <div style="background: linear-gradient(135deg, #062319 0%, #0d3829 60%, #0f4633 100%); color: #ffffff; border-radius: 14px; padding: 1.35rem 1.6rem; position: relative; overflow: hidden; box-shadow: 0 10px 25px rgba(6, 35, 25, 0.25);">
          <div style="position: absolute; right: -20px; top: -20px; width: 140px; height: 140px; background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.22); border: 1.5px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #34d399; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                <i class="fa-solid fa-book-medical"></i>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <h2 style="font-size: 1.2rem; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: -0.01em;">Dream Garden PolyClinic — Complete User Guide</h2>
                  <span style="font-size: 0.65rem; background: #059669; color: #ffffff; padding: 2px 7px; border-radius: 9999px; font-weight: 700;">Standard SOP v1.0</span>
                </div>
                <p style="font-size: 0.76rem; margin: 0.2rem 0 0 0; color: #a7f3d0;">Illustrated step-by-step instructions for front desk receptionists, clinical doctors, pharmacists, and administrators.</p>
              </div>
            </div>

            <button onclick="settingsComponent.downloadUserGuide()" class="btn btn-sm" style="background: rgba(255, 255, 255, 0.15); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3); font-size: 0.74rem; padding: 0.35rem 0.75rem; border-radius: 8px;">
              <i class="fa-solid fa-download"></i> Save as PDF / Print
            </button>
          </div>

          <!-- Step Progress Flow Visual -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 0.65rem; margin-top: 1.2rem;">
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 9px; padding: 0.65rem 0.75rem; border-left: 3px solid #34d399;">
              <div style="font-size: 0.65rem; font-weight: 800; color: #34d399; margin-bottom: 0.15rem;"><i class="fa-solid fa-user-doctor"></i> STEP 1</div>
              <div style="font-size: 0.8rem; font-weight: 700;">Doctor Roster</div>
              <div style="font-size: 0.68rem; color: rgba(255, 255, 255, 0.75);">Verify on-duty timings</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 9px; padding: 0.65rem 0.75rem; border-left: 3px solid #38bdf8;">
              <div style="font-size: 0.65rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.15rem;"><i class="fa-solid fa-ticket"></i> STEP 2</div>
              <div style="font-size: 0.8rem; font-weight: 700;">Issue OPD Token</div>
              <div style="font-size: 0.68rem; color: rgba(255, 255, 255, 0.75);">Print thermal slip</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 9px; padding: 0.65rem 0.75rem; border-left: 3px solid #f43f5e;">
              <div style="font-size: 0.65rem; font-weight: 800; color: #f43f5e; margin-bottom: 0.15rem;"><i class="fa-solid fa-stethoscope"></i> STEP 3</div>
              <div style="font-size: 0.8rem; font-weight: 700;">Vitals & Rx</div>
              <div style="font-size: 0.68rem; color: rgba(255, 255, 255, 0.75);">Digital consultation</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 9px; padding: 0.65rem 0.75rem; border-left: 3px solid #fbbf24;">
              <div style="font-size: 0.65rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.15rem;"><i class="fa-solid fa-receipt"></i> STEP 4</div>
              <div style="font-size: 0.8rem; font-weight: 700;">Billing & POS</div>
              <div style="font-size: 0.68rem; color: rgba(255, 255, 255, 0.75);">Collect fee & receipt</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 9px; padding: 0.65rem 0.75rem; border-left: 3px solid #a855f7;">
              <div style="font-size: 0.65rem; font-weight: 800; color: #a855f7; margin-bottom: 0.15rem;"><i class="fa-solid fa-chart-pie"></i> STEP 5</div>
              <div style="font-size: 0.8rem; font-weight: 700;">History & Reports</div>
              <div style="font-size: 0.68rem; color: rgba(255, 255, 255, 0.75);">Lifetime records</div>
            </div>
          </div>
        </div>

        <!-- Detailed Illustrated Modules Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1rem;">

          <!-- 1. Dashboard Module -->
          <div class="card" style="margin-bottom: 0; overflow: hidden; border: 1px solid #e2e8f0;">
            <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
              <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-gauge-high" style="color: #059669;"></i> 1. Dashboard Overview
              </div>
              <span class="badge" style="background: rgba(5, 150, 105, 0.12); color: #059669; font-size: 0.68rem; font-weight: 700;">Alt + 1</span>
            </div>
            
            <!-- Visual Graphic Illustration -->
            <div style="background: #0f172a; padding: 0.85rem; color: #ffffff;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div style="background: rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 0.5rem; border-left: 3px solid #10b981;">
                  <div style="font-size: 0.62rem; color: #94a3b8;">TODAY ARRIVALS</div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: #34d399;">24 <span style="font-size: 0.65rem; color: #94a3b8; font-weight: 400;">Patients</span></div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 0.5rem; border-left: 3px solid #38bdf8;">
                  <div style="font-size: 0.62rem; color: #94a3b8;">TODAY'S REVENUE</div>
                  <div style="font-size: 1.1rem; font-weight: 800; color: #38bdf8;">Rs. 38,500</div>
                </div>
              </div>
              <div style="background: rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.4rem 0.6rem; font-size: 0.68rem; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fa-solid fa-circle-dot" style="color: #10b981; font-size: 0.55rem;"></i> Active Duty: 4 Consultants</span>
                <span style="color: #94a3b8;">Auto-syncs live</span>
              </div>
            </div>

            <div class="card-body" style="padding: 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Live OPD Counters:</strong> Tracks total check-ins, waiting patients, completed consultations, and daily revenue.</li>
                <li><strong>Duty Roster Bar:</strong> Identifies which doctors are in the clinic right now and their designated consultation rooms.</li>
                <li><strong>Date Selector:</strong> Pick any past or future calendar date to inspect historical OPD performance and receipts.</li>
              </ul>
            </div>
          </div>

          <!-- 2. Doctors & Rosters Module -->
          <div class="card" style="margin-bottom: 0; overflow: hidden; border: 1px solid #e2e8f0;">
            <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
              <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-user-doctor" style="color: #2563eb;"></i> 2. Doctors & Rosters
              </div>
              <span class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563eb; font-size: 0.68rem; font-weight: 700;">Alt + 2</span>
            </div>

            <!-- Visual Graphic Illustration -->
            <div style="background: #1e293b; padding: 0.85rem; color: #ffffff;">
              <div style="background: rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 0.6rem 0.75rem; border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                  <span style="font-weight: 700; font-size: 0.82rem; color: #60a5fa;"><i class="fa-solid fa-stethoscope"></i> Dr. Tariq Mahmood</span>
                  <span style="font-size: 0.62rem; background: #16a34a; padding: 1px 6px; border-radius: 9999px;">ON DUTY</span>
                </div>
                <div style="font-size: 0.7rem; color: #cbd5e1; margin-bottom: 0.2rem;">Specialization: <strong>Consultant Physician & Cardiologist</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 0.66rem; color: #94a3b8;">
                  <span>Fee: Rs. 2,000</span>
                  <span>Room # 04</span>
                  <span>Days: Mon - Sat</span>
                </div>
              </div>
            </div>

            <div class="card-body" style="padding: 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Add New Doctor:</strong> Click "+ Add Doctor", enter doctor's full name, <em>Specialization / Area of Specialization</em>, medical qualifications (MBBS, FCPS), and room #.</li>
                <li><strong>Weekly Roster:</strong> Configure duty shifts (e.g. 05:00 PM – 09:00 PM) for each day of the week to automatically automate on-duty status.</li>
                <li><strong>Revenue Split:</strong> Set Doctor Share % and Clinic Share % for accurate end-of-month consultant payout statements.</li>
              </ul>
            </div>
          </div>

          <!-- 3. Appointments & Token Queue -->
          <div class="card" style="margin-bottom: 0; overflow: hidden; border: 1px solid #e2e8f0;">
            <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
              <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-calendar-check" style="color: #7c3aed;"></i> 3. Appointments Queue & Tokens
              </div>
              <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-size: 0.68rem; font-weight: 700;">Alt + 3</span>
            </div>

            <!-- Visual Graphic Illustration -->
            <div style="background: #18181b; padding: 0.85rem; color: #ffffff;">
              <div style="background: #ffffff; color: #09090b; border-radius: 8px; padding: 0.65rem 0.75rem; font-family: monospace; border: 1px dashed #71717a;">
                <div style="text-align: center; font-weight: 900; font-size: 0.85rem; border-bottom: 1px dashed #a1a1aa; padding-bottom: 0.2rem;">
                  DREAM GARDEN POLYCLINIC
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0;">
                  <span style="font-size: 0.75rem;">Patient: Muhammad Ali</span>
                  <span style="font-size: 1.15rem; font-weight: 900; color: #059669; border: 1.5px solid #059669; padding: 1px 6px; border-radius: 4px;"># T-04</span>
                </div>
                <div style="font-size: 0.68rem; color: #52525b; border-top: 1px dashed #a1a1aa; padding-top: 0.2rem;">
                  Consultant: Dr. Tariq | Room # 04 | Fee: Rs. 2,000
                </div>
              </div>
            </div>

            <div class="card-body" style="padding: 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Generate Token Slip:</strong> Enter patient phone or name, pick doctor, and hit "Issue Token". The system assigns an sequential queue number.</li>
                <li><strong>Direct Thermal Print:</strong> Automatically outputs formatted 80mm or 58mm POS thermal slips with QR verification.</li>
                <li><strong>Queue Controls:</strong> Click on status badge to transition: <em>Waiting → In Consultation → Completed</em>.</li>
              </ul>
            </div>
          </div>

          <!-- 4. Patient Records & Digital EMR -->
          <div class="card" style="margin-bottom: 0; overflow: hidden; border: 1px solid #e2e8f0;">
            <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
              <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-heart-pulse" style="color: #e11d48;"></i> 4. Patient Records (EMR & Rx)
              </div>
              <span class="badge" style="background: rgba(225, 29, 72, 0.12); color: #e11d48; font-size: 0.68rem; font-weight: 700;">Alt + 4</span>
            </div>

            <!-- Visual Graphic Illustration -->
            <div style="background: #111827; padding: 0.85rem; color: #ffffff;">
              <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.55rem 0.7rem; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="display: flex; gap: 0.4rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
                  <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-size: 0.66rem; padding: 2px 6px; border-radius: 4px;">BP: 120/80</span>
                  <span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 0.66rem; padding: 2px 6px; border-radius: 4px;">Pulse: 74 bpm</span>
                  <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 0.66rem; padding: 2px 6px; border-radius: 4px;">Temp: 98.6 °F</span>
                  <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.66rem; padding: 2px 6px; border-radius: 4px;">SpO2: 99%</span>
                </div>
                <div style="font-size: 0.72rem; color: #e2e8f0; display: flex; justify-content: space-between;">
                  <span><strong>Rx:</strong> Tab Augmentin 625mg (1+0+1)</span>
                  <span style="color: #38bdf8;"><i class="fa-solid fa-print"></i> Print Rx</span>
                </div>
              </div>
            </div>

            <div class="card-body" style="padding: 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Clinical Vitals:</strong> Capture BP, Pulse, Temperature, Weight, and Oxygen Saturation at triage or consultation.</li>
                <li><strong>Diagnosis & Prescriptions:</strong> Add diagnosis, clinical symptoms, and prescribe medications with dosage instructions.</li>
                <li><strong>Print Prescription:</strong> Produces formatted letterhead prescription sheet with doctor's credentials and barcode.</li>
              </ul>
            </div>
          </div>

          <!-- 5. All Patients & Medical History -->
          <div class="card" style="margin-bottom: 0; overflow: hidden; border: 1px solid #e2e8f0;">
            <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
              <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-id-card-clip" style="color: #0284c7;"></i> 5. All Patients & Master Registry
              </div>
              <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: #0284c7; font-size: 0.68rem; font-weight: 700;">Alt + 5</span>
            </div>

            <!-- Visual Graphic Illustration -->
            <div style="background: #0f172a; padding: 0.85rem; color: #ffffff;">
              <div style="display: flex; gap: 0.6rem; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 0.5rem 0.65rem; border-radius: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #0284c7; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">MA</div>
                <div style="flex: 1;">
                  <div style="font-size: 0.78rem; font-weight: 700;">Muhammad Ali • 42y / Male</div>
                  <div style="font-size: 0.66rem; color: #94a3b8;">MR# 2026-0042 • Phone: 0300-1234567</div>
                </div>
                <span style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">5 Visits</span>
              </div>
            </div>

            <div class="card-body" style="padding: 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Search & Filter:</strong> Fast multi-field search by Patient Name, MR Number, or Phone.</li>
                <li><strong>Visit Timeline:</strong> Full audit trail of previous visits, previous vitals history graphs, past prescriptions, and invoices.</li>
                <li><strong>Membership Card:</strong> Print an official wallet-sized laminated patient ID card with QR code.</li>
              </ul>
            </div>
          </div>

          <!-- 6. Billing, POS & Thermal Register -->
          <div class="card" style="margin-bottom: 0; overflow: hidden; border: 1px solid #e2e8f0;">
            <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
              <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
                <i class="fa-solid fa-cash-register" style="color: #d97706;"></i> 6. Billing & POS Register
              </div>
              <span class="badge" style="background: rgba(217, 119, 6, 0.12); color: #d97706; font-size: 0.68rem; font-weight: 700;">Alt + 6</span>
            </div>

            <!-- Visual Graphic Illustration -->
            <div style="background: #1c1917; padding: 0.85rem; color: #ffffff;">
              <div style="background: rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 0.55rem 0.7rem; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 0.25rem;">
                  <span>OPD Consultation + Pharmacy</span>
                  <span style="font-weight: 700;">Rs. 2,650</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.66rem; color: #a8a29e; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 0.25rem;">
                  <span>Payment: Cash / Paid in Full</span>
                  <span style="color: #34d399; font-weight: 700;"><i class="fa-solid fa-check"></i> Cleared</span>
                </div>
              </div>
            </div>

            <div class="card-body" style="padding: 0.85rem; font-size: 0.78rem; line-height: 1.5; color: #334155;">
              <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
                <li><strong>Quick Billing:</strong> Instant checkout for doctor consultation fees, clinical procedures, nursing care, or medications.</li>
                <li><strong>Multiple Payment Modes:</strong> Record Cash, Credit Card, Bank Transfer, or apply approved clinic discounts.</li>
                <li><strong>Daily Cash Register:</strong> Detailed shift handover report showing total daily revenue collected.</li>
              </ul>
            </div>
          </div>

        </div>

        <!-- Pro-User Keyboard Shortcuts Quick Reference Card -->
        <div class="card" style="margin-bottom: 0; border: 1px solid #e2e8f0;">
          <div class="card-header" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
            <div style="font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; color: #0f172a;">
              <i class="fa-solid fa-keyboard" style="color: #059669;"></i> Productivity Keyboard Shortcuts Reference
            </div>
          </div>
          <div class="card-body" style="padding: 0.75rem 0.85rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.65rem; font-size: 0.76rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid #e2e8f0;">
                <span><kbd style="padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 800; color: #0f172a;">Alt + 1</kbd></span>
                <span style="color: #475569; font-weight: 600;">Dashboard Overview</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid #e2e8f0;">
                <span><kbd style="padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 800; color: #0f172a;">Alt + 2</kbd></span>
                <span style="color: #475569; font-weight: 600;">Doctors & Rosters</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid #e2e8f0;">
                <span><kbd style="padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 800; color: #0f172a;">Alt + 3</kbd></span>
                <span style="color: #475569; font-weight: 600;">Appointments Queue</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid #e2e8f0;">
                <span><kbd style="padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 800; color: #0f172a;">Alt + 4</kbd></span>
                <span style="color: #475569; font-weight: 600;">Patient Records EMR</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid #e2e8f0;">
                <span><kbd style="padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 800; color: #0f172a;">Alt + 5</kbd></span>
                <span style="color: #475569; font-weight: 600;">All Patients Directory</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: var(--bg-canvas); border-radius: 6px; border: 1px solid #e2e8f0;">
                <span><kbd style="padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 800; color: #0f172a;">Alt + 6</kbd></span>
                <span style="color: #475569; font-weight: 600;">Billing & POS Register</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  // DOWNLOAD / PRINT USER GUIDE MANUAL (PDF/PRINT)
  downloadUserGuide() {
    const guideElement = document.getElementById('clinic-user-guide-doc');
    if (!guideElement) return;

    const printableHtml = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #0f172a; padding: 1.5rem; max-width: 900px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #059669; padding-bottom: 0.85rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="margin: 0; font-size: 1.4rem; color: #062319;">Dream Garden PolyClinic</h1>
            <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #059669; font-weight: 700;">Complete Application User Guide & Standard Operating Procedures (SOP)</p>
          </div>
          <div style="text-align: right; font-size: 0.72rem; color: #64748b;">
            <div>Official Manual v1.0</div>
            <div>Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>
        ${guideElement.innerHTML}
      </div>
    `;

    app.printRaw(printableHtml, 'clinic-user-guide');
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
