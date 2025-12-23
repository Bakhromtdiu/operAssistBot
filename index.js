import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { google } from "googleapis";
import { handleRequest } from "./sheets.js"; // adjust if your function name is different

// Recreate service account file from Render environment variable
if (process.env.SERVICE_ACCOUNT_JSON) {
  const json = Buffer.from(process.env.SERVICE_ACCOUNT_JSON, "base64").toString();
  fs.writeFileSync("service-account.json", json);
}

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// Telegram bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Example: forward all messages to your sheets.js handler
bot.on("message", async (msg) => {
  try {
    const response = await handleRequest(sheets, msg);
    if (response) {
      bot.sendMessage(msg.chat.id, response);
    }
  } catch (err) {
    console.error("Error:", err);
    bot.sendMessage(msg.chat.id, "An error occurred.");
  }
});
