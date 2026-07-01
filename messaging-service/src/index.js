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

// ================================
// CONFIG
// ================================
const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL;
const SESSION_NAME = process.env.SESSION_NAME || "wa-finance-bot";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY; // must match finance-service

if (!FINANCE_SERVICE_URL) {
  console.error(
    "❌ FINANCE_SERVICE_URL belum diisi di file .env.\n" +
      "Contoh: FINANCE_SERVICE_URL=http://localhost:3001"
  );
  process.exit(1);
}

// ================================
// START BOT
// ================================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
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
      console.log(
        "\n📱 Scan QR code ini dengan WhatsApp kamu (Linked Devices):\n"
      );
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        "⚠️  Koneksi terputus.",
        shouldReconnect
          ? "Mencoba reconnect..."
          : "Logged out — hapus folder auth_info_baileys lalu scan ulang QR."
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

// ================================
// HANDLE PESAN MASUK
// ================================
async function handleIncomingMessage(sock, msg) {
  if (!msg.message) return;
  if (msg.key.fromMe) return; // hindari loop

  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;
  if (remoteJid.endsWith("@g.us")) return; // abaikan grup
  if (remoteJid === "status@broadcast") return;

  const body = extractMessageText(msg.message);
  if (!body) return; // bukan teks (gambar/sticker/voice/dll)

  const sender = remoteJid.split("@")[0];
  console.log(`📩 Pesan masuk dari ${sender}: ${body}`);

  const replyText = await forwardToFinanceService(sender, body);

  if (replyText) {
    await sock.sendMessage(remoteJid, { text: replyText });
    console.log(`📤 Balasan terkirim ke ${sender}`);
  }
}

// ================================
// EKSTRAK TEKS DARI BERBAGAI TIPE PESAN
// ================================
function extractMessageText(message) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

// ================================
// FORWARD KE FINANCE-SERVICE
// ================================
async function forwardToFinanceService(sender, body) {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/process`,
      { from: sender, body },
      {
        headers: {
          "Content-Type": "application/json",
          ...(INTERNAL_API_KEY ? { "x-api-key": INTERNAL_API_KEY } : {}),
        },
        timeout: 30000,
      }
    );

    // finance-service always returns { reply: "..." }
    return response.data?.reply ?? null;
  } catch (err) {
    console.error("❌ Gagal menghubungi finance-service:", err.message);
    return "⚠️ Maaf, terjadi kesalahan saat mencatat ke sistem. Coba lagi nanti ya.";
  }
}

// ================================
// BOOT
// ================================
startBot().catch((err) => console.error("Fatal error:", err));
