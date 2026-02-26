
/**
 * StockMaster AI - Professional Cloud Sync Service
 */

// URL yang diberikan oleh user sebagai database utama
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzKZrA85qv7dtpWjG7NxK_eouTdenYp6UQuURtmWXyc2qHNhJTNJjismf18Izh1kIxG/exec';

let SCRIPT_URL = localStorage.getItem('google_sheet_url') || DEFAULT_URL;

// Pastikan localStorage terisi jika belum ada
if (!localStorage.getItem('google_sheet_url')) {
  localStorage.setItem('google_sheet_url', DEFAULT_URL);
}

export const setSheetUrl = (url: string) => {
  localStorage.setItem('google_sheet_url', url);
  SCRIPT_URL = url;
};

export const getSheetUrl = () => SCRIPT_URL;

/**
 * Sinkronisasi Data ke Cloud
 */
export const syncToCloud = async (inventory: any[], transactions: any[]) => {
  if (!SCRIPT_URL) return { success: false, message: "URL Cloud tidak tersedia" };

  try {
    const payload = {
      action: 'sync_all',
      inventory: inventory,
      transactions: transactions,
      timestamp: new Date().toISOString()
    };

    // Menggunakan fetch dengan mode no-cors untuk kestabilan request ke Apps Script
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return { success: true };
  } catch (error) {
    console.error("Cloud Sync Error:", error);
    return { success: false, message: "Gagal terhubung ke Cloud" };
  }
};

/**
 * Mengambil data dari Cloud (Database Google Sheets)
 */
export const fetchFromCloud = async () => {
  if (!SCRIPT_URL) return null;
  try {
    const response = await fetch(`${SCRIPT_URL}?action=get_data`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Cloud Fetch Error:", error);
    return null;
  }
};

export const getGoogleScriptCode = () => {
  return `/**
 * BACKEND SCRIPT UNTUK GOOGLE SHEETS
 * Versi Professional Database
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'get_data') {
    const invSheet = getOrCreateSheet(ss, 'Inventory');
    const transSheet = getOrCreateSheet(ss, 'Transactions');
    
    return ContentService.createTextOutput(JSON.stringify({
      inventory: sheetToObjects(invSheet),
      transactions: sheetToObjects(transSheet)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  
  if (data.action === 'sync_all') {
    updateSheet(ss, 'Inventory', data.inventory);
    updateSheet(ss, 'Transactions', data.transactions);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  }
}

function updateSheet(ss, name, data) {
  const sheet = getOrCreateSheet(ss, name);
  sheet.clear();
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    sheet.appendRow(headers);
    const rows = data.map(item => headers.map(h => {
      const val = item[h];
      return (val !== null && typeof val === 'object') ? JSON.stringify(val) : val;
    }));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function sheetToObjects(sheet) {
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return [];
  const headers = vals[0];
  return vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      try { val = JSON.parse(val); } catch(e) {}
      obj[h] = val;
    });
    return obj;
  });
}`;
};
