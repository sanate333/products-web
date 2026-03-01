import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
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
const SERVER_BUILD = process.env.SERVER_BUILD || "2026-02-20-edit-fallback-dalle2";
const aiImagesStoreFile = path.join(generatedDir, "ai-images-store.json");
const whatsappDbFile = path.join(generatedDir, "whatsapp-db.json");
const whatsappUploadsDir = path.join(publicDir, "uploads", "whatsapp");
const whatsappSyncJobs = new Map();

if (!fs.existsSync(whatsappUploadsDir)) {
  fs.mkdirSync(whatsappUploadsDir, { recursive: true });
}
app.use("/uploads", express.static(path.join(publicDir, "uploads")));

function nowIso() {
  return new Date().toISOString();
}

function toSafeString(value, max = 400) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function randomId(prefix = "id") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function defaultWhatsAppDb() {
  return {
    chats: [],
    messages: [],
    templates: [
      {
        id: "tpl_welcome",
        name: "Bienvenida",
        body: "Hola {{nombre}}, bienvenido a sanate.store. ¿En qué te ayudo?",
        quickButtons: ["Catálogo", "Estado pedido", "Soporte"],
        createdAt: nowIso(),
      },
    ],
    triggers: [],
    sync: {
      lastRunAt: null,
      lastStartDate: null,
      runningJobId: null,
    },
  };
}

function readWhatsAppDb() {
  try {
    if (!fs.existsSync(whatsappDbFile)) return defaultWhatsAppDb();
    const raw = fs.readFileSync(whatsappDbFile, "utf-8");
    const parsed = JSON.parse(raw);
    const base = defaultWhatsAppDb();
    return {
      ...base,
      ...parsed,
      chats: Array.isArray(parsed?.chats) ? parsed.chats : [],
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
      templates: Array.isArray(parsed?.templates) ? parsed.templates : base.templates,
      triggers: Array.isArray(parsed?.triggers) ? parsed.triggers : [],
      sync: {
        ...base.sync,
        ...(parsed?.sync || {}),
      },
    };
  } catch {
    return defaultWhatsAppDb();
  }
}

function writeWhatsAppDb(db) {
  fs.writeFileSync(whatsappDbFile, JSON.stringify(db, null, 2), "utf-8");
}

