import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, "..", "public");
const generatedDir = path.resolve(publicDir, "generated");

// Asegura carpetas
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

// Servir archivos generados
app.use("/generated", express.static(generatedDir));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 5055;

app.get("/api/health", (req, res) => {
  const model = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
  res.json({
    ok: true,
    ts: Date.now(),
    model,
    mock: String(process.env.OPENAI_MOCK || "false"),
    has_key: Boolean(process.env.OPENAI_API_KEY),
  });
});

// ---- Prompt alto impacto (sin texto en imagen)
function buildHighImpactPrompt({
  productName = "Producto",
  template = "Hero",
  language = "es",
  size = "1024x1024",
  productDetails = "",
  angle = "",
  avatar = "",
  extraInstructions = "",
}) {
  const lang = language?.toLowerCase().startsWith("es") ? "Spanish" : "English";

  const parts = [
    `Language: ${lang}. Output size: ${size}.`,
    "Create an ultra-realistic professional e-commerce product photograph.",
    "The product must look 100% real, physically accurate, commercially viable, and not AI-generated.",
    "Premium commercial lighting, realistic shadows/reflections, natural colors.",
    "DSLR/mirrorless look, shallow depth of field (f/2.8–f/4), crisp details.",
    "Background: clean and premium (high-end ad look) but still photorealistic.",
    "Composition: product clearly visible, centered, clean framing; props subtle and relevant.",
    "STRICT RULES: NO text, NO words, NO captions, NO banners, NO typography, NO badges, NO logos added by AI.",
    "NO poster/flyer/graphic-design look. NO artificial glow. NO fantasy effects.",
    "NO distorted packaging. NO weird hands/faces.",
    "If a model is present, it must be realistic and natural (not AI look).",
    `Template: ${template}. Product name: ${productName}.`,
  ];

  if (productDetails) parts.push(`Product details: ${productDetails}.`);
  if (angle) parts.push(`Suggested selling angle: ${angle}.`);
  if (avatar) parts.push(`Target avatar/persona: ${avatar}.`);
  if (extraInstructions) parts.push(`Extra instructions: ${extraInstructions}.`);

  return parts.join(" ");
}

// ---- Generar imagen (AHORA acepta archivos: images)
app.post("/api/images/generate", upload.array("images", 3), async (req, res) => {
  try {
    const {
      productName = "Producto",
      template = "Hero",
      size = "1024x1024",
      language = "es",
      productDetails = "",
      angle = "",
      avatar = "",
      extraInstructions = "",
    } = req.body || {};

    const model = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
    const files = req.files || [];

    const prompt_used = buildHighImpactPrompt({
      productName,
      template,
      size,
      language,
      productDetails,
      angle,
      avatar,
      extraInstructions,
    });

    console.log("IMAGE MODEL:", model);
    console.log("FILES:", files.length);
    console.log("PROMPT_CHARS:", prompt_used.length);
    console.log("SIZE:", size);

    // 1) Si viene imagen, por ahora NO revienta: seguimos generando (puedes activar edits luego)
    //    Esto ya corrige tu error 500 y te deja usar -F images=@...
    const result = await openai.images.generate({
      model,
      prompt: prompt_used,
      size,
    });

    const data0 = result?.data?.[0];
    const b64 = data0?.b64_json;
    const url = data0?.url;

    let image_url = null;

    // Si llega URL directa
    if (url) image_url = url;

    // Si llega base64, la guardamos y servimos desde /generated/...
    if (!image_url && b64) {
      const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
      const outPath = path.join(generatedDir, filename);
      fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
      image_url = `/generated/${filename}`;
    }

    if (!image_url) {
      return res.status(500).json({ ok: false, error: "No image returned", prompt_used, model });
    }

    return res.json({ ok: true, image_url, prompt_used, model });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("GENERATE_ERROR:", msg);
    return res.status(500).json({ ok: false, error: msg });
  }
});

// ? Middleware de errores (incluye Multer) ? SIEMPRE JSON, no HTML
app.use((err, req, res, next) => {
  const msg = err?.message || String(err);
  console.error("MIDDLEWARE_ERROR:", msg);
  return res.status(400).json({ ok: false, error: msg });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER ON :${PORT}`);
});
