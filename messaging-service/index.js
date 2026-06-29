require("dotenv").config();

const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const axios = require("axios");
const qrcode = require("qrcode-terminal");

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const SESSION_NAME = process.env.SESSION_NAME || "wa-finance-bot";

if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("XXXXXXXX")) {
  console.error(
    "❌ APPS_SCRIPT_URL belum diisi dengan benar di file .env. " +
      "Cek instruksi di README.md."
  );
  process.exit(1);
}

/* ================================
   START BOT
================================ */
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    "auth_info_baileys"
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Scan QR code ini dengan WhatsApp kamu (Linked Devices):\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        "⚠️ Koneksi terputus.",
        shouldReconnect
          ? "Mencoba reconnect..."
          : "Logged out, hapus folder auth_info_baileys lalu scan ulang QR."
      );

      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ Bot WhatsApp terhubung dan siap menerima pesan!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        await handleIncomingMessage(sock, msg);
      } catch (err) {
        console.error("❌ Gagal memproses pesan:", err.message);
      }
    }
  });
}

/* ================================
   HANDLE PESAN MASUK
================================ */
async function handleIncomingMessage(sock, msg) {
  if (!msg.message) return;
  if (msg.key.fromMe) return; // abaikan pesan dari bot sendiri (hindari loop)

  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;
  if (remoteJid.endsWith("@g.us")) return; // abaikan pesan grup
  if (remoteJid === "status@broadcast") return;

  const body = extractMessageText(msg.message);
  if (!body) return; // bukan pesan teks (gambar/sticker/voice note/dll), skip

  const sender = remoteJid.split("@")[0];

  console.log(`📩 Pesan masuk dari ${sender}: ${body}`);

  const replyText = await forwardToAppsScript(sender, body);

  if (replyText) {
    await sock.sendMessage(remoteJid, { text: replyText });
    console.log(`📤 Balasan terkirim ke ${sender}`);
  }
}

/* ================================
   AMBIL TEKS DARI BERBAGAI TIPE PESAN
================================ */
function extractMessageText(message) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

/* ================================
   FORWARD KE APPS SCRIPT WEBHOOK
================================ */
async function forwardToAppsScript(sender, body) {
  try {
    const response = await axios.post(
      APPS_SCRIPT_URL,
      {
        session: SESSION_NAME,
        from: sender,
        body: body,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    // doPost di Apps Script return lewat ContentService -> response.data berupa string
    return typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);
  } catch (err) {
    console.error("❌ Gagal menghubungi Apps Script:", err.message);
    return "⚠️ Maaf, terjadi kesalahan saat mencatat ke sistem. Coba lagi nanti ya.";
  }
}

startBot().catch((err) => console.error("Fatal error:", err));