function normalizePhoneLike(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function getChatDisplayName(chatId, fallback = "") {
  const cleaned = String(fallback || "").trim();
  if (cleaned) return cleaned;
  const id = String(chatId || "");
  if (id.includes("@")) return id.split("@")[0];
  return id || "Contacto";
}

function buildAvatarFallback(nameOrPhone = "") {
  const safe = encodeURIComponent(toSafeString(nameOrPhone || "Contacto", 40));
  return `https://ui-avatars.com/api/?name=${safe}&background=e5f3ff&color=1b4d7a&size=128`;
}

function ensureChat(db, incoming = {}) {
  const chatId = toSafeString(incoming.chatId || incoming.id || "", 140);
  if (!chatId) return null;
  const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
  const base = {
    chatId,
    name: getChatDisplayName(chatId, incoming.name || incoming.phone || ""),
    phone: normalizePhoneLike(incoming.phone || chatId),
    photoUrl: toSafeString(incoming.photoUrl || "", 800) || "",
    updatedAt: nowIso(),
    unreadCount: 0,
    lastMessagePreview: "",
    lastMessageAt: null,
  };
  if (idx < 0) {
    db.chats.push(base);
    return db.chats[db.chats.length - 1];
  }
  const chat = db.chats[idx];
  const merged = {
    ...chat,
    ...base,
    name: toSafeString(incoming.name || chat.name || base.name, 120) || base.name,
    phone: normalizePhoneLike(incoming.phone || chat.phone || base.phone),
    photoUrl: toSafeString(incoming.photoUrl || chat.photoUrl || "", 800),
    updatedAt: nowIso(),
  };
  db.chats[idx] = merged;
  return db.chats[idx];
}

function messageSortAsc(a, b) {
  return new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime();
}

function messageSortDesc(a, b) {
  return new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime();
}

function saveMessage(db, payload = {}) {
  const providerMessageId = toSafeString(payload.providerMessageId || payload.id || "", 200);
  if (!providerMessageId) {
    return { ok: false, reason: "missing_providerMessageId" };
  }
  const dedup = db.messages.find((m) => String(m.providerMessageId) === String(providerMessageId));
  if (dedup) {
    return { ok: true, dedup: true, message: dedup };
  }
  const chatId = toSafeString(payload.chatId || "", 140);
  if (!chatId) {
    return { ok: false, reason: "missing_chatId" };
  }
  const timestamp = payload.timestamp ? new Date(payload.timestamp).toISOString() : nowIso();
  const normalized = {
    id: providerMessageId,
    providerMessageId,
    chatId,
    from: toSafeString(payload.from || "", 140),
    to: toSafeString(payload.to || "", 140),
    timestamp,
    type: toSafeString(payload.type || "text", 40) || "text",
    text: toSafeString(payload.text || "", 4000),
    mediaUrl: toSafeString(payload.mediaUrl || "", 1200),
    mimeType: toSafeString(payload.mimeType || "", 160),
    fileName: toSafeString(payload.fileName || "", 240),
    status: toSafeString(payload.status || "sent", 40) || "sent",
    direction: toSafeString(payload.direction || "incoming", 40) || "incoming",
    rawPayload: payload.rawPayload ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.messages.push(normalized);
  const chat = ensureChat(db, {
    chatId,
    phone: normalized.from || normalized.to || chatId,
    name: payload.chatName || "",
    photoUrl: payload.photoUrl || "",
  });
  if (chat) {
    chat.lastMessageAt = normalized.timestamp;
    chat.lastMessagePreview = normalized.text || normalized.type || "media";
    chat.updatedAt = nowIso();
    if (normalized.direction === "incoming") {
      chat.unreadCount = Number(chat.unreadCount || 0) + 1;
    }
    if (!chat.photoUrl) {
      chat.photoUrl = buildAvatarFallback(chat.name || chat.phone || chat.chatId);
    }
  }
  console.log("[WA][saveMessage]", {
    providerMessageId: normalized.providerMessageId,
    chatId: normalized.chatId,
    type: normalized.type,
    status: normalized.status,
    direction: normalized.direction,
  });
  return { ok: true, dedup: false, message: normalized };
}

function paginateByCursor(items, cursor, limit) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const offset = Math.max(0, Number(cursor) || 0);
  const slice = items.slice(offset, offset + safeLimit);
  const nextCursor = offset + safeLimit < items.length ? String(offset + safeLimit) : null;
  return { items: slice, nextCursor, limit: safeLimit };
}

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

async function generateWithEditFallback({
  apiKey,
  preferredModel,
  imageBuffer,
  imageMime,
  prompt,
  size,
}) {
  const candidates = [];
  const seen = new Set();
  const pushCandidate = (m) => {
    const clean = String(m || "").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    candidates.push(clean);
  };

  pushCandidate(preferredModel);
  pushCandidate(process.env.OPENAI_EDIT_MODEL || "dall-e-2");
  pushCandidate("dall-e-2");

  let lastErr = null;
  for (const model of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await callOpenAIImageEditHttp({
        apiKey,
        model,
        imageBuffer,
        imageMime,
        prompt,
        size,
      });
      return { result, modelUsed: model, attempts: candidates };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(lastErr?.message || "Fallo al editar imagen con todos los modelos probados");
}

async function imageBufferToDataUrl(buffer, mime = "image/png") {
  if (!buffer) return "";
  return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
}

async function fetchImageUrlAsDataUrl(rawUrl) {
  try {
    const clean = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(clean)) return "";
    const resp = await fetch(clean);
    if (!resp.ok) return "";
    const mime = resp.headers.get("content-type") || "image/png";
    const arr = await resp.arrayBuffer();
    return `data:${mime};base64,${Buffer.from(arr).toString("base64")}`;
  } catch {
    return "";
  }
}

async function analyzeProductTypeHint({ imageDataUrl, fallback = "producto" }) {
  const mock = boolEnv(process.env.OPENAI_MOCK);
  if (!openai || mock || !imageDataUrl) return "";
  try {
    const visionModel = (process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini").trim();
    const response = await openai.responses.create({
      model: visionModel,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Identify the MAIN product category in this image for e-commerce generation.",
                "Return STRICT JSON only with keys: product_type, key_visual_traits.",
                "Examples product_type: shoe, sneaker, cream, bottle, supplement, soap.",
                "No markdown.",
              ].join(" "),
            },
            { type: "input_image", image_url: imageDataUrl },
          ],
        },
      ],
      max_output_tokens: 180,
    });
    const txt = String(response?.output_text || "").trim();
    if (!txt) return "";
    const parsed = JSON.parse(txt);
    const productType = safeText(parsed?.product_type || "", 60);
    const traits = safeText(parsed?.key_visual_traits || "", 220);
    if (!productType) return "";
    return [productType, traits ? `traits: ${traits}` : ""].filter(Boolean).join("; ");
  } catch {
    return safeText(fallback, 80);
  }
}

