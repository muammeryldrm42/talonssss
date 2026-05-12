import { definePlugin, defineTool, defineAgent, inputSchema } from "@open-talons/plugin-sdk";
import { sendTelegramMessage, sendTelegramAlert, sendCryptoReport, getTelegramBotInfo } from "./tools";

export default definePlugin({
  name: "@open-talons/plugin-telegram", version: "1.0.0", author: "Talons Protocol",
  description: "Telegram bot — send messages, alerts, reports", license: "MIT",
  tools: [
    defineTool({ name: "telegram_send", description: "Send Telegram message", inputSchema: inputSchema({ message: { type: "string", description: "Message text" }, chat_id: { type: "string", description: "Optional chat ID" } }, ["message"]), handler: async (i) => sendTelegramMessage(i.message as string, i.chat_id as string || undefined), category: "telegram", permission: "external" }),
    defineTool({ name: "telegram_alert", description: "Send typed alert (price, signal, news)", inputSchema: inputSchema({ type: { type: "string", description: "price|signal|news|custom" }, data: { type: "string", description: "JSON or string" } }, ["type", "data"]), handler: async (i) => { let d = {}; try { d = JSON.parse(i.data as string); } catch { d = { message: i.data }; } return sendTelegramAlert(i.type as any, d as any); }, category: "telegram", permission: "external" }),
    defineTool({ name: "telegram_crypto_report", description: "Send formatted crypto report", inputSchema: inputSchema({ coin: { type: "string", description: "Coin" }, price_data: { type: "string", description: "JSON" }, technical_data: { type: "string", description: "JSON" } }, ["coin", "price_data", "technical_data"]), handler: async (i) => { let pd = {}; let td = {}; try { pd = JSON.parse(i.price_data as string); } catch {} try { td = JSON.parse(i.technical_data as string); } catch {} return sendCryptoReport(i.coin as string, pd as any, td as any); }, category: "telegram", permission: "external" }),
    defineTool({ name: "telegram_status", description: "Telegram bot status", inputSchema: inputSchema({}), handler: async () => getTelegramBotInfo(), category: "telegram" }),
  ],
  agents: [defineAgent({ mode: "telegram", icon: "📱", name: "Telegram Agent", systemPrompt: "📱 Open Talons Telegram Agent. Send messages, alerts, reports.", allowedTools: ["telegram_send", "telegram_alert", "telegram_crypto_report", "telegram_status"] })],
});
