// Global State
let workers = [];
let logs = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  showLoadingOverlay('กำลังโหลดข้อมูล...');

  // Fetch fresh data from the cloud on every page load
  const cloudData = await pullAllData();
  if (cloudData) {
    workers = cloudData.workers;
    logs = cloudData.logs;
  } else {
    // Handle case where data cannot be fetched
    workers = [];
    logs = [];
  }

  // Initialize page events and render data AFTER data is fetched
  routePage(true);
  hideLoadingOverlay();
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

// --- PAGE INITIALIZERS ---

function initIndexPage(runSetup) {
  const totalWorkersEl = document.getElementById('dash-total-workers');
  const totalLogsEl = document.getElementById('dash-total-logs');
  const totalWagesEl = document.getElementById('dash-total-wages');
  const tableBody = document.getElementById('logs-table-body');
  const mobileList = document.getElementById('logs-mobile-list');
  const searchInput = document.getElementById('search-logs');
  const refreshBtn = document.getElementById('btn-refresh');
  
  if (!totalWorkersEl) return; // Exit if not on the index page

  function renderLogs(logsToRender) {
    if (!tableBody || !mobileList) return;

    tableBody.innerHTML = '';
    mobileList.innerHTML = '';

    if (logsToRender.length === 0) {
      const emptyHtml = `<td colspan="6" class="text-center py-8 text-slate-400">ไม่พบรายการบันทึก</td>`;
      tableBody.innerHTML = `<tr>${emptyHtml}</tr>`;
      mobileList.innerHTML = `<div class="text-center py-8 text-slate-400">ไม่พบรายการบันทึก</div>`;
      return;
    }

    const sortedLogs = [...logsToRender].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedLogs.forEach(log => {
      const totalWage = log.details.reduce((sum, det) => sum + (det.originalWage || 0), 0);
      const workerCount = log.details.length;

      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4">${new Date(log.date).toLocaleDateString('th-TH')}</td>
        <td class="py-3 px-4 font-medium text-slate-700">${log.site || '-'}</td>
        <td class="py-3 px-4 text-slate-500">${log.detail || '-'}</td>
        <td class="py-3 px-4 text-center">${workerCount} คน</td>
        <td class="py-3 px-4 text-right font-semibold text-emerald-600">฿${totalWage.toFixed(2)}</td>
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
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xs text-slate-500">${new Date(log.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <h4 class="font-bold text-slate-800 text-sm mt-1">${log.site || 'ไม่มีชื่อโครงการ'}</h4>
            <p class="text-xs text-slate-500">${log.detail || '-'}</p>
          </div>
          <span class="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">฿${totalWage.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-slate-100">
          <span class="text-xs text-slate-400">${workerCount} คนทำงาน</span>
          <div class="flex gap-2">
            <button onclick="editLog('${log.id}')" class="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
            <button onclick="deleteLog('${log.id}')" class="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-trash-can"></i> ลบ</button>
          </div>
        </div>
      `;
      mobileList.appendChild(card);
    });
  }

  if (totalWorkersEl) totalWorkersEl.textContent = `${workers.length} คน`;
  if (totalLogsEl) totalLogsEl.textContent = `${logs.length} รายการ`;
  let sumNet = logs.reduce((total, log) => total + log.details.reduce((subTotal, det) => subTotal + (det.netWage || 0), 0), 0);
  if (totalWagesEl) totalWagesEl.textContent = `฿${sumNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  
  if (runSetup) {
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = logs.filter(l => (l.site && l.site.toLowerCase().includes(searchTerm)) || (l.detail && l.detail.toLowerCase().includes(searchTerm)));
        renderLogs(filtered);
      });
    }
    if (refreshBtn) refreshBtn.addEventListener('click', () => window.location.reload());
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
          <input type="checkbox" id="check-${worker.id}" class="worker-checkbox w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300" onchange="calculateDailyTotal()">
          <div>
            <label for="check-${worker.id}" class="font-bold text-slate-800 text-sm cursor-pointer">${worker.name}</label>
            <p class="text-xs text-slate-500">ค่าแรงเริ่มต้น: ฿${parseFloat(worker.rate || 0).toFixed(2)}/วัน</p>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-2 w-full md:w-auto">
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">ประเภทงาน</label>
            <select id="type-${worker.id}" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white" onchange="toggleWorkTypeFields('${worker.id}')">
              <option value="daily">รายวัน</option>
              <option value="flat">งานเหมา</option>
            </select>
          </div>
          <div id="div-normal-${worker.id}">
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">ชม.ปกติ (สูงสุด 8)</label>
            <input type="number" id="normal-${worker.id}" value="8" min="0" max="8" step="0.5" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300" oninput="calculateDailyTotal()">
          </div>
          <div id="div-ot-${worker.id}">
            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">ชม. OT (คูณ 2)</label>
            <input type="number" id="ot-${worker.id}" value="0" min="0" step="0.5" class="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300" oninput="calculateDailyTotal()">
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
    document.getElementById('log-date').value = log.date.split('T')[0];
    document.getElementById('project-name').value = log.site;
    document.getElementById('work-detail').value = log.detail;
    document.getElementById('log-notes').value = log.notes;

    // ติ๊กเลือกคนงานและเติมข้อมูลของแต่ละคน
    log.details.forEach(det => {
      const workerCheckbox = document.getElementById(`check-${det.workerId}`);
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
  const projectFilterBtn = document.getElementById('project-filter-btn');
  const projectFilterDropdown = document.getElementById('project-filter-dropdown');
  const projectFilterOptions = document.getElementById('project-filter-options');
  const projectFilterText = document.getElementById('project-filter-text');
  const projectFilterCloseBtn = document.getElementById('project-filter-close-btn');
  const btnApply = document.getElementById('btn-apply-filter');
  const btnClear = document.getElementById('btn-clear-filter');
  const btnExport = document.getElementById('btn-export-excel');
  const reportTbody = document.getElementById('report-table-body');

  if (runSetup && !projectFilterBtn) return;

  // --- Setup Project Filter Dropdown ---
  const uniqueProjects = [...new Set(logs.map(l => l.site).filter(Boolean))];
  projectFilterOptions.innerHTML = ''; // Clear previous options

  uniqueProjects.forEach(project => {
    const optionHtml = `
      <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
        <input type="checkbox" value="${project}" class="project-filter-checkbox w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500 border-slate-300">
        <span class="text-sm font-medium text-slate-700">${project}</span>
      </label>
    `;
    projectFilterOptions.insertAdjacentHTML('beforeend', optionHtml);
  });

  if (runSetup) {
    console.log("Setting up Report Page events");
  const toggleDropdown = () => projectFilterDropdown.classList.toggle('hidden');
  projectFilterBtn.addEventListener('click', toggleDropdown);
  projectFilterCloseBtn.addEventListener('click', toggleDropdown);

  // Update button text when checkboxes change
  projectFilterOptions.addEventListener('change', () => {
    const checked = projectFilterOptions.querySelectorAll('.project-filter-checkbox:checked');
    if (checked.length === 0) {
      projectFilterText.textContent = '-- โครงการทั้งหมด --';
    } else if (checked.length === 1) {
      projectFilterText.textContent = checked[0].value;
    } else {
      projectFilterText.textContent = `${checked.length} โครงการที่เลือก`;
    }
  });

  // Close dropdown if clicked outside
  document.addEventListener('click', (event) => {
    if (!projectFilterBtn.contains(event.target) && !projectFilterDropdown.contains(event.target)) {
      projectFilterDropdown.classList.add('hidden');
    }
  });

  function processReportData() {
    const checkedProjects = [...projectFilterOptions.querySelectorAll('.project-filter-checkbox:checked')].map(cb => cb.value);
    const startFilter = document.getElementById('filter-start-date').value;
    const endFilter = document.getElementById('filter-end-date').value;

    let filteredLogs = logs.filter(log => {
      const projectMatch = checkedProjects.length === 0 || checkedProjects.includes(log.site);
      const date = log.date.split('T')[0];
      const startDateMatch = !startFilter || date >= startFilter;
      const endDateMatch = !endFilter || date <= endFilter;
      return projectMatch && startDateMatch && endDateMatch;
    });

    const workerSummary = {};
    let totalRaw = 0, totalSubject = 0, totalDeducted = 0, totalNet = 0;

    filteredLogs.forEach(log => {
      log.details.forEach(det => {
        const name = det.workerName;
        if (!workerSummary[name]) {
          workerSummary[name] = { name, daysCount: 0, rawTotal: 0, typeText: new Set(), deductedTotal: 0, netTotal: 0 };
        }
        
        const raw = det.originalWage || 0;
        const ded = det.deduction || 0;
        const net = det.netWage || 0;

        workerSummary[name].daysCount += (det.detailsText.includes("Timesheet") ? parseFloat(det.detailsText.replace(/[^0-9.]/g, '')) : 1);
        workerSummary[name].rawTotal += raw;
        workerSummary[name].deductedTotal += ded;
        workerSummary[name].netTotal += net;
        workerSummary[name].typeText.add(det.workType === 'flat' ? 'งานเหมา' : 'รายวัน');

        totalRaw += raw;
        if (det.workType !== 'flat' && !name.includes('เฟิร์น')) totalSubject += raw;
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
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 font-bold text-slate-700">${row.name}</td>
        <td class="py-3 px-4 text-right">${row.daysCount.toFixed(1)} วัน</td>
        <td class="py-3 px-4 text-right">฿${row.rawTotal.toFixed(2)}</td>
        <td class="py-3 px-4 text-right text-xs"><span class="bg-slate-100 px-2 py-1 rounded">${[...row.typeText].join(', ')}</span></td>
        <td class="py-3 px-4 text-right text-rose-600 font-medium">-฿${row.deductedTotal.toFixed(2)}</td>
        <td class="py-3 px-4 text-right font-bold text-emerald-600">฿${row.netTotal.toFixed(2)}</td>
      `;
      reportTbody.appendChild(tr);
    });
  }

  btnApply.addEventListener('click', processReportData);
  btnClear.addEventListener('click', () => {
    projectFilterOptions.querySelectorAll('.project-filter-checkbox:checked').forEach(cb => cb.checked = false);
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    projectFilterText.textContent = '-- โครงการทั้งหมด --';
    processReportData();
  });

  btnExport.addEventListener('click', () => {
    const dataForExcel = [["วันที่ทำใบงาน", "ไซต์งาน/โครงการ", "รายละเอียดงาน", "ชื่อคนงาน", "ประเภทงาน", "รายละเอียดชั่วโมง/วัน", "ค่าแรงดิบ (บาท)", "ส่วนต่างหัก 20% (บาท)", "ยอดจ่ายสุทธิ (บาท)", "ลิงก์รูปภาพ"]];
    const checkedProjects = [...projectFilterOptions.querySelectorAll('.project-filter-checkbox:checked')].map(cb => cb.value);
    const startFilter = document.getElementById('filter-start-date').value;
    const endFilter = document.getElementById('filter-end-date').value;

    let filteredLogs = logs.filter(log => {
      const projectMatch = checkedProjects.length === 0 || checkedProjects.includes(log.site);
      const date = log.date.split('T')[0];
      const startDateMatch = !startFilter || date >= startFilter;
      const endDateMatch = !endFilter || date <= endFilter;
      return projectMatch && startDateMatch && endDateMatch;
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
