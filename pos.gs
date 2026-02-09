function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = JSON.parse(e.postData.contents);

  // === Case 1: Update Sales Data (pos.html) ===
  if (params.action === 'updateSales') {
    var salesData = params.sales; // e.g., { "爆米花大份": 10, ... }
    
    // Use LockService to prevent race conditions during updates
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // Wait up to 10 seconds
    } catch (e) {
      return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "Loop busy"}));
    }

    try {
      var data = sheet.getDataRange().getValues();
      // Iterate through rows to find the items and update column B
      for (var i = 0; i < data.length; i++) {
        var rowName = data[i][0];
        if (salesData[rowName] !== undefined) {
          // Update Column B (Index 2 in 1-based notation), Row is i+1
          sheet.getRange(i + 1, 2).setValue(salesData[rowName]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"result": "success"}));
    } catch (error) {
       return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": error.toString()}));
    } finally {
      lock.releaseLock();
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "Invalid action"}));
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var action = e.parameter.action;

  // === Case 1: Get Sales Data (index.html & pos.html) ===
  if (action === 'getSales') {
    var data = sheet.getDataRange().getValues();
    var salesData = {};
    var targetItems = ["爆米花大份", "爆米花小份", "碳酸飲", "超值組合"];
    
    // Search for sales items in Column A
    for (var i = 0; i < data.length; i++) {
      var itemName = data[i][0];
      if (targetItems.indexOf(itemName) > -1) {
        salesData[itemName] = data[i][1];
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(salesData))
      .setMimeType(ContentService.MimeType.JSON);
  }  
  return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "Unknown action"}));
}
