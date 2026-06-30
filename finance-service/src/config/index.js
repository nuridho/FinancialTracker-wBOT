require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT || "3001", 10),

  paydayDate: parseInt(process.env.PAYDAY_DATE || "28", 10),
  confidenceThreshold: parseInt(process.env.CONFIDENCE_THRESHOLD || "70", 10),

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelFallbackChain: [
      "openai/gpt-oss-120b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
    ],
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
  },
};

function validateConfig() {
  const required = [
    ["SUPABASE_URL", config.supabase.url],
    ["SUPABASE_KEY", config.supabase.key],
    ["OPENROUTER_API_KEY", config.openrouter.apiKey],
  ];

  const missing = required
    .filter(([, val]) => !val)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Copy .env.example to .env and fill in the values."
    );
  }
}

module.exports = { config, validateConfig };
