import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
});

// carpetas
const publicDir = path.resolve(__dirname, "..", "public");
const buildDir = path.resolve(__dirname, "..", "build");
const generatedDir = path.resolve(__dirname, "..", "generated");

// asegï¿½rate que existan
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

// sirve estï¿½ticos
app.use("/generated", express.static(generatedDir));

// Si existe build, sirve React (producciÃ³n) desde ahÃ­
if (fs.existsSync(buildDir)) {
  app.use("/", express.static(buildDir));
} else {
  app.use("/", express.static(publicDir));
}

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("OPENAI_API_KEY no configurada - IA deshabilitada");
}

const PORT = process.env.PORT || 5055;
const SERVER_BUILD = process.env.SERVER_BUILD || "2026-02-18-edit-http-fallback";
const aiImagesStoreFile = path.join(generatedDir, "ai-images-store.json");

// --- helpers
function boolEnv(v) {
  const raw = String(v || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
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

function loadAiImagesStore() {
  try {
    if (!fs.existsSync(aiImagesStoreFile)) return [];
    const raw = fs.readFileSync(aiImagesStoreFile, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAiImagesStore(items) {
  fs.writeFileSync(aiImagesStoreFile, JSON.stringify(items, null, 2), "utf-8");
}

function readGeneratedUrlAsDataUrl(url) {
  try {
    const clean = String(url || "").trim();
    if (!clean.startsWith("/generated/")) return "";
    const filename = clean.replace("/generated/", "");
    const filePath = path.join(generatedDir, filename);
    if (!fs.existsSync(filePath)) return "";
    const bin = fs.readFileSync(filePath);
    return `data:image/png;base64,${bin.toString("base64")}`;
  } catch {
    return "";
  }
}

async function analyzeGeneratedImage({
  generatedUrl,
  expectedTemplate = "Hero",
  expectedProductName = "Producto",
}) {
  const base = {
    ok: false,
    expected_template: expectedTemplate,
    expected_product: expectedProductName,
    detected_product: "desconocido",
    product_match_score: 0,
    template_match_score: 0,
    hero_style_score: 0,
    high_impact_score: 0,
    notes: "Analisis no disponible",
  };

  const mock = boolEnv(process.env.OPENAI_MOCK);
  if (!openai || mock) {
    return {
      ...base,
      ok: true,
      template_match_score: String(expectedTemplate).toLowerCase() === "hero" ? 85 : 72,
      hero_style_score: String(expectedTemplate).toLowerCase() === "hero" ? 86 : 70,
      high_impact_score: 80,
      notes: "Analisis heuristico (mock/sin vision).",
    };
  }

  try {
    const visionModel = (process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini").trim();
    const imageInput = readGeneratedUrlAsDataUrl(generatedUrl) || generatedUrl;
    if (!imageInput) return base;
    const prompt = [
      "Analyze this generated e-commerce creative image and return STRICT JSON.",
      "JSON keys only:",
      "detected_product, product_match_score, template_match_score, hero_style_score, high_impact_score, notes.",
      `expected_template=${expectedTemplate}. expected_product=${expectedProductName}.`,
      "Scores are integers 0-100.",
      "No markdown, no extra text.",
    ].join(" ");

    const response = await openai.responses.create({
      model: visionModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageInput },
          ],
        },
      ],
      max_output_tokens: 400,
    });

    const outputText = String(response?.output_text || "").trim();
    if (!outputText) return base;
    const parsed = JSON.parse(outputText);
    return {
      ...base,
      ...parsed,
      ok: true,
    };
  } catch (err) {
    return {
      ...base,
      notes: `Analisis fallido: ${err?.message || "sin detalle"}`,
    };
  }
}

function imageExtensionFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "png";
}

async function callOpenAIImageEditHttp({
  apiKey,
  model,
  imageBuffer,
  imageMime = "image/png",
  prompt,
  size,
}) {
  const form = new FormData();
  const ext = imageExtensionFromMime(imageMime);
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("image", new Blob([imageBuffer], { type: imageMime }), `input.${ext}`);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const raw = await response.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error?.message || raw || `HTTP ${response.status}`;
    throw new Error(`OpenAI /images/edits fallo: ${detail}`);
  }

  return data;
}

