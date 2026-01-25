import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// carpetas
const publicDir = path.resolve(__dirname, "..", "public");
const generatedDir = path.resolve(__dirname, "..", "generated");

// asegúrate que existan
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

// sirve estáticos
app.use("/generated", express.static(generatedDir));
app.use("/", express.static(publicDir));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PORT = process.env.PORT || 5055;

// --- helpers
function boolEnv(v) {
  return String(v || "").toLowerCase() === "true";
}

function pickFirstImageFile(req) {
  // soporta:
  // - images (array)  -> recomendado
  // - image (single)
  // - cualquier otro fallback
  const f = req.files || {};
  if (Array.isArray(f.images) && f.images.length) return f.images[0];
  if (Array.isArray(f.image) && f.image.length) return f.image[0];
  // si usaron upload.single("images") o upload.single("image")
  if (req.file?.buffer) return req.file;
  return null;
}

function safeText(x, max = 500) {
  const s = String(x ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

// ---- PROMPT “alto impacto” (sin texto)
function buildHighImpactPrompt({
  productName = "Producto",
  template = "Hero",
  language = "es",
  size = "1024x1024",
  productDetails = "",
  angle = "",
  avatar = "",
  extraInstructions = "",
  // cuando hay imagen de referencia, fuerza preservación
  useReferenceImage = false,
}) {
  const lang = String(language || "").toLowerCase().startsWith("es") ? "Spanish" : "English";

  const details = safeText(productDetails, 500);
  const angleS = safeText(angle, 200);
  const avatarS = safeText(avatar, 200);
  const extra = safeText(extraInstructions, 500);

  const preserveBlock = useReferenceImage
    ? [
        "IMPORTANT: Use the uploaded reference photo as the source of truth.",
        "Preserve the product identity: same shape, materials, colorway, proportions, unique details, seams, textures, and silhouette.",
        "Do NOT change the brand marks that exist on the real product; do NOT invent new logos; do NOT add any text.",
        "Keep it photorealistic; remove AI artifacts; keep natural physics and lighting.",
      ].join(" ")
    : "";

  return [
    `Language: ${lang}. Output size: ${size}.`,
    "Create an ultra-realistic professional e-commerce product photograph (high conversion).",
    "Premium commercial lighting, realistic shadows and reflections, natural colors, crisp details.",
    "Camera look: DSLR/mirrorless, shallow depth of field (f/2.8–f/4).",
    "Background: clean premium ad look but still photorealistic. Composition centered, product clearly visible.",
    "Props: subtle and relevant only (do not clutter).",
    "STRICT RULES: NO text, NO words, NO captions, NO banners, NO typography, NO badges.",
    "NO graphic-design poster/flyer look. NO artificial glow. NO fantasy effects.",
    "NO distorted packaging. NO weird hands/faces. No plastic-looking skin.",
    preserveBlock,
    `Template: ${template}. Product name: ${productName}.`,
    details ? `Product details: ${details}.` : "",
    angleS ? `Suggested sales angle: ${angleS}.` : "",
    avatarS ? `Ideal customer/avatar: ${avatarS}.` : "",
    extra ? `Extra instructions: ${extra}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// --- health
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

// --- logo upload
app.post("/api/logo/upload", upload.single("logo"), (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "missing_logo" });
    }
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

// ---- GENERAR/EDITAR IMAGEN
// Recibe multipart/form-data:
// - images: (file) o (files)  <-- recomendado
// - image: (file)             <-- también soportado
// - productName, template, size, language, productDetails, angle, avatar, extraInstructions
app.post(
  "/api/images/generate",
  upload.fields([
    { name: "images", maxCount: 3 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    const started = Date.now();
    const model = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
    const mock = boolEnv(process.env.OPENAI_MOCK);

    try {
      const body = req.body || {};
      const productName = safeText(body.productName || body.name || "Producto", 120) || "Producto";
      const template = safeText(body.template || "Hero", 40) || "Hero";
      const size = safeText(body.size || "1024x1024", 20) || "1024x1024";
      const language = safeText(body.language || "es", 10) || "es";
      const productDetails = safeText(body.productDetails || "", 500);
      const angle = safeText(body.angle || "", 200);
      const avatar = safeText(body.avatar || "", 200);
      const extraInstructions = safeText(body.extraInstructions || "", 500);

      const file0 = pickFirstImageFile(req);
      const filesCount =
        (req.files?.images?.length || 0) +
        (req.files?.image?.length || 0) +
        (req.file?.buffer ? 1 : 0);

      const used_edit = Boolean(file0?.buffer);

      const prompt_used = buildHighImpactPrompt({
        productName,
        template,
        language,
        size,
        productDetails,
        angle,
        avatar,
        extraInstructions,
        useReferenceImage: used_edit,
      });

      console.log("[IMG] MODEL:", model);
      console.log("[IMG] MOCK:", mock);
      console.log("[IMG] FILES:", filesCount, "USED_EDIT:", used_edit);
      console.log("[IMG] PROMPT_CHARS:", prompt_used.length);
      console.log("[IMG] SIZE:", size);

      // MODO MOCK (para test sin gastar)
      if (mock) {
        return res.json({
          ok: true,
          used_edit,
          model,
          prompt_used,
          image_url: "https://via.placeholder.com/1024?text=MOCK_IMAGE",
          ms: Date.now() - started,
        });
      }

      let result;

      if (used_edit) {
        // --- EDIT: usa la foto como referencia
        // Guardamos temporalmente para crear readStream (más compatible)
        const tmpPath = path.join(
          os.tmpdir(),
          `ref-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
        );
        fs.writeFileSync(tmpPath, file0.buffer);

        try {
          // endpoint de edición (image-to-image)
          result = await openai.images.edits({
            model,
            image: fs.createReadStream(tmpPath),
            prompt: prompt_used,
            size,
          });
        } finally {
          try {
            fs.unlinkSync(tmpPath);
          } catch {}
        }
      } else {
        // --- GENERATE: sin referencia
        result = await openai.images.generate({
          model,
          prompt: prompt_used,
          size,
        });
      }

      const data0 = result?.data?.[0];
      const b64 = data0?.b64_json || null;
      const url = data0?.url || null;

      // Preferimos guardar base64 para servirlo nosotros (más estable)
      let finalUrl = null;

      if (b64) {
        const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
        const outPath = path.join(generatedDir, filename);
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        finalUrl = `/generated/${filename}`;
      } else if (url) {
        finalUrl = url; // si viene URL directa
      }

      if (!finalUrl) {
        return res.status(500).json({
          ok: false,
          error: "No image returned",
          used_edit,
          model,
          prompt_used,
        });
      }

      return res.json({
        ok: true,
        used_edit,
        files_count: filesCount,
        model,
        image_url: finalUrl,
        prompt_used,
        ms: Date.now() - started,
      });
    } catch (err) {
      console.error("[IMG] ERROR:", err?.message || err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER ON :${PORT}`);
});
