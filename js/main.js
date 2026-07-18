// Global State
let workers = [];
let logs = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  const page = window.location.pathname.split("/").pop() || 'index.html';
  
  showLoadingOverlay('กำลังเชื่อมต่อกับ Cloud...');

  // Fetch fresh data from the cloud on every page load
  const cloudData = await pullAllData();

  if (cloudData) {
    workers = cloudData.workers;
    logs = cloudData.logs;
    updateSyncStatus('online');
    hideLoadingOverlay();

    // Initialize page events and render data AFTER data is fetched
    // ใช้ try/finally เพื่อให้ overlay ปิดเสมอ แม้ routePage จะเกิด error ระหว่างประมวลผล
    // (ป้องกันปัญหาหน้าเว็บค้างที่ "กำลังโหลดข้อมูล..." ไม่หยุด หากมีบั๊กเกิดขึ้นระหว่างการ init หน้าใดหน้าหนึ่ง)
    try {
      routePage(true);
      
    } catch (err) {
      console.error('เกิดข้อผิดพลาดระหว่างโหลดหน้า:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถแสดงผลหน้านี้ได้ โปรดลองรีเฟรช', 'error');
    }
  } else {
    // Handle case where data cannot be fetched. Stop execution.
    updateSyncStatus('offline');
    // The error message is already shown by pullAllData(),
    // we can show a more specific one here with a retry button.
    Swal.fire({
      title: 'การเชื่อมต่อล้มเหลว',
      text: 'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองอีกครั้ง',
      icon: 'error',
      confirmButtonText: '<i class="fa-solid fa-rotate"></i> ลองอีกครั้ง',
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
  }
});

function routePage(runSetup) {
  const path = window.location.pathname;
  const page = path.split("/").pop() || 'index.html';

  if (page === 'index.html') {
    initIndexPage(runSetup); // Pass the parameter down
  } else if (page === 'workers.html') {
    initWorkersPage(runSetup); // Pass the parameter down
  } else if (page === 'daily-log.html') {
    initDailyLogPage(runSetup); // Pass the parameter down
  } else if (page === 'report.html') {
    initReportPage(runSetup); // Pass the parameter down
  } else if (page === 'pivot-report.html') {
    initPivotReportPage(runSetup); // Pass the parameter down
  } else if (page === 'view-details.html') {
    initViewDetailsPage(runSetup); // Pass the parameter down
  }
}

// --- UI HELPERS ---
function showLoadingOverlay(message) {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
}

function hideLoadingOverlay() {
  Swal.close();
}

function updateSyncStatus(status) {
  const statusEl = document.getElementById('sync-status');
  if (!statusEl) return;

  const iconEl = statusEl.querySelector('i');
  const textEl = statusEl.querySelector('span');

  statusEl.classList.remove('bg-blue-700', 'bg-emerald-500', 'bg-rose-500');
  iconEl.classList.remove('fa-spin', 'fa-cloud', 'fa-cloud-arrow-up', 'fa-cloud-slash');

  if (status === 'syncing') {
    statusEl.classList.add('bg-blue-700');
    iconEl.classList.add('fa-cloud', 'fa-spin');
    textEl.textContent = 'กำลังซิงค์...';
  } else if (status === 'online') {
    statusEl.classList.add('bg-emerald-500');
    iconEl.classList.add('fa-cloud-arrow-up');
    textEl.textContent = 'ออนไลน์';
  } else if (status === 'offline') {
    statusEl.classList.add('bg-rose-500');
    iconEl.classList.add('fa-cloud-slash');
    textEl.textContent = 'เชื่อมต่อล้มเหลว';
  }
}

// --- PAGE INITIALIZERS ---