// ---- PROMPT ï¿½alto impactoï¿½ (sin texto)
function buildHighImpactPrompt({
  productName = "Producto",
  template = "Hero",
  language = "es",
  size = "1024x1024",
  productDetails = "",
  angle = "",
  avatar = "",
  extraInstructions = "",
  // cuando hay imagen de referencia, fuerza preservaciï¿½n
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
    "Camera look: DSLR/mirrorless, shallow depth of field (f/2.8ï¿½f/4).",
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
  const vision_model = (process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini").trim();
  const edit_model = (process.env.OPENAI_EDIT_MODEL || "dall-e-2").trim();
  const renderCommit = process.env.RENDER_GIT_COMMIT || "";
  const renderService = process.env.RENDER_SERVICE_ID || "";
  res.json({
    ok: true,
    build: SERVER_BUILD,
    render_commit: renderCommit,
    render_service_id: renderService,
    ts: Date.now(),
    model,
    edit_model,
    vision_model,
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
// - image: (file)             <-- tambiï¿½n soportado
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
    const editModelFallback = (process.env.OPENAI_EDIT_MODEL || "dall-e-2").trim();
    const mock = boolEnv(process.env.OPENAI_MOCK);

    try {
      const body = req.body || {};
      const userId = safeText(body.userId || body.clientId || "admin", 60) || "admin";
      const productId = safeText(body.productId || "general", 80) || "general";
      const productName = safeText(body.productName || body.name || "Producto", 120) || "Producto";
      const template = safeText(body.template || "Hero", 40) || "Hero";
      const size = safeText(body.size || "1024x1024", 20) || "1024x1024";
      const language = safeText(body.language || "es", 10) || "es";
      const productDetails = safeText(body.productDetails || "", 500);
      const angle = safeText(body.angle || body.salesAngle || "", 200);
      const avatar = safeText(body.avatar || body.idealClient || "", 200);
      const extraInstructions = safeText(body.extraInstructions || "", 500);

      const file0 = pickFirstImageFile(req);
      const filesCount =
        (req.files?.images?.length || 0) +
        (req.files?.image?.length || 0) +
        (req.file?.buffer ? 1 : 0);

      const used_edit = Boolean(file0?.buffer);
      const modelForEdit = /^dall-e-3$/i.test(model) || /^gpt-image-1$/i.test(model)
        ? editModelFallback
        : model;

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
      let editFallback = false;
      let editMode = "none";

      if (used_edit) {
        if (/^dall-e-2$/i.test(modelForEdit) && !/^image\/png$/i.test(file0?.mimetype || "")) {
          return res.status(400).json({
            ok: false,
            error: "Para edicion con modelo dall-e-2 sube imagen PNG (image/png).",
          });
        }
        // --- EDIT: usa la foto como referencia
        // Guardamos temporalmente para crear readStream (mï¿½s compatible)
        const tmpPath = path.join(
          os.tmpdir(),
          `ref-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
        );
        fs.writeFileSync(tmpPath, file0.buffer);

        try {
          if (!openai) {
            return res
              .status(503)
              .json({ error: "OpenAI no configurado. Configure OPENAI_API_KEY." });
          }
          editMode = "http-edits";
          result = await callOpenAIImageEditHttp({
            apiKey: process.env.OPENAI_API_KEY,
            model: modelForEdit,
            imageBuffer: file0.buffer,
            imageMime: file0.mimetype || "image/png",
            prompt: prompt_used,
            size,
          });
        } catch (editErr) {
          console.warn("[IMG] edit fallback:", editErr?.message || editErr);
          try {
            editFallback = true;
            editMode = "generate-fallback";
            result = await openai.images.generate({
              model,
              prompt: `${prompt_used} Keep product identity from uploaded image as closely as possible.`,
              size,
            });
          } catch (genErr) {
            const detail = genErr?.message || String(genErr);
            throw new Error(`Edit failed (${editErr?.message || editErr}) | Generate fallback failed (${detail})`);
          }
        } finally {
          try {
            fs.unlinkSync(tmpPath);
          } catch {}
        }
      } else {
        // --- GENERATE: sin referencia
        if (!openai) {
          return res
            .status(503)
            .json({ error: "OpenAI no configurado. Configure OPENAI_API_KEY." });
        }
        result = await openai.images.generate({
          model,
          prompt: prompt_used,
          size,
        });
      }

      const data0 = result?.data?.[0];
      const b64 = data0?.b64_json || null;
      const url = data0?.url || null;

      // Preferimos guardar base64 para servirlo nosotros (mï¿½s estable)
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

      const generatedAnalysis = await analyzeGeneratedImage({
        generatedUrl: finalUrl,
        expectedTemplate: template,
        expectedProductName: productName,
      });

      const store = loadAiImagesStore();
      const record = {
        id: `img_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        userId,
        productId,
        template,
        productName,
        url: finalUrl,
        prompt_used,
        analysis: generatedAnalysis,
        orderIndex: store.filter((it) => String(it.userId) === String(userId) && String(it.productId) === String(productId) && !it.deleted).length,
        createdAt: new Date().toISOString(),
        deleted: false,
      };
      store.push(record);
      saveAiImagesStore(store);

      return res.json({
        ok: true,
        used_edit,
        edit_fallback: editFallback,
        edit_mode: editMode,
        files_count: filesCount,
        model,
        model_used: used_edit ? modelForEdit : model,
        image_url: finalUrl,
        image_id: record.id,
        analysis: generatedAnalysis,
        prompt_used,
        ms: Date.now() - started,
      });
    } catch (err) {
      console.error("[IMG] ERROR:", err?.message || err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  }
);

app.get("/api/ai-images", (req, res) => {
  try {
    const userId = safeText(req.query?.userId || "admin", 60) || "admin";
    const productId = safeText(req.query?.productId || "general", 80) || "general";
    const store = loadAiImagesStore();
    const filtered = store
      .filter((it) => !it.deleted)
      .filter((it) => String(it.userId) === String(userId))
      .filter((it) => String(it.productId || "general") === String(productId))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((it, idx) => ({
        id: it.id,
        orderIndex: typeof it.orderIndex === "number" ? it.orderIndex : idx,
        createdAt: it.createdAt || null,
        template: it.template || "Hero",
        prompt_used: it.prompt_used || "",
        analysis: it.analysis || null,
        files: [{ url: it.url }],
      }));
    return res.json({ ok: true, images: filtered });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/ai-images/delete", express.json(), (req, res) => {
  try {
    const userId = safeText(req.body?.userId || "admin", 60) || "admin";
    const imageId = safeText(req.body?.imageId || "", 120);
    if (!imageId) return res.status(400).json({ ok: false, error: "imageId requerido" });
    const store = loadAiImagesStore();
    const idx = store.findIndex((it) => String(it.id) === String(imageId) && String(it.userId) === String(userId));
    if (idx < 0) return res.status(404).json({ ok: false, error: "Imagen no encontrada" });

    const image = store[idx];
    image.deleted = true;
    image.deletedAt = new Date().toISOString();
    if (String(image.url || "").startsWith("/generated/")) {
      const filename = String(image.url).replace("/generated/", "");
      const filePath = path.join(generatedDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
    store[idx] = image;
    saveAiImagesStore(store);
    return res.json({ ok: true, deletedId: imageId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});


// Analisis base (placeholder listo para Vision model)
app.post("/api/product/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "missing_image" });
    }
    const clientId = safeText(req.body?.clientId || "", 50);
    const visionModel = (process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini").trim();

    let analysis = {
      category: "product",
      hasHands: false,
      hasLogo: false,
      primaryColors: ["neutral"],
      material: "unknown",
      suggestedTemplate: "Hero",
      confidence: 0.6,
      recommendedInstructions: "Professional product photo with commercial lighting",
    };

    const mock = boolEnv(process.env.OPENAI_MOCK);
    if (openai && !mock) {
      try {
        const b64 = req.file.buffer.toString("base64");
        const mime = req.file.mimetype || "image/png";
        const prompt = [
          "Analyze this product image for e-commerce creative generation.",
          "Return strict JSON with keys:",
          "category, hasHands, hasLogo, primaryColors(array), material, suggestedTemplate, confidence, recommendedInstructions",
          "Use suggestedTemplate from: Hero, Oferta, Beneficios, Antes/Despues, Testimonio, Logistica.",
          "No markdown, no extra text, only JSON.",
        ].join(" ");

        const response = await openai.responses.create({
          model: visionModel,
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: prompt },
                { type: "input_image", image_url: `data:${mime};base64,${b64}` },
              ],
            },
          ],
          max_output_tokens: 500,
        });

        const outputText = String(response?.output_text || "").trim();
        if (outputText) {
          try {
            const parsed = JSON.parse(outputText);
            analysis = {
              ...analysis,
              ...parsed,
              primaryColors: Array.isArray(parsed?.primaryColors)
                ? parsed.primaryColors.slice(0, 5)
                : analysis.primaryColors,
            };
          } catch {
            // fallback al analisis base si OpenAI no devuelve JSON valido
          }
        }
      } catch {
        // fallback al analisis base si falla Vision
      }
    }

    return res.json({
      ok: true,
      analysis,
      clientId,
      vision_model: visionModel,
      ready_for_auto_generate: true,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Flujo 1-click para SmartImageGenerator
app.post("/api/image/auto-generate", upload.single("image"), async (req, res) => {
  const model = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
  const editModelFallback = (process.env.OPENAI_EDIT_MODEL || "dall-e-2").trim();
  const mock = boolEnv(process.env.OPENAI_MOCK);
  const modelForEdit = /^dall-e-3$/i.test(model) || /^gpt-image-1$/i.test(model)
    ? editModelFallback
    : model;
  const started = Date.now();
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "missing_image" });
    }
    if (/^dall-e-2$/i.test(modelForEdit) && !/^image\/png$/i.test(req.file?.mimetype || "")) {
      return res.status(400).json({
        ok: false,
        error: "Para edicion con modelo dall-e-2 sube imagen PNG (image/png).",
      });
    }

    const productName = safeText(req.body?.productName || "Producto", 120) || "Producto";
    const language = safeText(req.body?.language || "es", 10) || "es";
    const size = safeText(req.body?.size || "1024x1024", 20) || "1024x1024";
    const template = safeText(req.body?.template || "Hero", 40) || "Hero";

    const prompt_used = buildHighImpactPrompt({
      productName,
      template,
      language,
      size,
      useReferenceImage: true,
    });

    if (mock) {
      return res.json({
        ok: true,
        auto_generated: true,
        template,
        image_url: "https://via.placeholder.com/1024?text=AUTO_GENERATED",
        prompt_used,
        ms: Date.now() - started,
      });
    }

    if (!openai) {
      return res
        .status(503)
        .json({ error: "OpenAI no configurado. Configure OPENAI_API_KEY." });
    }

    const tmpPath = path.join(
      os.tmpdir(),
      `ref-${Date.now()}-${Math.random().toString(16).slice(2)}.png`
    );
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      let result;
      let editFallback = false;
      let editMode = "none";
      try {
        editMode = "http-edits";
        result = await callOpenAIImageEditHttp({
          apiKey: process.env.OPENAI_API_KEY,
          model: modelForEdit,
          imageBuffer: req.file.buffer,
          imageMime: req.file.mimetype || "image/png",
          prompt: prompt_used,
          size,
        });
      } catch (editErr) {
        console.warn("[AUTO-IMG] edit fallback:", editErr?.message || editErr);
        try {
          editFallback = true;
          editMode = "generate-fallback";
          result = await openai.images.generate({
            model,
            prompt: `${prompt_used} Keep product identity from uploaded image as closely as possible.`,
            size,
          });
        } catch (genErr) {
          const detail = genErr?.message || String(genErr);
          throw new Error(`Edit failed (${editErr?.message || editErr}) | Generate fallback failed (${detail})`);
        }
      }

      const data0 = result?.data?.[0];
      const b64 = data0?.b64_json || null;
      const url = data0?.url || null;
      let finalUrl = null;

      if (b64) {
        const filename = `${Date.now()}-auto-${Math.random().toString(16).slice(2)}.png`;
        const outPath = path.join(generatedDir, filename);
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        finalUrl = `/generated/${filename}`;
      } else if (url) {
        finalUrl = url;
      }

      if (!finalUrl) {
        return res.status(500).json({ ok: false, error: "No image returned" });
      }

      return res.json({
        ok: true,
        auto_generated: true,
        template,
        model_used: editFallback ? model : modelForEdit,
        edit_fallback: editFallback,
        edit_mode: editMode,
        image_url: finalUrl,
        prompt_used,
        ms: Date.now() - started,
      });
    } finally {
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});
// --- DATOS MOCK Y RUTAS FALTANTES ---
const MOCK_CATEGORIAS = [
  { id: 1, nombre: "Ofertas", name: "Ofertas", slug: "ofertas", imagen: "https://via.placeholder.com/150?text=Ofertas" },
  { id: 2, nombre: "Nuevos", name: "Nuevos", slug: "nuevos", imagen: "https://via.placeholder.com/150?text=Nuevos" },
  { id: 3, nombre: "Destacados", name: "Destacados", slug: "destacados", imagen: "https://via.placeholder.com/150?text=Destacados" }
];

const MOCK_BANNERS = [
  { id: 1, imagen: "https://via.placeholder.com/1200x480?text=Banner+1" },
  { id: 2, imagen: "https://via.placeholder.com/1200x480?text=Banner+2" },
  { id: 3, imagen: "https://via.placeholder.com/1200x480?text=Banner+3" }
];

const MOCK_SUBBANNERS = [
  { id: 11, imagen: "https://via.placeholder.com/640x320?text=SubBanner+1" },
  { id: 12, imagen: "https://via.placeholder.com/640x320?text=SubBanner+2" },
  { id: 13, imagen: "https://via.placeholder.com/640x320?text=SubBanner+3" }
];
const MOCK_PRODUCTOS = [
  { id: 1, nombre: "Zapatillas Runner", name: "Zapatillas Runner", precio: 89.99, price: 89.99, imagen: "https://via.placeholder.com/300?text=Zapatillas", image: "https://via.placeholder.com/300?text=Zapatillas", categoria: "ofertas", category: "ofertas", descripcion: "Ideales para correr." },
  { id: 2, nombre: "Camiseta Sport", name: "Camiseta Sport", precio: 29.99, price: 29.99, imagen: "https://via.placeholder.com/300?text=Camiseta", image: "https://via.placeholder.com/300?text=Camiseta", categoria: "nuevos", category: "nuevos", descripcion: "Transpirable y cÃ³moda." },
  { id: 3, nombre: "Reloj Inteligente", name: "Reloj Inteligente", precio: 150.00, price: 150.00, imagen: "https://via.placeholder.com/300?text=Reloj", image: "https://via.placeholder.com/300?text=Reloj", categoria: "destacados", category: "destacados", descripcion: "Conecta con tu vida." },
  { id: 4, nombre: "Mochila Urbana", name: "Mochila Urbana", precio: 45.50, price: 45.50, imagen: "https://via.placeholder.com/300?text=Mochila", image: "https://via.placeholder.com/300?text=Mochila", categoria: "ofertas", category: "ofertas", descripcion: "Para el dÃ­a a dÃ­a." }
];

// Helpers Tiendas
const tiendasFile = path.join(generatedDir, "tiendas.json");
function getTiendas() {
  if (!fs.existsSync(tiendasFile)) return [];
  try { return JSON.parse(fs.readFileSync(tiendasFile, "utf-8")); } catch { return []; }
}
function saveTiendas(tiendas) {
  fs.writeFileSync(tiendasFile, JSON.stringify(tiendas, null, 2));
}

// Rutas Productos y CategorÃ­as
app.get('/api/categories', (req, res) => {
  console.log("[API] GET /api/categories - Enviando", MOCK_CATEGORIAS.length, "categorÃ­as");
  res.json({ success: true, data: MOCK_CATEGORIAS });
});

app.get('/api/banners', (req, res) => {
  console.log("[API] GET /api/banners - Enviando", MOCK_BANNERS.length, "banners");
  res.json({ success: true, data: MOCK_BANNERS });
});

app.get('/api/subbanners', (req, res) => {
  console.log("[API] GET /api/subbanners - Enviando", MOCK_SUBBANNERS.length, "subbanners");
  res.json({ success: true, data: MOCK_SUBBANNERS });
});
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  console.log(`[API] GET /api/products ${category ? `(Filtro: ${category})` : '(Todos)'}`);
  
  let data = MOCK_PRODUCTOS;
  if (category) data = data.filter(p => p.categoria === category);
  res.json({ success: true, data });
});

// Rutas Tiendas
app.get('/api/tiendasGet', (req, res) => res.json({ success: true, tiendas: getTiendas() }));
app.post('/api/tiendasPost', (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ success: false, error: "Nombre requerido" });
  const tiendas = getTiendas();
  const newTienda = { idTienda: Date.now(), nombre, slug: nombre.toLowerCase().replace(/\s+/g, '-'), color: "#000000", logo: null };
  tiendas.push(newTienda);
  saveTiendas(tiendas);
  res.json({ success: true, tienda: newTienda });
});
app.delete('/api/tiendaDelete', (req, res) => {
  const { idTienda } = req.query;
  let tiendas = getTiendas();
  tiendas = tiendas.filter(t => String(t.idTienda) !== String(idTienda));
  saveTiendas(tiendas);
  res.json({ success: true });
});

// ── WhatsApp Bot (Baileys) ──────────────────────────────────────────────────
const WA_SECRET = process.env.WA_SECRET || "sanate_secret_2025";
const waAuthDir = path.join(generatedDir, "wa-auth");

let waSocket   = null;
let waStatus   = "disconnected"; // 'disconnected' | 'connecting' | 'connected'
let waQR       = null;           // data-url PNG
let waPhone    = "";
let waIniting  = false;

// ── Chat store en memoria ───────────────────────────────────────────────────
const WA_HISTORY_DAYS = 15;
const waChats    = new Map(); // jid → { id, name, phone, lastMsg, lastMsgTime, unread }
const waMessages = new Map(); // jid → [{ id, dir, txt, time, ts }]

function extractText(msg) {
  const m = msg?.message;
  if (!m) return "[Mensaje]";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    (m.imageMessage    ? "[Imagen]" : "") ||
    (m.audioMessage    ? "[Audio]" : "") ||
    (m.videoMessage    ? "[Video]" : "") ||
    (m.stickerMessage  ? "[Sticker]" : "") ||
    (m.documentMessage ? "[Documento]" : "") ||
    "[Mensaje]"
  );
}

function storeMsg(msg) {
  const jid = msg?.key?.remoteJid;
  if (!jid || jid === "status@broadcast") return;

  const ts      = Number(msg.messageTimestamp || 0) * 1000 || Date.now();
  const cutoff  = Date.now() - WA_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  if (ts < cutoff) return;

  const text    = extractText(msg);
  const fromMe  = Boolean(msg.key?.fromMe);
  const name    = (!fromMe && msg.pushName) ? msg.pushName : (waChats.get(jid)?.name || jid.split("@")[0]);

  // Actualizar/crear chat
  const chat = waChats.get(jid) || { id: jid, name, phone: jid.split("@")[0], unread: 0, lastMsg: "", lastMsgTime: 0 };
  chat.name        = name;
  chat.lastMsg     = text;
  chat.lastMsgTime = ts;
  if (!fromMe) chat.unread = (chat.unread || 0) + 1;
  waChats.set(jid, chat);

  // Guardar mensaje
  const msgs  = waMessages.get(jid) || [];
  const msgId = msg.key?.id || `${ts}`;
  if (!msgs.find(m => m.id === msgId)) {
    msgs.push({
      id:   msgId,
      dir:  fromMe ? "s" : "r",
      txt:  text,
      time: new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      ts,
    });
    // Máximo 300 mensajes por chat
    if (msgs.length > 300) msgs.splice(0, msgs.length - 300);
    waMessages.set(jid, msgs);
  }
}

function checkWaSecret(req, res) {
  if (req.headers["x-secret"] !== WA_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

async function initWhatsApp() {
  if (waIniting) return;
  waIniting = true;
  try {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } =
      await import("@whiskeysockets/baileys");
    const { default: pino } = await import("pino");
    const { toDataURL }     = await import("qrcode");

    if (!fs.existsSync(waAuthDir)) fs.mkdirSync(waAuthDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(waAuthDir);
    const { version }          = await fetchLatestBaileysVersion();

    waStatus = "connecting";
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["Sanate Bot", "Chrome", "1.0"],
      syncFullHistory: true,
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        try { waQR = await toDataURL(qr); } catch {}
        waStatus = "connecting";
        console.log("[WA] QR generado");
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log("[WA] Conexion cerrada, loggedOut:", loggedOut, "code:", code);
        waStatus = "disconnected"; waQR = null; waPhone = ""; waSocket = null; waIniting = false;
        if (!loggedOut) setTimeout(initWhatsApp, 6000);
      } else if (connection === "open") {
        waStatus = "connected"; waQR = null;
        waPhone  = sock.user?.id?.split(":")[0] || sock.user?.id || "";
        console.log("[WA] Conectado:", waPhone);
      }
    });

    // ── Almacenar mensajes entrantes/salientes ─────────────────────────────
    sock.ev.on("messages.upsert", ({ messages: msgs, type }) => {
      for (const m of msgs) storeMsg(m);
    });

    // ── Historial inicial: últimos 15 días al reconectar ──────────────────
    sock.ev.on("messaging-history.set", ({ chats: histChats, messages: histMsgs }) => {
      console.log("[WA] Historial recibido: chats:", histChats?.length, "msgs:", histMsgs?.length);
      if (Array.isArray(histMsgs)) {
        for (const m of histMsgs) storeMsg(m);
      }
      if (Array.isArray(histChats)) {
        for (const c of histChats) {
          if (!waChats.has(c.id)) {
            waChats.set(c.id, {
              id:          c.id,
              name:        c.name || c.id.split("@")[0],
              phone:       c.id.split("@")[0],
              unread:      c.unreadCount || 0,
              lastMsg:     "",
              lastMsgTime: 0,
            });
          }
        }
      }
    });

    // ── Upsert de chats (lista inicial) ───────────────────────────────────
    sock.ev.on("chats.upsert", (chats) => {
      for (const c of chats) {
        if (!waChats.has(c.id)) {
          waChats.set(c.id, {
            id:          c.id,
            name:        c.name || c.id.split("@")[0],
            phone:       c.id.split("@")[0],
            unread:      c.unreadCount || 0,
            lastMsg:     "",
            lastMsgTime: 0,
          });
        }
      }
    });

    waSocket = sock;
  } catch (err) {
    console.error("[WA] Error init:", err?.message || err);
    waStatus = "disconnected"; waIniting = false;
    setTimeout(initWhatsApp, 10000);
  }
}

// Arrancar WhatsApp al iniciar
initWhatsApp();

// ── Rutas API WhatsApp ─────────────────────────────────────────────────────
app.get("/api/whatsapp/status", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  res.json({ status: waStatus, phone: waPhone });
});

app.get("/api/whatsapp/qr", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  res.json({ qr: waQR || null });
});