async function analyzeTemplateStyleHint({ imageDataUrl, template = "Hero" }) {
  const mock = boolEnv(process.env.OPENAI_MOCK);
  if (!openai || mock || !imageDataUrl) return "";
  try {
    const visionModel = (process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini").trim();
    const response = await openai.responses.create({
      model: visionModel,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Analyze this ${template} template style for product creatives.`,
                "Return STRICT JSON only with keys: style_rules.",
                "style_rules must be one concise sentence with layout, lighting, background, color mood.",
                "No markdown.",
              ].join(" "),
            },
            { type: "input_image", image_url: imageDataUrl },
          ],
        },
      ],
      max_output_tokens: 220,
    });
    const txt = String(response?.output_text || "").trim();
    if (!txt) return "";
    const parsed = JSON.parse(txt);
    return safeText(parsed?.style_rules || "", 320);
  } catch {
    return "";
  }
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
  templateStyleHint = "",
  productTypeHint = "",
  // cuando hay imagen de referencia, fuerza preservaciï¿½n
  useReferenceImage = false,
}) {
  const lang = String(language || "").toLowerCase().startsWith("es") ? "Spanish" : "English";

  const details = safeText(productDetails, 500);
  const angleS = safeText(angle, 200);
  const avatarS = safeText(avatar, 200);
  const extra = safeText(extraInstructions, 500);
  const templateHint = safeText(templateStyleHint, 320);
  const productHint = safeText(productTypeHint, 220);

  const preserveBlock = useReferenceImage
    ? [
        "IMPORTANT: Use the uploaded reference photo as the source of truth.",
        "Preserve the product identity: same shape, materials, colorway, proportions, unique details, seams, textures, and silhouette.",
        productHint
          ? `The generated subject MUST stay in the same product category: ${productHint}. Never replace with another product category.`
          : "",
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
    templateHint ? `Template style reference to follow: ${templateHint}.` : "",
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

// --- WhatsApp Bot API (persistencia local en generated/whatsapp-db.json)
app.get("/api/whatsapp/chats", (req, res) => {
  try {
    const db = readWhatsAppDb();
    const sorted = [...db.chats].sort((a, b) => {
      return new Date(b?.lastMessageAt || b?.updatedAt || 0).getTime()
        - new Date(a?.lastMessageAt || a?.updatedAt || 0).getTime();
    });
    const { items, nextCursor, limit } = paginateByCursor(sorted, req.query?.cursor, req.query?.limit);
    return res.json({
      ok: true,
      chats: items.map((chat) => ({
        ...chat,
        photoUrl: chat.photoUrl || buildAvatarFallback(chat.name || chat.phone || chat.chatId),
      })),
      nextCursor,
      limit,
      total: sorted.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get("/api/whatsapp/chats/:chatId/messages", (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    const db = readWhatsAppDb();
    const chat = db.chats.find((c) => String(c.chatId) === String(chatId));
    if (chat && !chat.photoUrl) {
      chat.photoUrl = buildAvatarFallback(chat.name || chat.phone || chat.chatId);
      writeWhatsAppDb(db);
    }
    const all = db.messages
      .filter((m) => String(m.chatId) === String(chatId))
      .sort(messageSortDesc);
    const { items, nextCursor, limit } = paginateByCursor(all, req.query?.cursor, req.query?.limit || 50);
    const asc = [...items].sort(messageSortAsc);
    return res.json({
      ok: true,
      chat: chat || null,
      messages: asc,
      nextCursor,
      limit,
      total: all.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/whatsapp/chats/:chatId/read", (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    const db = readWhatsAppDb();
    const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
    if (idx >= 0) {
      db.chats[idx].unreadCount = 0;
      db.chats[idx].updatedAt = nowIso();
      writeWhatsAppDb(db);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/whatsapp/chats/:chatId/send", upload.single("file"), async (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    const body = req.body || {};
    const text = toSafeString(body.text || body.message || "", 4000);
    let type = toSafeString(body.type || (text ? "text" : ""), 40).toLowerCase();
    let mediaUrl = toSafeString(body.mediaUrl || "", 1400);
    let mimeType = toSafeString(body.mimeType || "", 160);
    let fileName = toSafeString(body.fileName || "", 240);

    if (req.file?.buffer) {
      const ext = path.extname(req.file.originalname || "") || ".bin";
      const fname = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
      const fullPath = path.join(whatsappUploadsDir, fname);
      fs.writeFileSync(fullPath, req.file.buffer);
      mediaUrl = `/uploads/whatsapp/${fname}`;
      mimeType = req.file.mimetype || mimeType || "application/octet-stream";
      fileName = req.file.originalname || fname;
      if (!type) {
        if (mimeType.startsWith("image/")) type = "image";
        else if (mimeType.startsWith("video/")) type = "video";
        else if (mimeType.startsWith("audio/")) type = "audio";
        else type = "document";
      }
    }
    if (!type) type = "text";

    const db = readWhatsAppDb();
    const providerMessageId = toSafeString(body.providerMessageId || randomId("msg_out"), 220);
    const outgoing = {
      providerMessageId,
      chatId,
      from: "agent@sanate.store",
      to: chatId,
      timestamp: nowIso(),
      type,
      text,
      mediaUrl,
      mimeType,
      fileName,
      status: "queued",
      direction: "outgoing",
      rawPayload: body.rawPayload ?? null,
    };
    const saved = saveMessage(db, outgoing);
    if (!saved.ok) {
      return res.status(400).json({ ok: false, error: saved.reason || "no se pudo guardar mensaje" });
    }
    const msg = saved.message;

    // ── Intentar envío real por Baileys ──────────────────────────────────
    let waError = null;
    if (waSocket && waStatus === "connected") {
      try {
        const jid = chatId.includes("@") ? chatId : `${chatId}@s.whatsapp.net`;
        if (type === "text" || !mediaUrl) {
          await waSocket.sendMessage(jid, { text: text || "" });
        } else if (mediaUrl && type === "image") {
          const absPath = path.join(publicDir, mediaUrl.replace(/^\//, ""));
          await waSocket.sendMessage(jid, { image: { url: absPath }, caption: text || "" });
        } else if (mediaUrl && type === "video") {
          const absPath = path.join(publicDir, mediaUrl.replace(/^\//, ""));
          await waSocket.sendMessage(jid, { video: { url: absPath }, caption: text || "" });
        } else if (mediaUrl && type === "audio") {
          const absPath = path.join(publicDir, mediaUrl.replace(/^\//, ""));
          await waSocket.sendMessage(jid, { audio: { url: absPath }, ptt: true });
        } else if (mediaUrl && type === "document") {
          const absPath = path.join(publicDir, mediaUrl.replace(/^\//, ""));
          await waSocket.sendMessage(jid, { document: { url: absPath }, mimetype: mimeType || "application/octet-stream", fileName: fileName || "archivo" });
        }
        msg.status = "sent";
        console.log("[WA][sendMessage][baileys-ok]", { chatId, type });
      } catch (baileysErr) {
        waError = baileysErr?.message || String(baileysErr);
        msg.status = "failed";
        console.error("[WA][sendMessage][baileys-error]", waError);
      }
    } else {
      msg.status = "queued";
      console.log("[WA][sendMessage][no-socket]", { waStatus, chatId });
    }

    msg.updatedAt = nowIso();
    const idx = db.messages.findIndex((m) => String(m.providerMessageId) === String(msg.providerMessageId));
    if (idx >= 0) db.messages[idx] = msg;
    writeWhatsAppDb(db);
    console.log("[WA][sendMessage]", {
      chatId,
      providerMessageId: msg.providerMessageId,
      type: msg.type,
      status: msg.status,
      hasMedia: Boolean(msg.mediaUrl),
    });
    return res.json({ ok: true, message: msg, waError: waError || undefined });
  } catch (err) {
    console.log("[WA][sendMessage][error]", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/whatsapp/messages/:messageId/retry", (req, res) => {
  try {
    const messageId = toSafeString(req.params?.messageId || "", 220);
    const db = readWhatsAppDb();
    const idx = db.messages.findIndex((m) => String(m.providerMessageId) === String(messageId));
    if (idx < 0) return res.status(404).json({ ok: false, error: "mensaje no encontrado" });
    db.messages[idx].status = "sent";
    db.messages[idx].updatedAt = nowIso();
    writeWhatsAppDb(db);
    return res.json({ ok: true, message: db.messages[idx] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/whatsapp/webhook", (req, res) => {
  try {
    const body = req.body || {};
    console.log("[WA][incomingWebhook]", {
      type: body?.type || "message",
      hasMessagesArray: Array.isArray(body?.messages),
    });
    const db = readWhatsAppDb();
    const sourceMessages = Array.isArray(body?.messages) ? body.messages : [body];
    const accepted = [];
    const deduped = [];
    for (const item of sourceMessages) {
      const payload = {
        providerMessageId: toSafeString(item?.providerMessageId || item?.id || item?.key?.id || "", 220),
        chatId: toSafeString(item?.chatId || item?.from || item?.remoteJid || "", 140),
        from: toSafeString(item?.from || item?.sender || "", 140),
        to: toSafeString(item?.to || item?.recipient || "", 140),
        timestamp: item?.timestamp || nowIso(),
        type: toSafeString(item?.type || (item?.mediaUrl ? "document" : "text"), 40),
        text: toSafeString(item?.text || item?.body || item?.message || "", 4000),
        mediaUrl: toSafeString(item?.mediaUrl || "", 1200),
        mimeType: toSafeString(item?.mimeType || "", 160),
        status: toSafeString(item?.status || "delivered", 40),
        direction: "incoming",
        chatName: toSafeString(item?.chatName || item?.name || "", 120),
        photoUrl: toSafeString(item?.photoUrl || "", 800),
        rawPayload: item,
      };
      const saved = saveMessage(db, payload);
      if (saved.ok && saved.dedup) deduped.push(payload.providerMessageId);
      if (saved.ok && !saved.dedup) accepted.push(payload.providerMessageId);
    }
    writeWhatsAppDb(db);
    return res.json({ ok: true, accepted, deduped });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

function generateSyncSeed(startAt, endAt) {
  const rows = [];
  const names = ["Laura", "Mateo", "Carlos", "Ana", "Sofia", "Diego", "Paola", "Camilo", "Valentina", "Nicolas"];
  const totalChats = 28;
  const span = endAt.getTime() - startAt.getTime();
  for (let i = 0; i < totalChats; i += 1) {
    const phone = `57${3000000000 + i}`;
    const chatId = `${phone}@s.whatsapp.net`;
    const baseTs = new Date(startAt.getTime() + Math.floor(((i + 1) / (totalChats + 1)) * span));
    rows.push({
      chatId,
      name: `${names[i % names.length]} ${i + 1}`,
      phone,
      photoUrl: i % 3 === 0 ? "" : `https://i.pravatar.cc/120?img=${(i % 70) + 1}`,
      messages: [
        {
          providerMessageId: randomId("sync_in"),
          timestamp: new Date(baseTs.getTime() + 60 * 1000).toISOString(),
          direction: "incoming",
          type: "text",
          text: "Hola, necesito info del producto",
          status: "read",
        },
        {
          providerMessageId: randomId("sync_out"),
          timestamp: new Date(baseTs.getTime() + 3 * 60 * 1000).toISOString(),
          direction: "outgoing",
          type: "text",
          text: "Claro, te comparto detalles y precio.",
          status: "delivered",
        },
      ],
    });
  }
  return rows;
}

function runSyncJob({ startDate }) {
  const jobId = randomId("sync");
  const db = readWhatsAppDb();
  const job = {
    jobId,
    status: "running",
    startedAt: nowIso(),
    canceled: false,
    progress: 0,
    processedChats: 0,
    totalChats: 0,
    messageCount: 0,
    startDate,
  };
  whatsappSyncJobs.set(jobId, job);
  db.sync.runningJobId = jobId;
  db.sync.lastStartDate = startDate;
  writeWhatsAppDb(db);

  const fromDate = new Date(startDate);
  const toDate = new Date();
  const seed = generateSyncSeed(fromDate, toDate);
  job.totalChats = seed.length;

  let idx = 0;
  function tick() {
    const current = whatsappSyncJobs.get(jobId);
    if (!current || current.canceled) {
      const local = readWhatsAppDb();
      local.sync.runningJobId = null;
      writeWhatsAppDb(local);
      whatsappSyncJobs.set(jobId, {
        ...current,
        status: "canceled",
        finishedAt: nowIso(),
      });
      return;
    }
    if (idx >= seed.length) {
      const local = readWhatsAppDb();
      local.sync.runningJobId = null;
      local.sync.lastRunAt = nowIso();
      writeWhatsAppDb(local);
      whatsappSyncJobs.set(jobId, {
        ...current,
        status: "done",
        progress: 100,
        finishedAt: nowIso(),
      });
      return;
    }
    const chunk = seed.slice(idx, idx + 3);
    const local = readWhatsAppDb();
    for (const row of chunk) {
      const chat = ensureChat(local, row);
      if (chat && !chat.photoUrl) {
        chat.photoUrl = buildAvatarFallback(chat.name || chat.phone || chat.chatId);
      }
      for (const msg of row.messages) {
        const saved = saveMessage(local, {
          providerMessageId: msg.providerMessageId,
          chatId: row.chatId,
          from: msg.direction === "incoming" ? row.chatId : "agent@sanate.store",
          to: msg.direction === "incoming" ? "agent@sanate.store" : row.chatId,
          timestamp: msg.timestamp,
          type: msg.type,
          text: msg.text,
          status: msg.status,
          direction: msg.direction,
          chatName: row.name,
          photoUrl: row.photoUrl,
          rawPayload: { source: "sync15d" },
        });
        if (saved.ok && !saved.dedup) current.messageCount += 1;
      }
    }
    writeWhatsAppDb(local);
    idx += chunk.length;
    current.processedChats = Math.min(seed.length, idx);
    current.progress = Math.round((current.processedChats / seed.length) * 100);
    current.updatedAt = nowIso();
    whatsappSyncJobs.set(jobId, current);
    console.log("[WA][syncProgress]", {
      jobId,
      processedChats: current.processedChats,
      totalChats: current.totalChats,
      progress: current.progress,
    });
    setTimeout(tick, 250);
  }
  setTimeout(tick, 0);
  return job;
}

app.post("/api/whatsapp/sync", (req, res) => {
  try {
    const inputDate = req.body?.startDate ? new Date(req.body.startDate) : null;
    const defaultStart = new Date(Date.now() - (15 * 24 * 60 * 60 * 1000));
    const startDate = Number.isFinite(inputDate?.getTime()) ? inputDate.toISOString() : defaultStart.toISOString();
    const db = readWhatsAppDb();
    if (db.sync?.runningJobId && whatsappSyncJobs.get(db.sync.runningJobId)?.status === "running") {
      return res.status(409).json({ ok: false, error: "Ya existe una sincronizacion en curso", jobId: db.sync.runningJobId });
    }
    const job = runSyncJob({ startDate });
    return res.json({ ok: true, job });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get("/api/whatsapp/sync/status", (req, res) => {
  const jobId = toSafeString(req.query?.jobId || "", 120);
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId requerido" });
  const job = whatsappSyncJobs.get(jobId);
  if (!job) return res.status(404).json({ ok: false, error: "job no encontrado" });
  return res.json({ ok: true, job });
});

app.post("/api/whatsapp/sync/cancel", (req, res) => {
  const jobId = toSafeString(req.body?.jobId || "", 120);
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId requerido" });
  const job = whatsappSyncJobs.get(jobId);
  if (!job) return res.status(404).json({ ok: false, error: "job no encontrado" });
  job.canceled = true;
  job.updatedAt = nowIso();
  whatsappSyncJobs.set(jobId, job);
  return res.json({ ok: true, jobId, status: "canceling" });
});

app.get("/api/whatsapp/triggers", (req, res) => {
  const db = readWhatsAppDb();
  const triggers = [...db.triggers].sort((a, b) => {
    return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
  });
  return res.json({ ok: true, triggers });
});

app.post("/api/whatsapp/triggers", (req, res) => {
  try {
    const body = req.body || {};
    const db = readWhatsAppDb();
    const trigger = {
      id: randomId("trg"),
      name: toSafeString(body.name || "Nuevo disparador", 120) || "Nuevo disparador",
      isActive: Boolean(body.isActive ?? true),
      conditions: body.conditions && typeof body.conditions === "object" ? body.conditions : {},
      actions: body.actions && typeof body.actions === "object" ? body.actions : {},
      createdAt: nowIso(),
    };
    db.triggers.push(trigger);
    writeWhatsAppDb(db);
    return res.json({ ok: true, trigger });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.put("/api/whatsapp/triggers/:id", (req, res) => {
  try {
    const id = toSafeString(req.params?.id || "", 120);
    const body = req.body || {};
    const db = readWhatsAppDb();
    const idx = db.triggers.findIndex((t) => String(t.id) === String(id));
    if (idx < 0) return res.status(404).json({ ok: false, error: "trigger no encontrado" });
    db.triggers[idx] = {
      ...db.triggers[idx],
      ...body,
      id,
    };
    writeWhatsAppDb(db);
    return res.json({ ok: true, trigger: db.triggers[idx] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get("/api/whatsapp/templates", (req, res) => {
  const db = readWhatsAppDb();
  return res.json({ ok: true, templates: db.templates });
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
    { name: "templateImage", maxCount: 1 },
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
      const templateFile = Array.isArray(req.files?.templateImage) ? req.files.templateImage[0] : null;
      const templateImageUrl = safeText(body.templateImageUrl || "", 600);

      const productImageDataUrl = used_edit
        ? await imageBufferToDataUrl(file0.buffer, file0.mimetype || "image/png")
        : "";
      const templateImageDataUrl = templateFile?.buffer
        ? await imageBufferToDataUrl(templateFile.buffer, templateFile.mimetype || "image/png")
        : (templateImageUrl ? await fetchImageUrlAsDataUrl(templateImageUrl) : "");

      const productTypeHint = await analyzeProductTypeHint({
        imageDataUrl: productImageDataUrl,
        fallback: productName,
      });
      const templateStyleHint = await analyzeTemplateStyleHint({
        imageDataUrl: templateImageDataUrl,
        template,
      });

      const prompt_used = buildHighImpactPrompt({
        productName,
        template,
        language,
        size,
        productDetails,
        angle,
        avatar,
        extraInstructions,
        productTypeHint,
        templateStyleHint,
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
          const editRun = await generateWithEditFallback({
            apiKey: process.env.OPENAI_API_KEY,
            preferredModel: modelForEdit,
            imageBuffer: file0.buffer,
            imageMime: file0.mimetype || "image/png",
            prompt: prompt_used,
            size,
          });
          result = editRun.result;
          editMode = `http-edits:${editRun.modelUsed}`;
        } catch (editErr) {
          throw new Error(
            `No se pudo editar con imagen de referencia (${modelForEdit}): ${editErr?.message || editErr}`
          );
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
        product_type_hint: productTypeHint || "",
        template_style_hint: templateStyleHint || "",
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
    const productImageDataUrl = await imageBufferToDataUrl(req.file.buffer, req.file.mimetype || "image/png");
    const productTypeHint = await analyzeProductTypeHint({
      imageDataUrl: productImageDataUrl,
      fallback: productName,
    });

    const prompt_used = buildHighImpactPrompt({
      productName,
      template,
      language,
      size,
      productTypeHint,
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
      let editMode = "none";
      try {
        editMode = "http-edits";
        const editRun = await generateWithEditFallback({
          apiKey: process.env.OPENAI_API_KEY,
          preferredModel: modelForEdit,
          imageBuffer: req.file.buffer,
          imageMime: req.file.mimetype || "image/png",
          prompt: prompt_used,
          size,
        });
        result = editRun.result;
        editMode = `http-edits:${editRun.modelUsed}`;
      } catch (editErr) {
        throw new Error(
          `No se pudo editar con imagen de referencia (${modelForEdit}): ${editErr?.message || editErr}`
        );
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
        model_used: modelForEdit,
        edit_fallback: false,
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

  // Actualizar/crear chat en memoria
  const chat = waChats.get(jid) || { id: jid, name, phone: jid.split("@")[0], unread: 0, lastMsg: "", lastMsgTime: 0 };
  chat.name        = name;
  chat.lastMsg     = text;
  chat.lastMsgTime = ts;
  if (!fromMe) chat.unread = (chat.unread || 0) + 1;
  waChats.set(jid, chat);

  // Guardar mensaje en memoria
  const msgs  = waMessages.get(jid) || [];
  const msgId = msg.key?.id || `${ts}`;
  const isNew = !msgs.find(m => m.id === msgId);
  if (isNew) {
    msgs.push({
      id:   msgId,
      dir:  fromMe ? "s" : "r",
      txt:  text,
      time: new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      ts,
    });
    if (msgs.length > 300) msgs.splice(0, msgs.length - 300);
    waMessages.set(jid, msgs);
  }

  // ── Persistir en DB en disco (whatsapp-db.json) ───────────────────────────
  try {
    const db = readWhatsAppDb();
    const m  = msg.message || {};
    let type = "text";
    let mimeType = "";
    let fileName = "";
    if      (m.imageMessage)    { type = "image";    mimeType = m.imageMessage.mimetype    || "image/jpeg"; }
    else if (m.videoMessage)    { type = "video";    mimeType = m.videoMessage.mimetype    || "video/mp4";  }
    else if (m.audioMessage)    { type = "audio";    mimeType = m.audioMessage.mimetype    || "audio/ogg";  }
    else if (m.stickerMessage)  { type = "sticker";  mimeType = "image/webp"; }
    else if (m.documentMessage) { type = "document"; mimeType = m.documentMessage.mimetype || "application/octet-stream"; fileName = m.documentMessage.fileName || ""; }
    const saved = saveMessage(db, {
      providerMessageId: msgId,
      chatId:    jid,
      from:      fromMe ? (waPhone || "agent@sanate.store") : jid,
      to:        fromMe ? jid : (waPhone || "agent@sanate.store"),
      timestamp: new Date(ts).toISOString(),
      type,
      text,
      mediaUrl:  "",
      mimeType,
      fileName,
      status:    fromMe ? "sent" : "delivered",
      direction: fromMe ? "outgoing" : "incoming",
      chatName:  name,
      photoUrl:  "",
      rawPayload: { source: "baileys" },
    });
    if (saved.ok) writeWhatsAppDb(db);
    console.log("[WA][storeMsg][persist]", { msgId, chatId: jid, direction: fromMe ? "outgoing" : "incoming", dedup: saved.dedup });
  } catch (err) {
    console.error("[WA][storeMsg][persist-error]", err?.message || err);
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

// ── Rutas API WhatsApp (estado, QR, desvinculación) ───────────────────────
app.get("/api/whatsapp/status", (req, res) => {
  res.json({ ok: true, status: waStatus, phone: waPhone });
});

app.get("/api/whatsapp/qr", (req, res) => {
  res.json({ ok: true, qr: waQR || null, status: waStatus });
});

app.post("/api/whatsapp/logout", async (req, res) => {
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

app.post("/api/whatsapp/connect", (req, res) => {
  if (waStatus === "connected") return res.json({ ok: true, status: waStatus, phone: waPhone });
  if (!waIniting) initWhatsApp();
  res.json({ ok: true, status: waStatus });
});

// Foto de perfil vía Baileys (con caché en DB)
app.get("/api/whatsapp/chats/:chatId/photo", async (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    const db = readWhatsAppDb();
    const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
    let photoUrl = idx >= 0 ? db.chats[idx].photoUrl : "";
    // Intentar refrescar vía Baileys si hay socket
    if (waSocket && waStatus === "connected") {
      try {
        const jid = chatId.includes("@") ? chatId : `${chatId}@s.whatsapp.net`;
        photoUrl = await waSocket.profilePictureUrl(jid, "image") || "";
        if (photoUrl && idx >= 0) {
          db.chats[idx].photoUrl = photoUrl;
          writeWhatsAppDb(db);
        }
      } catch { /* sin foto o privada */ }
    }
    if (!photoUrl) photoUrl = buildAvatarFallback(idx >= 0 ? (db.chats[idx].name || db.chats[idx].phone || chatId) : chatId);
    return res.json({ ok: true, photoUrl });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// debug: store stats (no auth needed)
app.get("/ping", (req, res) => {
  res.json({ v: "2.1", chats: waChats.size, msgs: waMessages.size, status: waStatus, ts: Date.now() });
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







