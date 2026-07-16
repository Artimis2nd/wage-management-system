// 🔴 วาง URL ของ Web App ใหม่ที่คุณได้จากขั้นตอนที่ 1 ตรงนี้ 🔴
const API_URL = "YOUR_NEW_WEB_APP_URL_FROM_STEP_4";

/**
 * ฟังก์ชันกลางสำหรับส่งข้อมูลไปที่ Google Apps Script
 * @param {string} action - คำสั่งที่จะให้ Apps Script ทำงาน เช่น 'addLog', 'deleteWorker'
 * @param {object} data - ข้อมูลที่จะส่งไปพร้อมกับคำสั่ง
 * @returns {Promise<object>} - ผลลัพธ์ที่ได้จากเซิร์ฟเวอร์
 */
async function apiCall(action, data) {
  if (!API_URL || API_URL === "YOUR_NEW_WEB_APP_URL") {
    throw new Error("API_URL is not configured.");
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      redirect: "follow",
      body: JSON.stringify({ action, data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(`API Error: ${result.message}`);
    }
    
    return result.data;

  } catch (error) {
    console.error(`API call failed for action "${action}":`, error);
    Swal.fire("เชื่อมต่อล้มเหลว", error.message, "error");
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * ดึงข้อมูลทั้งหมดจาก Cloud (Workers และ Logs)
 */
async function pullAllData() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    if (result.status === 'error') throw new Error(`API Error: ${result.message}`);

    return { workers: result.workers || [], logs: result.logs || [] };

  } catch (error) {
    console.error("Failed to pull data from cloud:", error);
    Swal.fire("ดึงข้อมูลล้มเหลว", error.message, "error");
    return null;
  }
}
