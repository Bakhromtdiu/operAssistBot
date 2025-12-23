import { Telegraf } from "telegraf";
import fs from "fs";
import { google } from "googleapis";
import { handleRequest } from "./sheets.js"; // adjust if needed

// Recreate service account file from base64 env variable
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

// Telegram bot setup
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("text", async (ctx) => {
  try {
    const response = await handleRequest(sheets, ctx.message);
    if (response) {
      await ctx.reply(response);
    }
  } catch (err) {
    console.error("Bot error:", err);
    await ctx.reply("An error occurred.");
  }
});

bot.launch();