app.post("/api/whatsapp/logout", async (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    if (waSocket) { try { await waSocket.logout(); } catch {} }
    waSocket = null; waStatus = "disconnected"; waQR = null; waPhone = ""; waIniting = false;
    if (fs.existsSync(waAuthDir)) fs.rmSync(waAuthDir, { recursive: true, force: true });
    setTimeout(initWhatsApp, 1500);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e?.message });
  }
});

app.get("/api/whatsapp/chats", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const cutoff = Date.now() - WA_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const chats = Array.from(waChats.values())
    .filter(c => c.lastMsgTime > cutoff || c.lastMsgTime === 0)
    .sort((a, b) => b.lastMsgTime - a.lastMsgTime)
    .slice(0, 150)
    .map(c => ({
      id:          c.id,
      name:        c.name,
      phone:       c.phone,
      lastMsg:     c.lastMsg,
      lastMsgTime: c.lastMsgTime,
      unread:      c.unread || 0,
    }));
  res.json({ chats });
});

app.get("/api/whatsapp/messages/:id", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const jid  = req.params.id;
  const msgs = waMessages.get(jid)
             || waMessages.get(jid + "@s.whatsapp.net")
             || waMessages.get(jid + "@g.us")
             || [];
  // Marcar como leído
  const chat = waChats.get(jid) || waChats.get(jid + "@s.whatsapp.net");
  if (chat) chat.unread = 0;
  res.json({ messages: msgs.slice(-100) });
});

app.post("/api/whatsapp/send", async (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const { to, message } = req.body || {};
  if (!to || !message || !waSocket || waStatus !== "connected") {
    return res.status(400).json({ ok: false, error: "not_ready" });
  }
  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    await waSocket.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

// fallback SPA cuando hay build
if (fs.existsSync(buildDir)) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER ON :${PORT}`);
});







