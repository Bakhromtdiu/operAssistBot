const { google } = require('googleapis');
const { Telegraf } = require('telegraf');
const bot = new Telegraf('8492976517:AAEbaUY70lzQRUXWcTzJWCaF31-gZ24tNfs');


const TOGGLE_VALUES = {
  Type: ['Owner(OO)', 'Company(C)', 'Lease(LO)','Lease-Purchase(LP)','Owners-Driver(OO/C)','Co-Driver'],
  DrugTest: ['No', 'Done','Awaiting'],
  RoadTest: ['NDY', 'Pass','Failed','Re-Test','In-progress'],
  PreEmp: ['Done', 'In-Progress', 'NSY'],
  Orientation: ['NSY', 'Done','In-pogress'],
};

async function getSheetsService() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json', // path to your service account JSON
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}





const SPREADSHEET_ID = '1ADTK8gzfH52PgMp0MZQHXBDEOCw3NGPWqNgcVHzgARs';
const SHEET_NAME = 'Martian Express Co';

async function getSheetData() {
  const sheets = await getSheetsService();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:Z`,
  });

  const values = res.data.values || [];

  // If sheet is empty
  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headers, ...rows] = values;

  // Stop at first blank row
  const trimmedRows = [];
  for (const row of rows) {
    if (!row || row.length === 0 || row.every(cell => cell === "")) {
      break; // stop reading table
    }
    trimmedRows.push(row);
  }
  //console.log("RAW values:",headers,trimmedRows);

  return { headers, rows: trimmedRows };
}




// --- WRITE ---
async function updateSheetCell(row, col, value) {
  const sheets = await getSheetsService();
  const range = `${SHEET_NAME}!${columnToLetter(col)}${row}`; // e.g. "Sheet1!E2"
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[value]],
    },
  });

  console.log(`Updated ${range} → ${value}`);
}

// Helper: convert column number to letter (1 → A, 2 → B, etc.)
function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    let remainder = (col - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

bot.start((ctx) => {   
  ctx.reply("Choose an option:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔍 Search by Name", callback_data: "search_by_name" },
          { text: "📋 List of Users", callback_data: "list_users" }
        ],
        [
          {text:"category",callback_data:"category_menu"}
        ]
      ]
    }
  });
});

// Handle text input for search
bot.on("text", async (ctx) => {
  const name = ctx.message.text.trim();
  const { headers, rows } = await getSheetData();
  const nameIndex = 2; // assuming column 1 = Driver Name

  const row = rows.find(r => r[nameIndex].toLowerCase() === name.toLowerCase());
  if (!row) return ctx.reply(`❌ Name "${name}" not found`);

  await ctx.reply("✅ Found user:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: row[nameIndex],
            callback_data: JSON.stringify({ id: row[0], name: row[nameIndex] })
          }
        ]
      ]
    }
  });
});

// Unified callback handler
bot.on("callback_query", async (ctx) => {     
  const action = ctx.callbackQuery.data;

  try {
    // --- Main menu ---
    if (action === "main_menu") {     
      await ctx.editMessageText("Choose an option:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔍 Search by Name", callback_data: "search_by_name" },
              { text: "📋 List of Users", callback_data: "list_users" }
            ],
             [
          {text:"category",callback_data:"category_menu"}
            ]
          ]
        }
      });
      return ctx.answerCbQuery();
    }

    // --- Search by name ---
    if (action === "search_by_name") {
      await ctx.reply("Please type the name you want to search:");
      return ctx.answerCbQuery();
    }

    if (action === "category_menu") {
    const categoryButtons = [
    [{ text: "Type", callback_data: "cat_Type"}],
    [{ text: "DrugTest", callback_data: "cat_DrugTest"}],
    [{ text: "RoadTest", callback_data: "cat_RoadTest"}],
    [{ text: "PreEmp", callback_data: "cat_PreEmp"}],
    [{ text: "Orientation", callback_data: "cat_Orientation"}],
    [{ text: "🔙 Back", callback_data: "main_menu" }]
  ];
  await ctx.editMessageText("Select a category:", {
    reply_markup: { inline_keyboard: categoryButtons }
  });
  return ctx.answerCbQuery();
}


if (action.startsWith("cat_")) {
  const column = action.replace("cat_", ""); // e.g. "Orientation"

  const { headers, rows } = await getSheetData();

  // Find column index
  const colIndex = headers.indexOf(column);
  if (colIndex === -1) {
    await ctx.reply(`Column "${column}" not found in sheet`);
    return ctx.answerCbQuery();
  }

  // Build text output
  let text = `📂 *${column}*\n\n`;

  rows.forEach(row => {
    const name = row[2];      // adjust if needed
    const value = row[colIndex] || "—";
    text += `• ${name}: *${value}*\n`;
  });

  // Send the text + buttons
  await ctx.replyWithMarkdown(text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Back", callback_data: "category_menu" }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
      ]
    }
  });

  return ctx.answerCbQuery();
}
    // --- List users ---
    if (action === "list_users") {
      const { headers, rows } = await getSheetData();
      const nameIndex = 2;

      const buttons = rows.map(row => [
        {
          text: row[nameIndex],
          callback_data: JSON.stringify({ id: row[0], name: row[nameIndex] })
        }
      ]);

      await ctx.editMessageText("📋 Select a user:", {
        reply_markup: { inline_keyboard: buttons }
      });
      return ctx.answerCbQuery();
    }

    // --- User selected ---
 // --- Try to parse JSON safely ---
  let data = null;
   try {
   data = JSON.parse(action);
   }catch (e) {} 
   // action is NOT JSON → skip JSON logic }
  if (data.name && !data.column && !data.value) {
  const { headers, rows } = await getSheetData();
  const rowIndex = rows.findIndex(r => r[0] === data.id);
  if (rowIndex === -1) return ctx.answerCbQuery("Row not found");

  const row = rows[rowIndex];

  const buttons = headers.slice(1).map((header, i) => ({
    text: `${header}: ${row[i + 1]}`,
    callback_data: JSON.stringify({ id: data.id, column: header })
  }));

  buttons.push(
    { text: "🔙 Back", callback_data: "list_users" },
    { text: "🏠 Main Menu", callback_data: "main_menu" }
  );

  await ctx.editMessageText(`Row for ${data.name} (ID: ${data.id})`, {
    reply_markup: { inline_keyboard: buttons.map(b => [b]) }
  });

  return ctx.answerCbQuery();
}

if (data.value) {
  const { headers, rows } = await getSheetData();

  const rowIndex = rows.findIndex(r => r[0] === data.id);
  if (rowIndex === -1) return ctx.answerCbQuery("Row not found");

  const colIndex = headers.indexOf(data.column);
  if (colIndex === -1) return ctx.answerCbQuery("Column not found");

  await updateSheetCell(rowIndex + 2, colIndex + 1, data.value);

  // re-fetch to show updated values (important)
  const refreshed = await getSheetData();
  const row = refreshed.rows[rowIndex];

  const buttons = refreshed.headers.slice(1).map((header, i) => ({
    text: `${header}: ${row[i + 1]}`,
    callback_data: JSON.stringify({ id: data.id, column: header })
  }));

  buttons.push(
    { text: "🔙 Back", callback_data: "list_users" },
    { text: "🏠 Main Menu", callback_data: "main_menu" }
  );

  await ctx.editMessageText(`Row ${data.id}`, {
    reply_markup: { inline_keyboard: buttons.map(b => [b]) }
  });

  return ctx.answerCbQuery(`Updated ${data.column} → ${data.value}`);
}

// 3) Column clicked (has column, no value)
if (data.column) {
  const options = TOGGLE_VALUES[data.column];
  if (!options) return ctx.answerCbQuery("No options for this column");

  const valueButtons = options.map(val => [{
    text: val,
    callback_data: JSON.stringify({ id: data.id, column: data.column, value: val })
  }]);

  // optional navigation:
  valueButtons.push(
    [{ text: "🔙 Back", callback_data: JSON.stringify({ id: data.id, name: data.name || "User" }) }],
    [{ text: "🏠 Main Menu", callback_data: "main_menu" }]
  );

  await ctx.editMessageText(`Select new value for ${data.column}:`, {
    reply_markup: { inline_keyboard: valueButtons }
  });

  return ctx.answerCbQuery();
}

} catch (err) {
    console.error(err);
    ctx.answerCbQuery("Error handling callback");
}
});
bot.launch();