function initIndexPage(runSetup) {
  const totalWorkersEl = document.getElementById('dash-total-workers');
  const totalLogsEl = document.getElementById('dash-total-logs');
  const totalWagesEl = document.getElementById('dash-total-wages');
  const totalRawWagesEl = document.getElementById('dash-total-raw-wages');
  const tableBody = document.getElementById('logs-table-body');
  const mobileList = document.getElementById('logs-mobile-list');
  const searchInput = document.getElementById('search-logs');
  const refreshBtn = document.getElementById('btn-refresh');
  const exportSelectedBtn = document.getElementById('btn-export-selected');
  const viewImagesBtn = document.getElementById('btn-view-images');
  const exportSelectedMobileBtn = document.getElementById('btn-export-selected-mobile');
  const viewImagesMobileBtn = document.getElementById('btn-view-images-mobile');
  const mobileActionButtons = document.getElementById('mobile-action-buttons');
  
  if (!totalWorkersEl) return; // Exit if not on the index page

  function renderLogs(logsToRender) {
    if (!tableBody || !mobileList || !mobileActionButtons) return;

    tableBody.innerHTML = ''; // Clear only table body
    mobileList.innerHTML = mobileList.querySelector('#btn-export-selected-mobile') ? mobileList.querySelector('#btn-export-selected-mobile').outerHTML : ''; // Keep the button

    if (logsToRender.length === 0) {
      const emptyHtml = `<td colspan="7" class="text-center py-8 text-slate-400">ไม่พบรายการบันทึก</td>`;
      tableBody.innerHTML = `<tr>${emptyHtml}</tr>`;
      mobileList.innerHTML = mobileActionButtons.outerHTML + `<div class="text-center py-8 text-slate-400">ไม่พบรายการบันทึก</div>`;
      return;
    }
  
    const sortedLogs = [...logsToRender].sort((a, b) => new Date(b.date) - new Date(a.date));
  
    sortedLogs.forEach(log => {
      const totalWage = log.details.reduce((sum, det) => sum + (det.originalWage || 0), 0);
      const workerCount = log.details.length;
  
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-2 text-center"><input type="checkbox" class="log-checkbox" data-id="${log.id}"></td>
        <td class="py-3 px-4">${new Date(log.date).toLocaleDateString('th-TH')}</td>
        <td class="py-3 px-4 font-medium text-slate-700">${log.site || '-'}</td>
        <td class="py-3 px-4 text-slate-500">${log.detail || '-'}</td>
        <td class="py-3 px-4 text-center">${workerCount} คน</td>
        <td class="py-3 px-4 text-right font-semibold text-emerald-600">฿${totalWage.toFixed(2)}</td>
        <td class="py-3 px-4 text-slate-500">${log.notes || '-'}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="editLog('${log.id}')" class="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteLog('${log.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
  
      const card = document.createElement('div');
      card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2";
      card.innerHTML = `
        <div class="flex justify-between items-start gap-4">
          <div class="flex-shrink-0 pt-1">
            <input type="checkbox" class="log-checkbox w-5 h-5" data-id="${log.id}">
          </div>
          <div>
            <p class="text-xs text-slate-500">${new Date(log.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <h4 class="font-bold text-slate-800 text-sm mt-1">${log.site || 'ไม่มีชื่อโครงการ'}</h4>
            <p class="text-xs text-slate-500">${log.detail || '-'}</p>
          </div>
          <span class="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">฿${totalWage.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-slate-100">
          <div>
            <span class="text-xs text-slate-400">${workerCount} คนทำงาน</span>
            ${log.notes ? `<p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-user-tie text-[10px]"></i> ผู้สั่งงาน: ${log.notes}</p>` : ''}
          </div>
           <div class="flex gap-2 items-center">
            <button onclick="editLog('${log.id}')" class="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
            <button onclick="deleteLog('${log.id}')" class="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-trash-can"></i> ลบ</button>
          </div>
        </div>
      `;
      mobileList.appendChild(card);
    });
  }

  function updateActionButtonsVisibility() {
    const selectedCount = document.querySelectorAll('.log-checkbox:checked').length;
    const hasSelection = selectedCount > 0;

    // Desktop buttons
    if (exportSelectedBtn) exportSelectedBtn.classList.toggle('hidden', !hasSelection);
    if (viewImagesBtn) viewImagesBtn.classList.toggle('hidden', !hasSelection);

    // Mobile buttons container
    if (mobileActionButtons) mobileActionButtons.classList.toggle('hidden', !hasSelection);

    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('select-all-logs');
    if (selectAllCheckbox) selectAllCheckbox.checked = hasSelection && selectedCount === document.querySelectorAll('.log-checkbox').length;
  }

  if (totalWorkersEl) totalWorkersEl.textContent = `${workers.length} คน`;
  if (totalLogsEl) totalLogsEl.textContent = `${logs.length} รายการ`;
  
  // คำนวณยอดรวมทั้งสองแบบ: ยอดดิบ (originalWage) และยอดสุทธิ (netWage)
  const sumRaw = logs.reduce((total, log) => total + log.details.reduce((subTotal, det) => subTotal + (det.originalWage || 0), 0), 0);
  const sumNet = logs.reduce((total, log) => total + log.details.reduce((subTotal, det) => subTotal + (det.netWage || 0), 0), 0);
  
  if (totalRawWagesEl) totalRawWagesEl.textContent = `฿${sumRaw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (totalWagesEl) totalWagesEl.textContent = `฿${sumNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  
  if (runSetup) {
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = logs.filter(l => (l.site && l.site.toLowerCase().includes(searchTerm)) || (l.detail && l.detail.toLowerCase().includes(searchTerm)));
        renderLogs(filtered);
      });
    }

    document.body.addEventListener('change', (e) => {
      if (e.target.classList.contains('log-checkbox')) updateActionButtonsVisibility();
    });

    const handleExport = () => {
      const selectedIds = Array.from(document.querySelectorAll('.log-checkbox:checked')).map(cb => cb.dataset.id);
      if (selectedIds.length === 0) {
        Swal.fire('ไม่ได้เลือกรายการ', 'กรุณาติ๊กเลือกใบงานที่ต้องการส่งออกเป็น Excel อย่างน้อย 1 รายการ', 'warning');
        return;
      }

      showLoadingOverlay('กำลังสร้างไฟล์ Excel...');

      try {
        // 1. กรองใบงานที่เลือก
        let selectedLogs = logs.filter(log => selectedIds.includes(log.id));
        
        // 2. เรียงลำดับใบงานตามวันที่จากเก่าไปใหม่ เพื่อให้ชีตใน Excel เรียงตามวันที่
        selectedLogs.sort((a, b) => new Date(a.date) - new Date(b.date));

        const workbook = XLSX.utils.book_new();

        selectedLogs.forEach((log, index) => { // index ยังคงใช้เพื่อให้ชื่อชีตไม่ซ้ำกันกรณีมีหลายใบงานในวันเดียว
          const dataForSheet = [];
          
          // --- Header ---
          dataForSheet.push(["ใบรายงานค่าแรงประจำวัน"]);
          dataForSheet.push([]); // Empty row
          dataForSheet.push(["วันที่:", new Date(log.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }), "", "ผู้สั่งงาน:", log.notes || '-']);
          dataForSheet.push(["ไซต์งาน/โครงการ:", log.site || '-', "", "รายละเอียดงาน:", log.detail || '-']);
          dataForSheet.push([]); // Empty row

          // --- Worker Table Header ---
          const tableHeader = ["ชื่อคนงาน", "ค่าแรงพื้นฐาน", "ระยะเวลาทำงาน", "ค่าแรงดิบ", "เพิ่ม+20%", "ค่าแรงเหมา", "OT", "ยอดรับสุทธิ"];
          dataForSheet.push(tableHeader);

          // --- Worker Table Body & Summaries ---
          let totalDaily = 0, totalFlat = 0, totalBonus = 0, grandTotal = 0;

          log.details.forEach(det => {
            const worker = workers.find(w => w.id === det.workerId);
            const baseRate = worker ? worker.rate : 0;
            const otWage = det.workType === 'daily' ? (det.otHours * (baseRate / 8 * 2)) : 0;

            let workDuration = '-';
            if (det.workType === 'daily') {
              workDuration = `${det.hours} ชม.` + (det.otHours > 0 ? ` (OT: ${det.otHours} ชม.)` : '');
            } else {
              workDuration = 'เหมา';
            }

            dataForSheet.push([
              det.workerName,
              baseRate,
              workDuration,
              det.originalWage,
              det.deduction > 0 ? det.deduction : 0,
              det.workType === 'flat' ? det.originalWage : 0,
              otWage > 0 ? otWage : 0,
              det.netWage
            ]);

            // Calculate summaries
            if (det.workType === 'daily') totalDaily += det.originalWage;
            if (det.workType === 'flat') totalFlat += det.originalWage;
            totalBonus += det.deduction;
            grandTotal += det.netWage;
          });

          // --- Summary Section ---
          dataForSheet.push([]); // Empty row
          dataForSheet.push(["สรุปยอด", "", "", "", "", "", "", ""]);
          dataForSheet.push(["ยอดรวมค่าแรงเหมาทั้งหมด:", totalFlat, "", "รวมเงินทั้งหมดสุทธิ:", grandTotal]);
          dataForSheet.push(["ยอดรวมค่าแรง(รายวัน)ทั้งหมด:", totalDaily]);
          dataForSheet.push(["ยอดรวมค่าดำเนินการทั้งหมด (+20%):", totalBonus]);
          dataForSheet.push([]);

          // --- Image Section ---
          if (log.images && log.images.length > 0) {
            dataForSheet.push(["รูปถ่ายหน้างาน (คลิกเพื่อเปิด)"]);
            log.images.forEach(url => {
              dataForSheet.push([url]);
            });
          }

          const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);

          // --- Styling and Merging Cells (Advanced) ---
          worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Title
            { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }, // Date value
            { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }, // Site value
            { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } }, // Summary Title
            { s: { r: 13, c: 4 }, e: { r: 13, c: 7 } }, // Grand Total Value
          ];
          
          // Set column widths
          worksheet['!cols'] = [
            { wch: 20 }, // ชื่อคนงาน
            { wch: 15 }, // ค่าแรงพื้นฐาน
            { wch: 20 }, // ระยะเวลาทำงาน
            { wch: 15 }, // ค่าแรงดิบ
            { wch: 15 }, // เพิ่ม+20%
            { wch: 15 }, // ค่าแรงเหมา
            { wch: 15 }, // OT
            { wch: 15 }  // ยอดรับสุทธิ
          ];

          // 3. สร้างชื่อชีตจากวันที่ (YYYY-MM-DD) และป้องกันชื่อซ้ำ
          const datePart = log.date.split('T')[0]; // จะได้ 'YYYY-MM-DD'
          // ใช้ index เพื่อป้องกันกรณีมีหลายใบงานในวันเดียวกัน ทำให้ชื่อชีตไม่ซ้ำกัน
          const sheetName = `${datePart}_${index + 1}`;

          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });

        // เมื่อสร้างข้อมูล Excel ในหน่วยความจำเสร็จแล้ว ให้ปิดหน้าต่าง "กำลังสร้าง..."
        hideLoadingOverlay();

        // จากนั้นจึงสั่งให้ browser ดาวน์โหลดไฟล์ (ขั้นตอนนี้จะเปิดหน้าต่าง Save As)
        XLSX.writeFile(workbook, `รายงานใบงาน_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        // แสดง popup ว่าสำเร็จแล้ว และให้หายไปเองอัตโนมัติ
        Swal.fire({
          title: 'สร้างไฟล์สำเร็จ',
          icon: 'success',
          timer: 1500, // แสดงผล 1.5 วินาที
          showConfirmButton: false // ซ่อนปุ่ม OK
        });
      } catch (error) {
        hideLoadingOverlay();
        console.error("Failed to export Excel:", error);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
      }
    };

    if (exportSelectedBtn) exportSelectedBtn.addEventListener('click', handleExport);
    if (exportSelectedMobileBtn) exportSelectedMobileBtn.addEventListener('click', handleExport);

    if (viewImagesBtn) viewImagesBtn.addEventListener('click', showSelectedImages);
    if (viewImagesMobileBtn) viewImagesMobileBtn.addEventListener('click', showSelectedImages);

    if (refreshBtn) refreshBtn.addEventListener('click', () => window.location.reload());

    const selectAllCheckbox = document.getElementById('select-all-logs');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.log-checkbox').forEach(cb => {
          cb.checked = e.target.checked;
        });
        updateActionButtonsVisibility();
      });
    }
  }

  renderLogs(logs);
}

