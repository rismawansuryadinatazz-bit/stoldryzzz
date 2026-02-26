
/**
 * StockMaster AI - Google Apps Script Backend
 * Deploy as a Web App with 'Execute as: Me' and 'Who has access: Anyone'
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('StockMaster AI')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = params.action;

  if (action === 'sync_all') {
    const sheetName = params.sheetName;
    const data = params.data;
    
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    sheet.clear();
    
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      sheet.appendRow(headers);
      
      const rows = data.map(item => headers.map(header => item[header]));
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = {};
  
  sheets.forEach(sheet => {
    const name = sheet.getName();
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      const headers = data[0];
      const rows = data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
      result[name] = rows;
    } else {
      result[name] = [];
    }
  });
  
  return result;
}
