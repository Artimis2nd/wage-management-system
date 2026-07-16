// URL ของ Google Apps Script (เราจะนำมาใส่หลังจากตั้งค่าใน Phase 3)
const API_URL = "https://script.google.com/macros/s/AKfycbwg9NWEOtLARxmdPM1CvWiZLUlLAqG_k_WeN2oQ58bgfcjYbqQtHzxhFTvtRtdzACgC/exec";

// โหลดข้อมูลจาก LocalStorage (ระบบสำรองข้อมูลฝั่งเครื่องผู้ใช้)
let workers = JSON.parse(localStorage.getItem('workers')) || [];
let logs = JSON.parse(localStorage.getItem('logs')) || [];

// ตรวจสอบว่าเปิดอยู่หน้าไหน เพื่อเรียกใช้งานฟังก์ชันของหน้านั้นๆ
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const page = path.split("/").pop();

  initGlobalUI();

  if (page === 'index.html' || page === '') {
    initIndexPage();
  } else if (page === 'workers.html') {
    initWorkersPage();
  } else if (page === 'daily-log.html') {
    initDailyLogPage();
  } else if (page === 'multi-log.html') {
    initMultiLogPage();
  } else if (page === 'report.html') {
    initReportPage();
  }
});

// --- 1. ฟังก์ชันส่วนกลาง (Global Helper) ---
function initGlobalUI() {
  // จำลองอัปเดตสถานะการเชื่อมต่อ
  const syncStatus = document.getElementById('sync-status');
  if (syncStatus) {
    syncStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> เชื่อมต่อฐานข้อมูลแล้ว`;
  }
}

function saveToLocalStorage() {
  localStorage.setItem('workers', JSON.stringify(workers));
  localStorage.setItem('logs', JSON.stringify(logs));
}

// --- 2. หน้าหลัก (index.html) ---
function initIndexPage() {
  const totalWorkers = document.getElementById('dash-total-workers');
  const todayJobs = document.getElementById('dash-today-jobs');
  const totalWage = document.getElementById('dash-total-wage');

  if (totalWorkers) totalWorkers.textContent = `${workers.length} คน`;
  if (todayJobs) todayJobs.textContent = `${logs.filter(l => l.date === new Date().toISOString().split('T')[0]).length} รายการ`;
  
  // สรุปยอดเงินรวมสุทธิทั้งหมด
  let sumNet = 0;
  logs.forEach(log => {
    log.details.forEach(det => {
      sumNet += calculateNetWage(det.wageAmount, det.workType, det.workerName);
    });
  });
  if (totalWage) totalWage.textContent = `฿${sumNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// --- 3. หน้าจัดการคนงาน (workers.html) ---
function initWorkersPage() {
  const form = document.getElementById('worker-form');
  const tbody = document.getElementById('workers-table-body');
  const mobileList = document.getElementById('workers-mobile-list');
  const countSpan = document.getElementById('worker-count');
  const btnCancel = document.getElementById('btn-cancel-edit');

  function renderWorkers() {
    tbody.innerHTML = '';
    mobileList.innerHTML = '';
    countSpan.textContent = `${workers.length} คน`;

    if (workers.length === 0) {
      const emptyRow = `<tr><td colspan="4" class="text-center py-8 text-slate-400">ยังไม่มีรายชื่อคนงานในระบบ</td></tr>`;
      tbody.innerHTML = emptyRow;
      mobileList.innerHTML = `<div class="text-center py-8 text-slate-400">ยังไม่มีรายชื่อคนงานในระบบ</div>`;
      return;
    }

    workers.forEach(worker => {
      // แสดงผลบนจอคอมพิวเตอร์ (ตาราง)
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 font-medium text-slate-700">${worker.name}</td>
        <td class="py-3 px-4 text-slate-500">${worker.contact || '-'}</td>
        <td class="py-3 px-4 text-right font-semibold text-blue-600">฿${parseFloat(worker.rate).toFixed(2)}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="editWorker('${worker.id}')" class="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteWorker('${worker.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // แสดงผลบนจอมือถือ (การ์ด)
      const card = document.createElement('div');
      card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2";
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${worker.name}</h4>
            <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone text-[10px]"></i> ${worker.contact || '-'}</p>
          </div>
          <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">฿${parseFloat(worker.rate).toFixed(2)} / วัน</span>
        </div>
        <div class="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button onclick="editWorker('${worker.id}')" class="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
          <button onclick="deleteWorker('${worker.id}')" class="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-medium"><i class="fa-solid fa-trash-can"></i> ลบ</button>
        </div>
      `;
      mobileList.appendChild(card);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('worker-id').value;
    const name = document.getElementById('worker-name').value.trim();
    const contact = document.getElementById('worker-contact').value.trim();
    const rate = parseFloat(document.getElementById('worker-wage').value) || 0;

    if (id) {
      // เคสแก้ไขข้อมูล
      const index = workers.findIndex(w => w.id === id);
      if (index !== -1) {
        workers[index] = { id, name, contact, rate, status: workers[index].status || 'active' };
      }
    } else {
      // เคสเพิ่มใหม่
      workers.push({ id: 'W' + Date.now(), name, contact, rate, status: 'active' });
    }

    saveToLocalStorage();
    renderWorkers();
    form.reset();
    document.getElementById('worker-id').value = '';
    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>เพิ่มคนงานใหม่</span>`;
    btnCancel.classList.add('hidden');
    Swal.fire('บันทึกสำเร็จ!', 'ข้อมูลคนงานถูกเซฟเรียบร้อย', 'success');
  });

  btnCancel.addEventListener('click', () => {
    form.reset();
    document.getElementById('worker-id').value = '';
    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>เพิ่มคนงานใหม่</span>`;
    btnCancel.classList.add('hidden');
  });

  window.editWorker = function(id) {
    const worker = workers.find(w => w.id === id);
    if (worker) {
      document.getElementById('worker-id').value = worker.id;
      document.getElementById('worker-name').value = worker.name;
      document.getElementById('worker-contact').value = worker.contact;
      document.getElementById('worker-wage').value = worker.rate;
      document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-user-pen text-amber-500"></i> <span class="text-amber-500">แก้ไขข้อมูลคนงาน</span>`;
      btnCancel.classList.remove('hidden');
    }
  };

  window.deleteWorker = function(id) {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: "รายชื่อและประวัติของคนงานคนนี้จะหายไปจากเครื่องนี้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ต้องการลบ!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        workers = workers.filter(w => w.id !== id);
        saveToLocalStorage();
        renderWorkers();
        Swal.fire('ลบสำเร็จ!', 'ลบรายชื่อคนงานแล้ว', 'success');
      }
    });
  };

  renderWorkers();
}

// --- 4. หน้าบันทึกงานประจำวัน (daily-log.html) ---
function initDailyLogPage() {
  document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
  const container = document.getElementById('workers-daily-container');
  const totalDisplay = document.getElementById('daily-total-display');
  const form = document.getElementById('daily-log-form');

  function renderDailyWorkers() {
    container.innerHTML = '';
    if (workers.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-center py-6">ไม่มีรายชื่อคนงาน กรุณาเพิ่มคนงานก่อน</p>`;
      return;
    }

    workers.forEach(worker => {
      const row = document.createElement('div');
      row.className = "p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4";
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <input type="checkbox" id="check-${worker.id}" class="worker-checkbox w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300" onchange="calculateDailyTotal()">
          <div>
            <label for="check-${worker.id}" class="font-bold text-slate-800 text-sm cursor-pointer">${worker.name}</label>
            <p class="text-xs text-slate-500">ค่าแรงเริ่มต้น: ฿${worker.rate}/วัน</p>
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

  window.toggleWorkTypeFields = function(workerId) {
    const type = document.getElementById(`type-${workerId}`).value;
    const divNormal = document.getElementById(`div-normal-${workerId}`);
    const divOt = document.getElementById(`div-ot-${workerId}`);
    const divFlat = document.getElementById(`div-flat-${workerId}`);

    if (type === 'flat') {
      divNormal.classList.add('hidden');
      divOt.classList.add('hidden');
      divFlat.classList.remove('hidden');
    } else {
      divNormal.classList.remove('hidden');
      divOt.classList.remove('hidden');
      divFlat.classList.add('hidden');
    }
    calculateDailyTotal();
  };

  window.calculateDailyTotal = function() {
    let total = 0;
    workers.forEach(worker => {
      const isChecked = document.getElementById(`check-${worker.id}`).checked;
      const calcSpan = document.getElementById(`calc-${worker.id}`);
      
      if (!isChecked) {
        calcSpan.textContent = '฿0.00';
        return;
      }

      const type = document.getElementById(`type-${worker.id}`).value;
      let calculatedWage = 0;

      if (type === 'daily') {
        const normalHours = parseFloat(document.getElementById(`normal-${worker.id}`).value) || 0;
        const otHours = parseFloat(document.getElementById(`ot-${worker.id}`).value) || 0;
        
        // อัตราจ้างรายวันคิดที่ 8 ชม.
        const hourlyRate = worker.rate / 8;
        const normalPay = normalHours * hourlyRate;
        const otPay = otHours * (hourlyRate * 2); // OT คูณ 2
        calculatedWage = normalPay + otPay;
      } else {
        calculatedWage = parseFloat(document.getElementById(`flat-val-${worker.id}`).value) || 0;
      }

      calcSpan.textContent = `฿${calculatedWage.toFixed(2)}`;
      total += calculatedWage;
    });

    totalDisplay.textContent = `฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  // จัดการอัปโหลดไฟล์/รูปถ่ายภาพพรีวิว
  const imageInput = document.getElementById('image-files');
  const previewContainer = document.getElementById('image-preview-container');
  imageInput.addEventListener('change', () => {
    previewContainer.innerHTML = '';
    Array.from(imageInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = "relative rounded-xl overflow-hidden border border-slate-200 aspect-square";
        div.innerHTML = `
          <img src="${e.target.result}" class="object-cover w-full h-full">
        `;
        previewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('log-date').value;
    const project = document.getElementById('project-name').value.trim();
    const detail = document.getElementById('work-detail').value.trim();
    const notes = document.getElementById('log-notes').value.trim();

    const selectedDetails = [];
    workers.forEach(worker => {
      const isChecked = document.getElementById(`check-${worker.id}`).checked;
      if (isChecked) {
        const type = document.getElementById(`type-${worker.id}`).value;
        let wageAmount = 0;
        let normalHours = 0;
        let otHours = 0;
        let flatAmount = 0;
        let detailsText = "";

        if (type === 'daily') {
          normalHours = parseFloat(document.getElementById(`normal-${worker.id}`).value) || 0;
          otHours = parseFloat(document.getElementById(`ot-${worker.id}`).value) || 0;
          const hourly = worker.rate / 8;
          wageAmount = (normalHours * hourly) + (otHours * (hourly * 2));
          detailsText = `ปกติ ${normalHours} ชม. / OT ${otHours} ชม.`;
        } else {
          flatAmount = parseFloat(document.getElementById(`flat-val-${worker.id}`).value) || 0;
          wageAmount = flatAmount;
          detailsText = `งานเหมา`;
        }

        selectedDetails.push({
          workerId: worker.id,
          workerName: worker.name,
          workType: type,
          hours: normalHours,
          otHours: otHours,
          maoAmount: flatAmount,
          deduction: calculateDeduction(wageAmount, type, worker.name),
          netWage: calculateNetWage(wageAmount, type, worker.name),
          detailsText: detailsText,
          originalWage: wageAmount
        });
      }
    });

    if (selectedDetails.length === 0) {
      Swal.fire('คำเตือน', 'กรุณาเลือกอย่างน้อยหนึ่งคนงานที่เข้ามาทำงาน', 'warning');
      return;
    }

    // --- ส่วนที่เพิ่มเข้ามา: อ่านไฟล์รูปภาพเป็น Base64 ---
    const imageFiles = document.getElementById('image-files').files;
    const imagePromises = Array.from(imageFiles).map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          // แยกเอาเฉพาะส่วนข้อมูล Base64 ไม่เอาส่วนหัว "data:image/jpeg;base64,"
          const base64String = event.target.result.split(',')[1];
          resolve({
            filename: file.name,
            mimeType: file.type,
            data: base64String
          });
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
    });

    const imagesData = await Promise.all(imagePromises);
    // ----------------------------------------------------

    const logId = 'L' + Date.now();
    logs.push({
      id: logId,
      date,
      project,
      detail,
      notes,
      images: imagesData, // แนบข้อมูลรูปภาพเข้าไปใน log
      details: selectedDetails
    });

    saveToLocalStorage();
    Swal.fire('บันทึกข้อมูลแล้ว!', 'ใบงานประจำวันถูกเซฟและพร้อมที่จะส่งข้อมูลขึ้น Google Sheets', 'success').then(() => {
      window.location.href = 'index.html';
    });
  });

  renderDailyWorkers();
}

// --- 5. หน้าบันทึกงานหลายวัน (multi-log.html) ---
function initMultiLogPage() {
  const tbody = document.getElementById('multi-workers-body');
  const totalDisplay = document.getElementById('multi-total-display');
  const form = document.getElementById('multi-log-form');

  function renderMultiWorkers() {
    tbody.innerHTML = '';
    if (workers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">กรุณาเพิ่มคนงานก่อน</td></tr>`;
      return;
    }

    workers.forEach(worker => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 text-center">
          <input type="checkbox" id="multi-check-${worker.id}" class="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300" onchange="calculateMultiTotal()">
        </td>
        <td class="py-3 px-4 font-semibold text-slate-700">${worker.name}</td>
        <td class="py-3 px-4 text-center">
          <input type="number" id="multi-ratio-${worker.id}" value="1.0" min="0.0" max="2.0" step="0.1" class="w-24 text-center px-2 py-1 rounded-lg border border-slate-300" oninput="calculateMultiTotal()">
        </td>
        <td class="py-3 px-4 text-right text-slate-500">฿${parseFloat(worker.rate).toFixed(2)}</td>
        <td id="multi-calc-${worker.id}" class="py-3 px-4 text-right font-semibold text-slate-700">฿0.00</td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.calculateMultiTotal = function() {
    let total = 0;
    workers.forEach(worker => {
      const isChecked = document.getElementById(`multi-check-${worker.id}`).checked;
      const calcTd = document.getElementById(`multi-calc-${worker.id}`);

      if (!isChecked) {
        calcTd.textContent = '฿0.00';
        return;
      }

      const ratio = parseFloat(document.getElementById(`multi-ratio-${worker.id}`).value) || 0;
      const wage = worker.rate * ratio;
      calcTd.textContent = `฿${wage.toFixed(2)}`;
      total += wage;
    });

    totalDisplay.textContent = `฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  document.getElementById('btn-fill-all-one').addEventListener('click', () => {
    workers.forEach(worker => {
      document.getElementById(`multi-check-${worker.id}`).checked = true;
      document.getElementById(`multi-ratio-${worker.id}`).value = "1.0";
    });
    calculateMultiTotal();
  });

  document.getElementById('btn-clear-all-zero').addEventListener('click', () => {
    workers.forEach(worker => {
      document.getElementById(`multi-check-${worker.id}`).checked = false;
      document.getElementById(`multi-ratio-${worker.id}`).value = "0.0";
    });
    calculateMultiTotal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectName = document.getElementById('multi-project-name').value.trim();
    const startDate = document.getElementById('multi-start-date').value;
    const endDate = document.getElementById('multi-end-date').value;
    const detail = document.getElementById('multi-work-detail').value.trim();
    const notes = document.getElementById('multi-notes').value.trim();

    const selectedDetails = [];
    workers.forEach(worker => {
      const isChecked = document.getElementById(`multi-check-${worker.id}`).checked;
      if (isChecked) {
        const ratio = parseFloat(document.getElementById(`multi-ratio-${worker.id}`).value) || 0;
        const wageAmount = worker.rate * ratio;
        const detailsText = `Timesheet (${ratio} วัน)`;

        selectedDetails.push({
          workerId: worker.id,
          workerName: worker.name,
          workType: 'daily',
          hours: ratio * 8, // แปลงเป็นชั่วโมงทำงานโดยประมาณ
          otHours: 0,
          maoAmount: 0,
          deduction: calculateDeduction(wageAmount, 'daily', worker.name),
          netWage: calculateNetWage(wageAmount, 'daily', worker.name),
          detailsText: detailsText,
          originalWage: wageAmount
        });
      }
    });

    if (selectedDetails.length === 0) {
      Swal.fire('คำเตือน', 'กรุณาเลือกอย่างน้อยหนึ่งคนงานที่เข้ามาทำงาน', 'warning');
      return;
    }

    // บันทึกแยกรายวันแบบจำลองลง LocalStorage
    logs.push({
      id: 'ML' + Date.now(),
      date: `${startDate} ถึง ${endDate}`,
      project: projectName,
      detail: detail,
      notes: notes,
      details: selectedDetails
    });

    saveToLocalStorage();
    Swal.fire('บันทึกช่วงสัญญางานแล้ว!', 'ข้อมูลของงวดงานชุดนี้ถูกจัดเก็บสำเร็จ', 'success').then(() => {
      window.location.href = 'index.html';
    });
  });

  renderMultiWorkers();
}

// --- 6. คำนวณส่วนหัก 20% และยอดรับสุทธิ ---
// เงื่อนไข: หักค่าดำเนินการ 20% ยกเว้นงานเหมา และยกเว้นคนชื่อ "เฟิร์น"
function calculateNetWage(rawWage, type, workerName) {
  if (type === 'flat' || workerName.includes('เฟิร์น')) {
    return rawWage; // ไม่หัก 20%
  }
  return rawWage * 0.8; // หัก 20%
}

function calculateDeduction(rawWage, type, workerName) {
  if (type === 'flat' || workerName.includes('เฟิร์น')) {
    return 0; // ไม่มีส่วนหัก
  }
  return rawWage * 0.2; // ยอดที่โดนหัก 20%
}

// --- 7. หน้าสรุปรายงาน (report.html) ---
function initReportPage() {
  const selectProj = document.getElementById('filter-project');
  const tbody = document.getElementById('report-table-body');
  const btnApply = document.getElementById('btn-apply-filter');
  const btnClear = document.getElementById('btn-clear-filter');
  const btnExport = document.getElementById('btn-export-excel');

  // ดึงรายชื่อโครงการทั้งหมดมาสร้าง Option ใน ตัวกรอง
  const uniqueProjects = [...new Set(logs.map(l => l.project))];
  uniqueProjects.forEach(proj => {
    const opt = document.createElement('option');
    opt.value = proj;
    opt.textContent = proj;
    selectProj.appendChild(opt);
  });

  function processReportData() {
    const projFilter = selectProj.value;
    const startFilter = document.getElementById('filter-start-date').value;
    const endFilter = document.getElementById('filter-end-date').value;

    let filteredLogs = [...logs];

    // ตัวกรองโครงการ
    if (projFilter !== 'all') {
      filteredLogs = filteredLogs.filter(l => l.project === projFilter);
    }

    // ตัวกรองช่วงวันที่
    if (startFilter) {
      filteredLogs = filteredLogs.filter(l => l.date >= startFilter);
    }
    if (endFilter) {
      filteredLogs = filteredLogs.filter(l => l.date <= endFilter);
    }

    // รวมตัวเลข
    let totalRaw = 0;
    let totalSubject = 0;
    let totalDeducted = 0;
    let totalNet = 0;

    // สะสมรายคน
    const workerSummary = {};

    filteredLogs.forEach(log => {
      log.details.forEach(det => {
        const name = det.workerName;
        const wage = det.originalWage;
        const type = det.workType;

        if (!workerSummary[name]) {
          workerSummary[name] = { name, daysCount: 0, rawTotal: 0, typeText: [], deductedTotal: 0, netTotal: 0 };
        }

        workerSummary[name].daysCount += (det.detailsText.includes("Timesheet") ? parseFloat(det.detailsText.replace(/[^0-9.]/g, '')) : 1);
        workerSummary[name].rawTotal += wage;
        
        const ded = calculateDeduction(wage, type, name);
        const net = calculateNetWage(wage, type, name);

        workerSummary[name].deductedTotal += ded;
        workerSummary[name].netTotal += net;
        
        if (!workerSummary[name].typeText.includes(type === 'flat' ? 'งานเหมา' : 'รายวัน')) {
          workerSummary[name].typeText.push(type === 'flat' ? 'งานเหมา' : 'รายวัน');
        }

        totalRaw += wage;
        if (type !== 'flat' && !name.includes('เฟิร์น')) {
          totalSubject += wage;
        }
        totalDeducted += ded;
        totalNet += net;
      });
    });

    // อัปเดต Dashboard
    document.getElementById('rep-raw-wage').textContent = `฿${totalRaw.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('rep-subject-wage').textContent = `฿${totalSubject.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('rep-deducted-amount').textContent = `฿${totalDeducted.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('rep-net-wage').textContent = `฿${totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    // เรนเดอร์ตาราง
    tbody.innerHTML = '';
    const summaryArray = Object.values(workerSummary);
    if (summaryArray.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">ไม่พบข้อมูลตามช่วงเวลาหรือโครงการที่เลือก</td></tr>`;
      return;
    }

    summaryArray.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 font-bold text-slate-700">${row.name}</td>
        <td class="py-3 px-4 text-right">${row.daysCount.toFixed(1)} วัน</td>
        <td class="py-3 px-4 text-right">฿${row.rawTotal.toFixed(2)}</td>
        <td class="py-3 px-4 text-right text-xs"><span class="bg-slate-100 px-2 py-1 rounded">${row.typeText.join(', ')}</span></td>
        <td class="py-3 px-4 text-right text-rose-600 font-medium">-฿${row.deductedTotal.toFixed(2)}</td>
        <td class="py-3 px-4 text-right font-bold text-emerald-600">฿${row.netTotal.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  btnApply.addEventListener('click', processReportData);
  btnClear.addEventListener('click', () => {
    selectProj.value = 'all';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    processReportData();
  });

  // ส่งออก Excel ด้วย SheetJS (Exporting Excel)
  btnExport.addEventListener('click', () => {
    const projFilter = selectProj.value;
    const startFilter = document.getElementById('filter-start-date').value;
    const endFilter = document.getElementById('filter-end-date').value;

    let filteredLogs = [...logs];
    if (projFilter !== 'all') filteredLogs = filteredLogs.filter(l => l.project === projFilter);
    if (startFilter) filteredLogs = filteredLogs.filter(l => l.date >= startFilter);
    if (endFilter) filteredLogs = filteredLogs.filter(l => l.date <= endFilter);

    if (filteredLogs.length === 0) {
      Swal.fire('ไม่มีข้อมูล', 'ไม่มีข้อมูลรายงานให้ส่งออกในขณะนี้', 'warning');
      return;
    }

    const dataForExcel = [];
    // หัวตารางของ Excel
    dataForExcel.push(["วันที่ทำใบงาน", "ไซต์งาน/โครงการ", "รายละเอียดงาน", "ชื่อคนงาน", "ประเภทงาน", "รายละเอียดชั่วโมง/วัน", "ค่าแรงดิบ (บาท)", "ส่วนต่างหัก 20% (บาท)", "ยอดจ่ายสุทธิ (บาท)"]);

    filteredLogs.forEach(log => {
      log.details.forEach(det => {
        const raw = det.originalWage;
        const ded = calculateDeduction(raw, det.workType, det.workerName);
        const net = calculateNetWage(raw, det.workType, det.workerName);

        dataForExcel.push([
          log.date,
          log.project,
          log.detail || "-",
          det.workerName,
          det.workType === 'flat' ? 'งานเหมา' : 'รายวัน',
          det.detailsText,
          raw,
          ded,
          net
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "สรุปงวดค่าแรงคนงาน");
    XLSX.writeFile(workbook, `สรุปงวดงาน_${projFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    Swal.fire('ส่งออกสำเร็จ!', 'ดาวน์โหลดไฟล์สรุปงวดงาน Excel เรียบร้อยแล้ว', 'success');
  });

  processReportData();
}

// ==========================================================================
// ส่วนเพิ่มเติมใน Phase 3.5: ฟังก์ชันเชื่อมต่อ Google Sheets API และซิงค์ข้อมูล
// วางต่อท้ายไฟล์ js/app.js ของคุณ
// ==========================================================================

/**
 * ฟังก์ชันดึงข้อมูลล่าสุดทั้งหมดจาก Google Sheets มาเซฟลงเครื่อง (LocalStorage)
 * @returns {Promise<boolean>}
 */
async function pullDataFromCloud() {
  if (API_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL" || !API_URL) {
    console.warn("ยังไม่ได้ตั้งค่า Web App URL จริง ระบบจะทำงานในโหมดออฟไลน์ชั่วคราว");
    return false;
  }

  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (data.status === "success") {
      workers = data.workers || [];
      logs = data.logs || [];
      saveToLocalStorage();
      return true;
    } else {
      console.error("เซิร์ฟเวอร์ส่งข้อผิดพลาดกลับมา:", data.message);
      return false;
    }
  } catch (error) {
    console.error("ไม่สามารถเชื่อมต่อฐานข้อมูล Cloud ได้:", error);
    return false;
  }
}

/**
 * ฟังก์ชันส่งข้อมูลที่มีการเปลี่ยนแปลงบนเครื่อง ขึ้นไปเซฟทับบน Google Sheets
 * @returns {Promise<boolean>}
 */
async function pushDataToCloud() {
  if (API_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL" || !API_URL) {
    Swal.fire("โหมดออฟไลน์", "ระบบยังไม่ได้ระบุ Web App URL ตัวจริง จึงบันทึกได้เฉพาะในคอมพิวเตอร์ของคุณเท่านั้น", "info");
    return false;
  }

  try {
    // แสดงกล่องข้อความจำลองขณะกำลังอัปโหลดข้อมูล
    Swal.fire({
      title: 'กำลังเชื่อมโยงข้อมูล...',
      text: 'กรุณารอสักครู่ ระบบกำลังจัดเก็บข้อมูลขึ้น Google Sheets บนระบบคลาวด์',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const payload = {
      action: "sync_all",
      workers: workers,
      logs: logs
    };

    const response = await fetch(API_URL, {
      method: "POST",
      // mode: "no-cors", // <--- เอาออก! การใช้ no-cors ทำให้ส่งข้อมูลขนาดใหญ่ (เช่น รูปภาพ) ไม่ได้
      headers: {
        // ไม่ต้องระบุ Content-Type, fetch จะจัดการให้เองเมื่อ body เป็น text
      },
      body: JSON.stringify(payload),
      // เพิ่ม redirect: "follow" เพื่อให้ทำงานกับ Apps Script ที่มีการ redirect ได้ถูกต้อง
      redirect: "follow"
    });

    // เมื่อเอา no-cors ออก เราจะสามารถอ่าน response จริงๆ จาก server ได้
    const result = await response.json();

    Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ!',
      text: 'ข้อมูลทั้งหมดเชื่อมโยงกับฐานข้อมูล Google Sheets เรียบร้อยแล้ว',
      timer: 2000,
      showConfirmButton: false
    });
    
    return true;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการซิงค์ข้อมูล:", error);
    Swal.fire("เชื่อมต่อล้มเหลว", "ไม่สามารถอัปเดตข้อมูลขึ้นระบบคลาวด์ได้ในขณะนี้", "error");
    return false;
  }
}

// อัปเดตส่วนควบคุมหน้าหลัก (แก้ไขต่อเข้ากับฟังก์ชันสตรีมมิ่งในหน้าแรก)
const originalInitIndexPage = initIndexPage;
initIndexPage = async function() {
  originalInitIndexPage(); // เรียกใช้ฟังก์ชันเดิมเพื่อแสดงข้อมูล Local ก่อนอย่างรวดเร็ว
  
  // พยายามอัปเดตข้อมูลล่าสุดจาก Google Sheets มาทับ
  const syncStatus = document.getElementById('sync-status');
  if (syncStatus) {
    syncStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> กำลังดึงข้อมูลคลาวด์...`;
  }
  
  const isPulled = await pullDataFromCloud();
  if (isPulled) {
    originalInitIndexPage(); // แสดงค่าใหม่อีกครั้งเมื่อดึงสำเร็จ
    if (syncStatus) {
      syncStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> ข้อมูลเป็นปัจจุบัน`;
    }
  } else {
    if (syncStatus) {
      syncStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span> โหมดออฟไลน์`;
    }
  }
};

// นำฟังก์ชันอัปเดตระบบอัตโนมัติไปผูกกับปุ่มบันทึก
const originalSaveToLocalStorage = saveToLocalStorage;
saveToLocalStorage = function() {
  originalSaveToLocalStorage();
  // ส่งข้อมูลขึ้นคลาวด์แบบอัตโนมัติหลังบันทึกทุกครั้งที่มีสัญญาณเครือข่าย
  pushDataToCloud();
};