function initWorkersPage(runSetup) {
  function renderWorkers() {
    const tbody = document.getElementById('workers-table-body');
    const mobileList = document.getElementById('workers-mobile-list');
    const countSpan = document.getElementById('worker-count');
    if (!tbody || !mobileList || !countSpan) return;

    tbody.innerHTML = '';
    mobileList.innerHTML = '';
    countSpan.textContent = `${workers.length} คน`;

    if (workers.length === 0) {
      const emptyRow = `<tr><td colspan="4" class="text-center py-8 text-slate-400">ยังไม่มีรายชื่อคนงานในระบบ</td></tr>`;
      tbody.innerHTML = emptyRow;
      mobileList.innerHTML = `<div class="text-center py-8 text-slate-400">ยังไม่มีรายชื่อคนงานในระบบ</div>`;
      return;
    }

    // Sort workers by name
    const sortedWorkers = [...workers].sort((a, b) => a.name.localeCompare(b.name, 'th'));

    sortedWorkers.forEach(worker => {
      const rate = parseFloat(worker.rate || 0).toFixed(2);
      // Desktop view
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 font-medium text-slate-700">${worker.name}</td>
        <td class="py-3 px-4 text-slate-500">${worker.contact || '-'}</td>
        <td class="py-3 px-4 text-right font-semibold text-blue-600">฿${rate}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="editWorker('${worker.id}')" class="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteWorker('${worker.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // Mobile view
      const card = document.createElement('div');
      card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2";
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${worker.name}</h4>
            <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone text-[10px]"></i> ${worker.contact || '-'}</p>
          </div>
          <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">฿${rate} / วัน</span>
        </div>
        <div class="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button onclick="editWorker('${worker.id}')" class="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
          <button onclick="deleteWorker('${worker.id}')" class="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-trash-can"></i> ลบ</button>
        </div>
      `;
      mobileList.appendChild(card);
    });
  }

  if (runSetup) {
    console.log("Setting up Workers Page events");
    const form = document.getElementById('worker-form');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const formTitle = document.getElementById('form-title');
    if (!form) return;

  function resetForm() {
    form.reset();
    document.getElementById('worker-id').value = '';
    formTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>เพิ่มคนงานใหม่</span>`;
    btnCancel.classList.add('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoadingOverlay('กำลังบันทึกข้อมูล...');

    const id = document.getElementById('worker-id').value;
    const workerData = {
      id: id || 'W' + Date.now(),
      name: document.getElementById('worker-name').value.trim(),
      contact: document.getElementById('worker-contact').value.trim(),
      rate: parseFloat(document.getElementById('worker-wage').value) || 0,
      status: 'active'
    };

    try {
      if (id) { // Edit mode
        const updatedWorker = await apiCall('updateWorker', workerData);
        const index = workers.findIndex(w => w.id === id);
        if (index !== -1) workers[index] = updatedWorker;
      } else { // Add mode
        const newWorker = await apiCall('addWorker', workerData);
        workers.push(newWorker);
      }
      
      renderWorkers();
      resetForm();
      Swal.fire('บันทึกสำเร็จ!', 'ข้อมูลคนงานถูกบันทึกลง Cloud เรียบร้อย', 'success');
    } catch (error) {
      // Error is already shown by apiCall function
    } finally {
      hideLoadingOverlay();
    } 
  });

  btnCancel.addEventListener('click', resetForm);
  }
  renderWorkers();
}

function initDailyLogPage(runSetup) {

  console.log("Initializing Daily Log Page");
  
  // ตรวจสอบว่ามี ID ของใบงานถูกส่งมาเพื่อแก้ไขหรือไม่
  const urlParams = new URLSearchParams(window.location.search);
  const logIdToEdit = urlParams.get('id');

  const container = document.getElementById('workers-daily-container');
  const totalDisplay = document.getElementById('daily-total-display');
  const form = document.getElementById('daily-log-form');
  const imageInput = document.getElementById('image-files');
  const previewContainer = document.getElementById('image-preview-container');
  const existingImagesSection = document.getElementById('existing-images-section');
  const existingImagesContainer = document.getElementById('existing-images-container');
  const pageTitle = document.querySelector('header span');
  const formTitle = document.querySelector('main h2');
  const submitButton = form.querySelector('button[type="submit"]');

  if (!form) return; // Exit if not on the correct page

  if (runSetup && !form) return;

  // originalImages = รูปที่เคยบันทึกไว้ตอนโหลดหน้า (ใช้เทียบว่าอันไหนถูกลบออกไปจริง)
  // keptImages = สถานะปัจจุบันหลังผู้ใช้อาจกดลบบางรูปออก
  let originalImages = [];
  let keptImages = [];

  function renderExistingImages() {
    if (!existingImagesContainer) return;
    existingImagesContainer.innerHTML = '';
    keptImages.forEach((url, index) => {
      const div = document.createElement('div');
      div.className = "relative rounded-xl overflow-hidden border border-slate-200 aspect-square group";
      div.innerHTML = `
        <img src="${toDriveThumbnail(url)}" class="object-cover w-full h-full" loading="lazy">
        <button type="button" data-index="${index}" class="btn-remove-existing-image absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-rose-600 text-white text-xs shadow hover:bg-rose-700">✕</button>
      `;
      existingImagesContainer.appendChild(div);
    });
    existingImagesContainer.querySelectorAll('.btn-remove-existing-image').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        keptImages.splice(idx, 1);
        renderExistingImages();
      });
    });
  }

  function renderDailyWorkers() {
    container.innerHTML = '';
    if (workers.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-center py-6">ไม่มีรายชื่อคนงาน กรุณาเพิ่มคนงานก่อน</p>`;
      return;
    }

    const sortedWorkers = [...workers].sort((a, b) => a.name.localeCompare(b.name, 'th'));

    sortedWorkers.forEach(worker => {
      const row = document.createElement('div');
      row.className = "p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4";
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <input type="checkbox" id="check-${worker.id}" class="worker-checkbox w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300" onchange="toggleWorkerInputs('${worker.id}')">
          <div>
            <label for="check-${worker.id}" class="font-bold text-slate-800 text-sm cursor-pointer">${worker.name}</label>
            <p class="text-xs text-slate-500">ค่าแรงเริ่มต้น: ฿${parseFloat(worker.rate || 0).toFixed(2)}/วัน</p>
          </div>
        </div>
        
        <div id="input-wrapper-${worker.id}" class="grid grid-cols-3 gap-2 w-full md:w-auto hidden">
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">ประเภทงาน</label>
            <select id="type-${worker.id}" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white" onchange="toggleWorkTypeFields('${worker.id}')">
              <option value="daily">รายวัน</option>
              <option value="flat">งานเหมา</option>
            </select>
          </div>
          <div id="div-normal-${worker.id}">
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">ชม.ปกติ (สูงสุด 8)</label>
            <input type="number" id="normal-${worker.id}" value="8" min="0" max="8" step="1" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300" oninput="calculateDailyTotal()">
          </div>
          <div id="div-ot-${worker.id}">
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">ชม. OT (คูณ 2)</label>
            <input type="number" id="ot-${worker.id}" value="0" min="0" max="4" step="1" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300" oninput="calculateDailyTotal()">
          </div>
          <div id="div-flat-${worker.id}" class="hidden col-span-2">
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">เงินเหมาสุทธิ (บาท)</label>
            <input type="number" id="flat-val-${worker.id}" value="0" min="0" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300" oninput="calculateDailyTotal()">
          </div>
        </div>

        <div class="text-right self-end md:self-center">
          <span class="text-xs text-slate-400 block">คำนวณเงินดิบ</span>
          <span id="calc-${worker.id}" class="font-bold text-slate-700 text-sm">฿0.00</span>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function populateFormForEdit(log) {
    if (!log) return;
    
    // อัปเดต UI
    pageTitle.textContent = 'แก้ไขใบงานประจำวัน';
    formTitle.innerHTML = `<i class="fa-solid fa-edit text-amber-500"></i> <span>แก้ไขใบงาน #${log.id}</span>`;
    submitButton.innerHTML = `<i class="fa-solid fa-save"></i> อัปเดตข้อมูล`;
    submitButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    submitButton.classList.add('bg-amber-500', 'hover:bg-amber-600');

    // เติมข้อมูลลงในฟอร์ม
    // แก้ไขปัญหา Timezone: แปลงวันที่จาก ISO String เป็น Date object ก่อน
    // เพื่อให้แน่ใจว่าวันที่ที่แสดงผลจะตรงกับโซนเวลาของผู้ใช้
    const localDate = new Date(log.date);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    document.getElementById('log-date').value = `${year}-${month}-${day}`;
    document.getElementById('project-name').value = log.site;
    document.getElementById('work-detail').value = log.detail;
    document.getElementById('log-notes').value = log.notes;

    // ติ๊กเลือกคนงานและเติมข้อมูลของแต่ละคน
    log.details.forEach(det => {
      const workerCheckbox = document.getElementById(`check-${det.workerId}`);
      toggleWorkerInputs(det.workerId); // แสดงช่องกรอกข้อมูล
      if (workerCheckbox) {
        workerCheckbox.checked = true;
        document.getElementById(`type-${det.workerId}`).value = det.workType;
        toggleWorkTypeFields(det.workerId, false); // false to prevent recalculation yet
        if (det.workType === 'daily') {
          document.getElementById(`normal-${det.workerId}`).value = det.hours;
          document.getElementById(`ot-${det.workerId}`).value = det.otHours;
        } else {
          document.getElementById(`flat-val-${det.workerId}`).value = det.maoAmount;
        }
      }
    });

    // แสดงรูปภาพที่เคยบันทึกไว้แล้ว พร้อมปุ่มลบทีละรูป
    originalImages = [...(log.images || [])];
    keptImages = [...originalImages];
    if (existingImagesSection) existingImagesSection.classList.remove('hidden');
    renderExistingImages();
  }

  if (runSetup) {
    console.log("Setting up Daily Log Page events");
  imageInput.addEventListener('change', () => {
    const newFilesCount = imageInput.files.length;
    const existingFilesCount = keptImages.length;
    const totalFiles = newFilesCount + existingFilesCount;

    if (totalFiles > 6) {
      Swal.fire(
        'เลือกรูปภาพเกินกำหนด',
        `คุณสามารถมีรูปภาพได้สูงสุด 6 รูป (ปัจจุบันมี ${existingFilesCount} รูป, เลือกเพิ่มได้อีก ${6 - existingFilesCount} รูป)`,
        'warning'
      );
      // Clear the new file selection to prevent upload
      imageInput.value = ''; 
      previewContainer.innerHTML = '';
      return;
    }

    previewContainer.innerHTML = '';
    Array.from(imageInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = "relative rounded-xl overflow-hidden border border-slate-200 aspect-square";
        div.innerHTML = `<img src="${e.target.result}" class="object-cover w-full h-full">`;
        previewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoadingOverlay('กำลังบันทึกใบงาน...');
    
    let isSuccess = false;

    const selectedDetails = [];
    workers.forEach(worker => {
      if (!document.getElementById(`check-${worker.id}`)?.checked) return;

      const type = document.getElementById(`type-${worker.id}`).value;
      let originalWage = 0, normalHours = 0, otHours = 0, flatAmount = 0, detailsText = "";

      if (type === 'daily') {
        normalHours = parseFloat(document.getElementById(`normal-${worker.id}`).value) || 0;
        otHours = parseFloat(document.getElementById(`ot-${worker.id}`).value) || 0;
        const hourlyRate = (worker.rate || 0) / 8;
        originalWage = (normalHours * hourlyRate) + (otHours * (hourlyRate * 2));
        detailsText = `ปกติ ${normalHours} ชม. / OT ${otHours} ชม.`;
      } else {
        flatAmount = parseFloat(document.getElementById(`flat-val-${worker.id}`).value) || 0;
        originalWage = flatAmount;
        detailsText = `งานเหมา`;
      }

      selectedDetails.push({
        workerId: worker.id, workerName: worker.name, workType: type,
        hours: normalHours, otHours: otHours, maoAmount: flatAmount,
        originalWage: originalWage,
        deduction: calculateDeduction(originalWage, type, worker.name),
        netWage: calculateNetWage(originalWage, type, worker.name),
        detailsText: detailsText
      });
    });

    if (selectedDetails.length === 0) {
      hideLoadingOverlay();
      Swal.fire('คำเตือน', 'กรุณาเลือกอย่างน้อยหนึ่งคนงานที่เข้ามาทำงาน', 'warning');
      return;
    }

    const imagePromises = Array.from(imageInput.files).map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve({ filename: file.name, mimeType: file.type, data: e.target.result.split(',')[1] });
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    }));
    const imagesData = await Promise.all(imagePromises);

    const logData = {
      id: logIdToEdit || ('L' + Date.now()),
      date: document.getElementById('log-date').value,
      site: document.getElementById('project-name').value.trim(),
      detail: document.getElementById('work-detail').value.trim(),
      notes: document.getElementById('log-notes').value.trim(),
      details: selectedDetails
    };

    if (logIdToEdit) {
      // โหมดแก้ไข: ส่งเฉพาะ "รายการรูปที่ถูกลบออกจริง" (removedImageUrls)
      // แทนที่จะส่ง "รายการที่เก็บไว้" — เพื่อไม่ให้เกิดกรณีลิสต์ว่างแล้วเข้าใจผิดว่าลบทุกรูป
      // ถ้าไม่ได้กดลบรูปไหนเลย removedImageUrls จะเป็น [] และฝั่งเซิร์ฟเวอร์จะไม่ลบอะไรเป็นค่าเริ่มต้น
      const removedImageUrls = originalImages.filter(url => keptImages.indexOf(url) === -1);
      logData.removedImageUrls = removedImageUrls;
      logData.newImages = imagesData;
    } else {
      logData.images = imagesData;
    }

    try {
      if (logIdToEdit) {
        // โหมดแก้ไข: ส่ง ID ไปด้วยและเรียก updateLog
        const updatedLog = await apiCall('updateLog', logData);
        const index = logs.findIndex(l => l.id === logIdToEdit);
        if (index !== -1) logs[index] = updatedLog;
        isSuccess = true;
      } else {
        const newLog = await apiCall('addLog', logData);
        logs.push(newLog);
        isSuccess = true;
      }
    } catch (error) {
      // Error is already shown by apiCall
      isSuccess = false;
    } finally {
      hideLoadingOverlay();
    }
    
    if (isSuccess) {
      Swal.fire('บันทึกสำเร็จ!', 'ใบงานถูกบันทึกลง Cloud เรียบร้อย', 'success').then(() => {
        window.location.href = 'index.html';
      });
    }
  });
  }
  renderDailyWorkers();

  // ถ้าเป็นโหมดแก้ไข ให้เติมข้อมูลลงฟอร์ม
  if (logIdToEdit) {
    const logToEdit = logs.find(l => l.id === logIdToEdit);
    populateFormForEdit(logToEdit);
    calculateDailyTotal(); // คำนวณยอดรวมครั้งแรก
  } else {
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
  }
}

