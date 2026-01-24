import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const app = express();

/** =======================
 *  CORS (producción)
 *  ======================= */
const ALLOWED_ORIGINS = [
  "https://sanate.store",
  "https://www.sanate.store",
  "https://products-web-j7ji.onrender.com",
  // opcional: localhost para pruebas
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin(origin, cb) {
      // permite requests sin origin (curl, server-to-server)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/** =======================
 *  Upload (multer)
 *  ======================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "..", "public");
const generatedDir = path.join(publicDir, "generated");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(publicDir);
ensureDir(generatedDir);

app.use(express.static(publicDir));

/** =======================
 *  OpenAI
 *  ======================= */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PORT = process.env.PORT || 5055;

/** =======================
 *  Health
 *  ======================= */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    model: (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim(),
    mock: String(process.env.OPENAI_MOCK || "false"),
    has_key: Boolean(process.env.OPENAI_API_KEY),
  });
});

/** =======================
 *  Logo upload
 *  ======================= */
app.post("/api/logo/upload", upload.single("logo"), (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "missing_logo" });
    }

    ensureDir(publicDir);

    const logoPath = path.join(publicDir, "logo.png");
    const logo192Path = path.join(publicDir, "logo192.png");
    const logo512Path = path.join(publicDir, "logo512.png");

    fs.writeFileSync(logoPath, req.file.buffer);
    fs.writeFileSync(logo192Path, req.file.buffer);
    fs.writeFileSync(logo512Path, req.file.buffer);

    return res.json({ ok: true, url: "/logo.png" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

/** =======================
 *  Prompt builder (ALTO IMPACTO ecommerce sin texto)
 *  ======================= */
function buildHighImpactPrompt({
  productName = "Producto",
  template = "Hero",
  language = "es",
  size = "1024x1024",
  extraInstructions = "",
}) {
  const lang = String(language || "es").toLowerCase().startsWith("es") ? "Spanish" : "English";
  const safeExtra = extraInstructions ? `Extra instructions: ${extraInstructions}.` : "";

  return [
    `Language: ${lang}. Output size: ${size}.`,
    "Create an ultra-realistic professional e-commerce product photograph.",
    "The product must look 100% real, physically accurate, commercially viable, and not AI-generated.",
    "Studio environment with premium commercial lighting, realistic shadows/reflections, natural colors.",
    "DSLR/mirrorless look, shallow depth of field (f/2.8–f/4), crisp details, clean background suitable for e-commerce.",
    "Composition: product clearly visible, centered, clean framing; optional natural props/ingredients around it (subtle, not cluttered).",
    "STRICT RULES: NO text, NO words, NO captions, NO banners, NO typography, NO badges, NO logos added by AI.",
    "NO poster/flyer/graphic-design look. NO artificial glow. NO fantasy effects.",
    "NO distorted packaging, NO weird hands/faces. If a model is present, it must be realistic and natural.",
    `Template: ${template}. Product name: ${productName}.`,
    safeExtra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** =======================
 *  Utils: save base64 png to /public/generated
 *  ======================= */
function saveBase64PngToPublic(b64) {
  ensureDir(generatedDir);
  const id = crypto.randomBytes(12).toString("hex");
  const filename = `${Date.now()}-${id}.png`;
  const filepath = path.join(generatedDir, filename);
  fs.writeFileSync(filepath, Buffer.from(b64, "base64"));
  return `/generated/${filename}`;
}

/** =======================
 *  Generate image
 *  - Soporta JSON y FormData (multer.none)
 *  - Devuelve URL pública (mejor que data-uri)
 *  ======================= */
app.post("/api/images/generate", upload.none(), async (req, res) => {
  try {
    const body = req.body || {};

    const productName = body.productName || body.nombreProducto || "Producto";
    const template = body.template || "Hero";
    const size = body.size || "1024x1024";
    const language = body.language || "es";
    const extraInstructions = body.extraInstructions || "";

    // MOCK opcional (para validar flujo sin gastar)
    const isMock = String(process.env.OPENAI_MOCK || "false").toLowerCase() === "true";
    const model = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();

    const prompt_used = buildHighImpactPrompt({
      productName,
      template,
      size,
      language,
      extraInstructions,
    });

    console.log("IMAGE MODEL:", model);
    console.log("MOCK:", process.env.OPENAI_MOCK);
    console.log("PROMPT_CHARS:", prompt_used.length);
    console.log("IMAGE SIZE:", size);

    if (isMock) {
      // Devuelve una imagen placeholder local si quieres (si existe), o solo un ok
      return res.json({
        ok: true,
        image_url: "/logo.png",
        prompt_used,
        mock: true,
        model,
      });
    }

    const result = await openai.images.generate({
      model,
      prompt: prompt_used,
      size,
    });

    const data0 = result?.data?.[0];

    // Preferimos b64 (para guardarla y devolver URL pública)
    if (data0?.b64_json) {
      const publicUrl = saveBase64PngToPublic(data0.b64_json);
      return res.json({ ok: true, image_url: publicUrl, prompt_used, model });
    }

    // Si el proveedor retorna url directa, la devolvemos
    if (data0?.url) {
      return res.json({ ok: true, image_url: data0.url, prompt_used, model });
    }

    return res.status(500).json({ ok: false, error: "no_image_returned", prompt_used, model });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("IMAGE ERROR:", msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

/** =======================
 *  Start
 *  ======================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER ON :${PORT}`);
});
