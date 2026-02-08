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
  
  // === Case 2: Submit Vote (vote.html) ===
  // Legacy support: checks for 'jokes' or 'ip' keys
  if (params.jokes || params.ip) {
    var ip = params.ip;
    var jokes = params.jokes; // Array of IDs
    
    // Append vote to the end of the sheet
    // Columns: Date, IP, JokeIDs (joined by //)
    sheet.appendRow([new Date(), ip, jokes.join("//")]);
    
    return ContentService.createTextOutput(JSON.stringify({"result":"success"}))
      .setMimeType(ContentService.MimeType.JSON);
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

  // === Case 2: Get Vote Results (vote.html) ===
  if (action === 'getResults') {
    var data = sheet.getDataRange().getValues();
    var voteCounts = {}; 
    
    // Start from row 2 (index 1) to skip header, iterate all rows
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Vote data is expected in Column C (index 2)
      var jokesString = row[2]; 
      
      // Filter out sales rows (which might be at the top) or empty rows
      // Sales rows have numbers in Col B, maybe empty Col C?
      // Or we can just check if col A is NOT one of the sales items?
      // But simpler: if jokesString looks like valid vote data.
      
      if (jokesString && typeof jokesString === 'string') {
        var idList = jokesString.split("//");
        idList.forEach(function(id) {
          if (id) {
            id = id.trim();
            // Basic validation to ensure it's an ID (number)
            if (!isNaN(id)) {
               voteCounts[id] = (voteCounts[id] || 0) + 1;
            }
          }
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(voteCounts))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "Unknown action"}));
}