function initReportPage(runSetup) {
  console.log("Initializing Report Page");
  const btnApply = document.getElementById('btn-apply-filter');
  const btnClear = document.getElementById('btn-clear-filter');
  const btnExport = document.getElementById('btn-export-excel');
  const reportTbody = document.getElementById('report-table-body');

  // Exit if not on the report page
  if (!btnApply) return;

  function processReportData() {
    const startFilter = document.getElementById('filter-start-date').value;
    const endFilter = document.getElementById('filter-end-date').value;

    let filteredLogs = logs.filter(log => {
      const date = log.date.split('T')[0];
      const startDateMatch = !startFilter || date >= startFilter;
      const endDateMatch = !endFilter || date <= endFilter;
      return startDateMatch && endDateMatch;
    });

    const workerSummary = {};
    let totalRaw = 0, totalSubject = 0, totalDeducted = 0, totalNet = 0;

    filteredLogs.forEach(log => {
      log.details.forEach(det => {
        const name = det.workerName;
        if (!workerSummary[name]) {
          const workerInfo = workers.find(w => w.id === det.workerId);
          workerSummary[name] = { name, rate: workerInfo ? workerInfo.rate : 0, days: 0, hours: 0, otHours: 0, rawTotal: 0, flatTotal: 0, otWageTotal: 0, deductedTotal: 0, netTotal: 0 };
        }

        // ใช้ค่าที่คำนวณและบันทึกไว้แล้วจากตอนสร้างใบงานโดยตรง
        // เพื่อให้แน่ใจว่าตัวเลขตรงกัน 100%
        const raw = det.originalWage || 0;
        const ded = det.deduction || 0;
        const net = det.netWage || 0;

        if (det.workType === 'flat') {
          workerSummary[name].days += 1;
          workerSummary[name].flatTotal += raw;
        } else { // daily
          if (det.hours === 8 && det.otHours === 0) {
            workerSummary[name].days += 1;
          } else {
            workerSummary[name].hours += det.hours;
            workerSummary[name].otHours += det.otHours;
          }
          const hourlyRate = (workerSummary[name].rate || 0) / 8;
          workerSummary[name].otWageTotal += (det.otHours * (hourlyRate * 2));
        }
        workerSummary[name].rawTotal += raw;
        workerSummary[name].deductedTotal += ded; // ยอดโบนัสสะสมรายคน
        workerSummary[name].netTotal += net; // ยอดสุทธิสะสมรายคน

        totalRaw += raw;
        if (ded > 0) totalSubject += raw; // ยอดที่นำไปคิดโบนัส คือยอดที่มีโบนัสเกิดขึ้นจริง
        totalDeducted += ded;
        totalNet += net;
      });
    });

    document.getElementById('rep-raw-wage').textContent = `฿${totalRaw.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('rep-subject-wage').textContent = `฿${totalSubject.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('rep-deducted-amount').textContent = `฿${totalDeducted.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('rep-net-wage').textContent = `฿${totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    reportTbody.innerHTML = '';
    const summaryArray = Object.values(workerSummary).sort((a,b) => a.name.localeCompare(b.name, 'th'));
    if (summaryArray.length === 0) {
      reportTbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
      return;
    }

    summaryArray.forEach(row => {
      let workSummaryText = [];
      if (row.days > 0) {
        workSummaryText.push(`${row.days} วัน`);
      }
      if (row.hours > 0) {
        workSummaryText.push(`${row.hours} ชม.`);
      }
      if (row.otHours > 0) {
        workSummaryText.push(`(OT ${row.otHours} ชม.)`);
      }

      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 font-bold text-slate-700">${row.name} <span class="font-normal text-slate-400 text-xs">(ค่าแรง ${row.rate.toFixed(2)} บาท)</span></td>
        <td class="py-3 px-4 text-right">${workSummaryText.join(' - ') || '0'}</td>
        <td class="py-3 px-4 text-right">฿${row.rawTotal.toFixed(2)}</td>
        <td class="py-3 px-4 text-right text-sky-600 font-medium">+฿${row.deductedTotal.toFixed(2)}</td>
        <td class="py-3 px-4 text-right text-purple-600 font-medium">${row.flatTotal > 0 ? `฿${row.flatTotal.toFixed(2)}` : '-'}</td>
        <td class="py-3 px-4 text-right text-amber-600 font-medium">${row.otWageTotal > 0 ? `฿${row.otWageTotal.toFixed(2)}` : '-'}</td>
        <td class="py-3 px-4 text-right font-bold text-emerald-600">฿${row.netTotal.toFixed(2)}</td>
      `;
      reportTbody.appendChild(tr);
    });
  }

  if (runSetup) {
    console.log("Setting up Report Page events");

  btnApply.addEventListener('click', processReportData);
  btnClear.addEventListener('click', () => {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    processReportData();
  });

  btnExport.addEventListener('click', () => {
    const dataForExcel = [["วันที่ทำใบงาน", "ไซต์งาน/โครงการ", "รายละเอียดงาน", "ชื่อคนงาน", "ประเภทงาน", "รายละเอียดชั่วโมง/วัน", "ค่าแรงดิบ (บาท)", "โบนัส 20% (บาท)", "ยอดจ่ายสุทธิ (บาท)", "ลิงก์รูปภาพ"]];
    const startFilter = document.getElementById('filter-start-date').value;
    const endFilter = document.getElementById('filter-end-date').value;

    let filteredLogs = logs.filter(log => {
      const date = log.date.split('T')[0];
      const startDateMatch = !startFilter || date >= startFilter;
      const endDateMatch = !endFilter || date <= endFilter;
      return startDateMatch && endDateMatch;
    });

    if (filteredLogs.length === 0) {
      Swal.fire('ไม่มีข้อมูล', 'ไม่มีข้อมูลรายงานให้ส่งออกตามเงื่อนไขที่เลือก', 'warning');
      return;
    }

    filteredLogs.forEach(log => {
      log.details.forEach(det => {
        dataForExcel.push([log.date, log.site, log.detail || "-", det.workerName, det.workType, det.detailsText, det.originalWage, det.deduction, det.netWage, (log.images || []).join(', ')]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "สรุปงวดค่าแรง");
    XLSX.writeFile(workbook, `สรุปงวดงาน_${new Date().toISOString().split('T')[0]}.xlsx`);
  });
  }

  processReportData(); // เรียกใช้ฟังก์ชันเพื่อแสดงข้อมูลทั้งหมดในครั้งแรกที่โหลดหน้า
}

function initPivotReportPage(runSetup) {
  console.log("Initializing Pivot Report Page");
  const btnApply = document.getElementById('btn-pivot-apply');
  const btnPrint = document.getElementById('btn-pivot-print');
  const contentDiv = document.getElementById('pivot-table-content');
  const titleEl = document.getElementById('pivot-table-title');
  const summaryContainer = document.getElementById('pivot-summary-container');
  const transportInput = document.getElementById('fixed-transport-cost');

  /**
   * จัดรูปแบบตัวเลข:
   * - ถ้ามีทศนิยม, แสดง 2 ตำแหน่ง (1,234.50)
   * - ถ้าเป็นเลขจำนวนเต็ม, ไม่แสดงทศนิยม (500)
   */
  function formatNumber(num) {
    if (num % 1 !== 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('en-US');
  }

  if (!btnApply) return;

  let grandTotalDaily = 0;
  let grandTotalBonus = 0;
  let grandTotalFlat = 0;

  function updateGrandTotal() {
    const transportCost = parseFloat(transportInput.value) || 0;
    const subTotalDailyAndBonus = grandTotalDaily + grandTotalBonus;
    document.getElementById('summary-subtotal-daily-bonus').textContent = `${subTotalDailyAndBonus.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;
    const grandTotal = transportCost + grandTotalFlat + subTotalDailyAndBonus;
    document.getElementById('summary-grand-total').textContent = `${grandTotal.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;
  }

  function renderPivotReport() {
    showLoadingOverlay('กำลังสร้างรายงาน...');

    // Reset grand totals
    grandTotalDaily = grandTotalBonus = grandTotalFlat = 0;

    const startFilter = document.getElementById('pivot-start-date').value;
    const endFilter = document.getElementById('pivot-end-date').value;

    if (!startFilter || !endFilter) {
      contentDiv.innerHTML = `<p class="text-center text-amber-600 py-12">กรุณาเลือกทั้ง "วันที่เริ่มต้น" และ "วันที่สิ้นสุด"</p>`;
      hideLoadingOverlay();
      return;
    } else {
      titleEl.textContent = `ค่าแรงรายวัน ประจำวันที่ ${new Date(startFilter).toLocaleDateString('th-TH')} ถึงวันที่ ${new Date(endFilter).toLocaleDateString('th-TH')}`;
    }

    const filteredLogs = logs.filter(log => {
      const date = log.date.split('T')[0];
      return date >= startFilter && date <= endFilter;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredLogs.length === 0) {
      contentDiv.innerHTML = `<p class="text-center text-slate-400 py-12">ไม่พบข้อมูลใบงานในช่วงวันที่ที่เลือก</p>`;
      summaryContainer.classList.add('hidden');
      hideLoadingOverlay();
      return;
    }

    const sortedWorkers = [...workers].sort((a, b) => a.name.localeCompare(b.name, 'th'));

    let tableHTML = `<table class="w-full text-left border-collapse text-xs">`;

    // --- Table Header ---
    tableHTML += `<thead><tr class="bg-slate-100">`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-center text-[10px]" style="width: 30px;">ลำดับ</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-center text-[10px]" style="width: 70px;">วันที่</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-center " style="min-width: 90px;">ไซต์งาน / โครงการ</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-center min-w-[250px]">รายละเอียดงาน</th>`;
    sortedWorkers.forEach(worker => {
      tableHTML += `<th class="py-2 px-2 border border-slate-200 text-center text-[10px]" style="width: 40px;">${worker.name}<br><span class="font-normal text-slate-500">(${worker.rate})</span></th>`;
    });
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-right">ยอดรวม (รายวัน)</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-right">ยอด +20% (รายวัน)</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-right">ยอดรวม (เหมา)</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200 text-right">ยอดรวมสุทธิ</th>`;
    tableHTML += `<th class="py-2 px-2 border border-slate-200">ผู้สั่งงาน</th>`;
    tableHTML += `</tr></thead>`;

    // --- Table Body ---
    tableHTML += `<tbody>`;
    filteredLogs.forEach((log, index) => {
      const logDetailsMap = new Map(log.details.map(d => [d.workerId, d]));

      let dailyTotal = 0;
      let bonusTotal = 0;
      let flatTotal = 0;
      let netTotal = 0;

      log.details.forEach(det => {
        if (det.workType === 'daily') {
          dailyTotal += det.originalWage;
          bonusTotal += det.deduction;
        } else {
          flatTotal += det.originalWage;
        }
        netTotal += det.netWage;
      });

      // Add to grand totals
      grandTotalDaily += dailyTotal;
      grandTotalBonus += bonusTotal;
      grandTotalFlat += flatTotal;

      tableHTML += `<tr class="hover:bg-slate-50">`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200 text-center text-[10px]">${index + 1}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200 text-[10px]">${new Date(log.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' })}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200">${log.site}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200">${log.detail}</td>`;

      sortedWorkers.forEach(worker => {
        const detail = logDetailsMap.get(worker.id);
        let cellContent = '-';
        if (detail) {
          cellContent = detail.workType === 'flat' 
            ? `${formatNumber(detail.originalWage)} (เหมา)` 
            : formatNumber(detail.netWage);
        }
        tableHTML += `<td class="py-2 px-2 border border-slate-200 text-right text-[10px]">${cellContent}</td>`;
      });

      tableHTML += `<td class="py-2 px-2 border border-slate-200 text-right font-medium">${formatNumber(dailyTotal)}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200 text-right font-medium text-sky-600">+${formatNumber(bonusTotal)}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200 text-right font-medium">${formatNumber(flatTotal)}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200 text-right font-bold text-emerald-600">${formatNumber(netTotal)}</td>`;
      tableHTML += `<td class="py-2 px-2 border border-slate-200">${log.notes || '-'}</td>`;
      tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;

    contentDiv.innerHTML = tableHTML;

    // --- Update Summary Section ---
    summaryContainer.classList.remove('hidden');
    document.getElementById('summary-total-flat').textContent = `${grandTotalFlat.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;
    document.getElementById('summary-total-daily').textContent = `${grandTotalDaily.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;
    document.getElementById('summary-total-bonus').textContent = `${grandTotalBonus.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`;
    
    // Update final grand total
    updateGrandTotal();

    hideLoadingOverlay();
  }

  if (runSetup) {
    btnApply.addEventListener('click', renderPivotReport);
    btnPrint.addEventListener('click', () => window.print());
    transportInput.addEventListener('input', updateGrandTotal);
    // Set default dates to the current month
    const today = new Date();
    document.getElementById('pivot-start-date').value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('pivot-end-date').value = today.toISOString().split('T')[0];
  }
  // renderPivotReport(); // Don't run on initial load, wait for user to click
}

function initViewDetailsPage(runSetup) {
  console.log("Initializing View Details Page");
  const contentDiv = document.getElementById('details-content');
  if (!contentDiv) return;

  const urlParams = new URLSearchParams(window.location.search);
  const idsToShow = (urlParams.get('ids') || '').split(',').filter(Boolean);

  if (idsToShow.length === 0) {
    contentDiv.innerHTML = `<div class="text-center py-20 text-rose-500">
      <i class="fa-solid fa-circle-exclamation text-3xl"></i>
      <p class="mt-3 font-semibold">ไม่พบ ID ของใบงาน</p>
      <p class="text-sm text-slate-500">กรุณากลับไปหน้าแรกและเลือกใบงานอีกครั้ง</p>
    </div>`;
    return;
  }

  let selectedLogs = logs
    .filter(log => idsToShow.includes(log.id))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let reportHtml = '<div class="space-y-8">';

  selectedLogs.forEach((log, index) => {
    const totalNetWage = log.details.reduce((sum, det) => sum + (det.netWage || 0), 0);

    let workerListHtml = '<ul class="text-sm list-disc list-inside text-slate-600 mt-2">';
    log.details.forEach(det => {
      workerListHtml += `<li>${det.workerName}: <span class="font-medium text-emerald-700">฿${(det.netWage || 0).toFixed(2)}</span></li>`;
    });
    workerListHtml += '</ul>';

    let imageGridHtml = '';
    if (log.images && log.images.length > 0) {
      imageGridHtml = '<div class="grid grid-cols-2 gap-3 mt-4">';
      log.images.forEach(url => {
        imageGridHtml += `
          <a href="${url}" target="_blank" class="block aspect-[4/3] bg-white rounded-lg overflow-hidden border hover:ring-2 hover:ring-blue-500 transition-all">
            <img src="${toDriveThumbnail(url)}" class="w-full h-full object-contain" loading="lazy">
          </a>
        `;
      });
      imageGridHtml += '</div>';
    }

    reportHtml += `
      <div class="print-item-block p-4 border-b border-slate-200 last:border-b-0">
        <h2 class="font-bold text-lg text-blue-700">${log.site || 'ไม่มีชื่อโครงการ'}</h2>
        <div class="text-sm text-slate-500 space-y-1 mt-1">
          <p><i class="fa-solid fa-calendar-day w-4"></i> <strong>วันที่:</strong> ${new Date(log.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${log.notes ? `<p><i class="fa-solid fa-user-tie w-4"></i> <strong>ผู้สั่งงาน:</strong> ${log.notes}</p>` : ''}
          ${log.detail ? `<p><i class="fa-solid fa-clipboard-list w-4"></i> <strong>รายละเอียด:</strong> ${log.detail}</p>` : ''}
        </div>
        
        <div class="mt-4 pt-4 border-t">
          <p class="font-semibold">รายชื่อคนงานและค่าแรง:</p>
          ${workerListHtml}
          <div class="flex justify-between items-center mt-3 pt-3 border-t border-dashed">
            <span class="font-bold">ยอดรวมสุทธิ:</span>
            <span class="font-bold text-xl text-emerald-600">฿${totalNetWage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>

        ${imageGridHtml}
      </div>
    `;
  });

  reportHtml += '</div>';
  contentDiv.innerHTML = reportHtml;
}

// --- Business Logic Helpers ---
function calculateNetWage(rawWage, type, workerName) {
  // ยอดสุทธิ = ค่าแรงดิบ + โบนัส
  // ถ้าเป็นงานเหมา หรือ คนชื่อ 'เฟิร์น' จะไม่มีโบนัส
  if (type === 'flat' || (workerName && workerName.includes('เฟิร์น'))) {
    return rawWage;
  }
  return rawWage * 1.2; // เพิ่มโบนัส 20%
}

function calculateDeduction(rawWage, type, workerName) {
  // ส่วนนี้คือยอดโบนัส 20% (ไม่ใช่ยอดหัก)
  if (type === 'flat' || (workerName && workerName.includes('เฟิร์น'))) {
    return 0; // ไม่มีโบนัส
  }
  return rawWage * 0.2; // ยอดโบนัส 20%
}

window.editWorker = function(id) {
  const worker = workers.find(w => w.id === id);
  if (worker) {
    document.getElementById('worker-id').value = worker.id;
    document.getElementById('worker-name').value = worker.name;
    document.getElementById('worker-contact').value = worker.contact;
    document.getElementById('worker-wage').value = worker.rate;
    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-user-pen text-amber-500"></i> <span class="text-amber-500">แก้ไขข้อมูลคนงาน</span>`;
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.deleteWorker = function(id) {
  Swal.fire({
    title: 'คุณแน่ใจหรือไม่?',
    text: "ข้อมูลคนงานคนนี้จะถูกลบออกจากระบบ Cloud อย่างถาวร!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoadingOverlay('กำลังลบข้อมูล...');
      await apiCall('deleteWorker', { id });
      workers = workers.filter(w => w.id !== id);
      window.location.reload(); // Reload to reflect changes and prevent event duplication
      Swal.fire('ลบสำเร็จ!', 'ลบรายชื่อคนงานออกจากระบบแล้ว', 'success');
    }
  });
};

window.deleteLog = function(id) {
  Swal.fire({
    title: 'คุณแน่ใจหรือไม่?',
    text: "ใบงานนี้จะถูกลบออกจากระบบ Cloud อย่างถาวร!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoadingOverlay('กำลังลบใบงาน...');
      await apiCall('deleteLog', { id });
      logs = logs.filter(l => l.id !== id);
      window.location.reload(); // Reload to reflect changes and prevent event duplication
      Swal.fire('ลบสำเร็จ!', 'ลบใบงานออกจากระบบแล้ว', 'success');
    }
  });
};

window.editLog = function(id) {
  window.location.href = `daily-log.html?id=${id}`;
};

window.showSelectedImages = function() {
  const selectedIds = Array.from(document.querySelectorAll('.log-checkbox:checked')).map(cb => cb.dataset.id);
  if (selectedIds.length === 0) {
    Swal.fire('ไม่ได้เลือกรายการ', 'กรุณาติ๊กเลือกใบงานที่ต้องการดูรูปภาพอย่างน้อย 1 รายการ', 'warning');
    return;
  }
  
  const idsString = selectedIds.join(',');
  window.location.href = `view-details.html?ids=${idsString}`;
};

window.toggleWorkerInputs = function(workerId) {
  const isChecked = document.getElementById(`check-${workerId}`).checked;
  const wrapper = document.getElementById(`input-wrapper-${workerId}`);
  if (wrapper) {
    wrapper.classList.toggle('hidden', !isChecked);
  }
  // คำนวณยอดรวมใหม่ทุกครั้งที่มีการเปลี่ยนแปลง
  calculateDailyTotal();
}

window.toggleWorkTypeFields = function(workerId, shouldCalculate = true) {
  const type = document.getElementById(`type-${workerId}`).value;
  const divNormal = document.getElementById(`div-normal-${workerId}`);
  const divOt = document.getElementById(`div-ot-${workerId}`);
  const divFlat = document.getElementById(`div-flat-${workerId}`);

  divNormal.classList.toggle('hidden', type === 'flat');
  divOt.classList.toggle('hidden', type === 'flat');
  divFlat.classList.toggle('hidden', type !== 'flat');
  
  if (shouldCalculate) calculateDailyTotal();
};

window.calculateDailyTotal = function() {
  let total = 0;
  workers.forEach(worker => {
    const calcSpan = document.getElementById(`calc-${worker.id}`);
    if (!document.getElementById(`check-${worker.id}`)?.checked) {
      if(calcSpan) calcSpan.textContent = '฿0.00';
      return;
    }

    const type = document.getElementById(`type-${worker.id}`).value;
    let calculatedWage = 0;

    if (type === 'daily') {
      const normalHours = parseFloat(document.getElementById(`normal-${worker.id}`).value) || 0;
      const otHours = parseFloat(document.getElementById(`ot-${worker.id}`).value) || 0;
      const hourlyRate = (worker.rate || 0) / 8;
      calculatedWage = (normalHours * hourlyRate) + (otHours * (hourlyRate * 2));
    } else {
      calculatedWage = parseFloat(document.getElementById(`flat-val-${worker.id}`).value) || 0;
    }
    if(calcSpan) calcSpan.textContent = `฿${calculatedWage.toFixed(2)}`;
    total += calculatedWage;
  });
  document.getElementById('daily-total-display').textContent = `฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

// แปลงลิงก์ Google Drive (เช่น .../file/d/ID/view) ให้เป็นลิงก์รูปที่แสดงผลตรงๆ ได้ในแท็ก <img>
function toDriveThumbnail(url) {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileId = match ? match[1] : null;
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : url;
}