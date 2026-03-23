import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-build React app if no build output exists (for Render deployment)
const pubHtmlIndex = path.join(__dirname, '..', 'public_html', 'index.html');
const buildIndex = path.join(__dirname, '..', 'build', 'index.html');
if (!fs.existsSync(pubHtmlIndex) && !fs.existsSync(buildIndex)) {
  console.log('No build found, running npm run build...');
  try {
    execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit', timeout: 300000 });
    console.log('Build completed successfully');
  } catch (e) {
    console.error('Build failed:', e.message);
  }
}

const app = express();
// Chrome Private Network Access: ANTES de cors() para que no sea interceptado
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-secret, Access-Control-Request-Private-Network');
  res.sendStatus(204);
});
app.use(cors({ origin: '*' }));
app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Private-Network', 'true'); next(); });
app.use(express.json({ limit: "20mb" }));

// Serve React build static files (public_html/ for local/Hostinger, build/ for Render)
const buildPath = fs.existsSync(path.join(__dirname, '..', 'public_html', 'index.html'))
  ? path.join(__dirname, '..', 'public_html')
  : path.join(__dirname, '..', 'build');
app.use('/static', express.static(path.join(buildPath, 'static'), { maxAge: '1y' }));
app.use(express.static(buildPath, { index: false }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
});

// carpetas
const publicDir = path.resolve(__dirname, "..", "public");
const buildDir = path.resolve(__dirname, "..", "build");
const generatedDir = path.resolve(__dirname, "..", "generated");

// asegÃ¯Â¿Â½rate que existan
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

// sirve estÃ¯Â¿Â½ticos
app.use("/generated", express.static(generatedDir));

// Si existe build, sirve React (producciÃÂ³n) desde ahÃÂ­
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

/** Llamar a OpenAI Chat Completions (usa la key del settings o env) */
async function callOpenAIChat({ messages, maxTokens = 400, settings = {} }) {
  const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const client = apiKey === process.env.OPENAI_API_KEY && openai
      ? openai
      : new OpenAI({ apiKey });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return r.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn("[callOpenAIChat] Error:", e?.message || e);
    return null;
  }
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
        body: "Hola {{nombre}}, bienvenido a sanate.store. Â¿En quÃ© te ayudo?",
        quickButtons: ["CatÃ¡logo", "Estado pedido", "Soporte"],
        createdAt: nowIso(),
      },
    ],
    triggers: [],
    sync: {
      lastRunAt: null,
      lastStartDate: null,
      runningJobId: null,
    },
    // ââ ConfiguraciÃ³n del bot (para Chrome cerrado vÃ­a n8n) ââââââââââ
    settings: {
      botEnabled:      false,
      n8nEnabled:      false,
      n8nWebhook:      "https://oasiss.app.n8n.cloud/webhook/whatsapp-sanate",
      backendPublicUrl: "",
      openaiKey:       "",
      systemPrompt:    "",
      // ââ Bot Nativo (flujo conversacional sin APIs externas) ââ
      nativeBotEnabled:  false,
      nativeBotWelcome:  "Â¡Hola {{nombre}}! ð Bienvenido/a a *Sanate Store* ð¿\nÂ¿En quÃ© te puedo ayudar hoy?",
      nativeBotMenu:     "1. ð Ver productos\n2. ð¦ Estado de mi pedido\n3. ð¬ Hablar con un asesor\n4. â¹ï¸ MÃ¡s informaciÃ³n",
      nativeBotMenuMap:  JSON.stringify({
        "1": { reply: "ð Puedes ver todo nuestro catÃ¡logo en:\nhttps://sanate.store\n\nÂ¿Te interesa algo en especial? EscrÃ­beme el nombre del producto ð", next: "free" },
        "2": { reply: "ð¦ Por favor envÃ­ame tu nÃºmero de pedido o tu nombre completo para buscarlo.", next: "free" },
        "3": { reply: "ð Â¡Perfecto! Un asesor te atenderÃ¡ pronto.\nMientras tanto, Â¿puedes contarme brevemente quÃ© necesitas?", next: "escalated" },
        "4": { reply: "â¹ï¸ Somos *Sanate Store* â productos naturales para tu bienestar ð¿\nð EnvÃ­os a todo el paÃ­s\nð³ Pagos seguros\nð Horario: Lun-SÃ¡b 8am-6pm\n\nÂ¿Algo mÃ¡s en lo que te pueda ayudar?", next: "menu" },
      }),
      nativeBotSessionTTL:   24,  // horas que dura una sesiÃ³n antes de reiniciar
      nativeBotEscalateWords: "agente,humano,persona,asesor,ayuda real,hablar con alguien",
      nativeBotReplyDelay:   800,  // ms de delay entre mensajes mÃºltiples
      nativeBotAskName:      true, // preguntar nombre si no lo tiene
      nativeBotAskNameMsg:   "Antes de continuar, Â¿cÃ³mo te llamas? ð",
      nativeBotFallback:     "No entendÃ­ tu mensaje ð Por favor elige una opciÃ³n del menÃº o escribe *menu* para verlas de nuevo.",
    },
    // ââ Bot Nativo: sesiones activas { [jid]: { step, name, data, createdAt, msgCount } }
    nativeBotSessions: {},
    // ââ Leads capturados
    leads: [],
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
      settings: {
        ...base.settings,
        ...(parsed?.settings || {}),
      },
    };
  } catch {
    return defaultWhatsAppDb();
  }
}

function writeWhatsAppDb(db) {
  fs.writeFileSync(whatsappDbFile, JSON.stringify(db, null, 2), "utf-8");
}

// ââ Limpieza de datos existentes al iniciar: corregir @lid nombres/phones ââ
(function cleanupExistingDb() {
  try {
    const db = readWhatsAppDb();
    let changed = false;
    for (const chat of db.chats) {
      const cId = chat.chatId || "";
      const rawNum = cId.split("@")[0];
      const cIsLid = cId.endsWith("@lid");
      const cIsGroup = cId.endsWith("@g.us");

      // Limpiar nombre: si es @lid y el nombre es solo el nÃºmero LID, poner "Contacto"
      if (cIsLid && chat.name && /^\d+$/.test(chat.name)) {
        chat.name = "Contacto";
        changed = true;
      }
      // Limpiar phone: si es @lid y el phone es el nÃºmero LID, limpiar
      if (cIsLid && chat.phone && chat.phone === rawNum) {
        chat.phone = "";
        changed = true;
      }
      // Asegurar isGroup
      if (cIsGroup && !chat.isGroup) {
        chat.isGroup = true;
        changed = true;
      }
    }
    if (changed) {
      writeWhatsAppDb(db);
      console.log("[DB] Limpieza de datos @lid completada");
    }
  } catch (e) {
    console.warn("[DB] Error en limpieza:", e?.message);
  }
})();

function normalizePhoneLike(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

/** Detecta si un JID es formato @lid (Linked Identity) de WhatsApp */
function isLidJid(jid) {
  return String(jid || "").endsWith("@lid");
}

/** Detecta si un string es solo dÃ­gitos (nÃºmero sin nombre real) */
function isJustDigits(s) {
  return /^\d+$/.test(String(s || "").trim());
}

function getChatDisplayName(chatId, fallback = "") {
  const cleaned = String(fallback || "").trim();
  // Si el fallback es un nombre real (no solo dÃ­gitos, no contiene @), usarlo
  if (cleaned && !isJustDigits(cleaned) && !cleaned.includes("@")) return cleaned;
  // Para @lid JIDs, NO usar el nÃºmero LID como nombre â es un ID interno sin sentido
  const id = String(chatId || "");
  if (isLidJid(id)) return cleaned || "Contacto";
  // Para @g.us, mostrar "Grupo"
  if (id.endsWith("@g.us")) return cleaned || "Grupo";
  // Para @s.whatsapp.net, usar el nÃºmero de telÃ©fono
  if (id.includes("@")) return cleaned || id.split("@")[0];
  return cleaned || id || "Contacto";
}

function buildAvatarFallback(nameOrPhone = "") {
  const safe = encodeURIComponent(toSafeString(nameOrPhone || "Contacto", 40));
  return `https://ui-avatars.com/api/?name=${safe}&background=e5f3ff&color=1b4d7a&size=128`;
}

function ensureChat(db, incoming = {}) {
  const chatId = toSafeString(incoming.chatId || incoming.id || "", 140);
  if (!chatId) return null;
  const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
  const isGroup = chatId.endsWith("@g.us");
  const isLid = isLidJid(chatId);
  const rawIdNum = chatId.split("@")[0];

  // Resolver nombre: para @lid NO usar el nÃºmero LID como nombre
  const incomingName = toSafeString(incoming.name || "", 120).trim();
  const incomingNameIsReal = incomingName && !isJustDigits(incomingName) && !incomingName.includes("@");
  const resolvedName = incomingNameIsReal
    ? incomingName
    : getChatDisplayName(chatId, incomingNameIsReal ? incomingName : "");

  // Para @lid, el phone solo debe ser un telÃ©fono real, no el ID LID
  const incomingPhone = incoming.phone || "";
  const phoneForBase = isLid
    ? (incomingPhone && !isLidJid(incomingPhone) && !incomingPhone.includes("@lid") ? normalizePhoneLike(incomingPhone) : "")
    : normalizePhoneLike(incomingPhone || chatId);

  const base = {
    chatId,
    name: resolvedName,
    phone: phoneForBase,
    photoUrl: toSafeString(incoming.photoUrl || "", 800) || "",
    updatedAt: nowIso(),
    unreadCount: 0,
    lastMessagePreview: "",
    lastMessageAt: null,
    isGroup,
  };
  if (idx < 0) {
    db.chats.push(base);
    return db.chats[db.chats.length - 1];
  }
  const chat = db.chats[idx];
  // No sobreescribir un nombre real con un nÃºmero o "Contacto"
  const existingNameIsReal = chat.name && !isJustDigits(chat.name) && !chat.name.includes("@") && chat.name !== "Contacto";
  const bestName = incomingNameIsReal ? incomingName : (existingNameIsReal ? chat.name : resolvedName);

  // Para phone, mantener el existente si era real y el nuevo es vacÃ­o o LID
  const bestPhone = phoneForBase || chat.phone || "";

  const merged = {
    ...chat,
    ...base,
    name: bestName,
    phone: bestPhone,
    photoUrl: toSafeString(incoming.photoUrl || chat.photoUrl || "", 800),
    updatedAt: nowIso(),
    isGroup,
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

// ---- PROMPT Ã¯Â¿Â½alto impactoÃ¯Â¿Â½ (sin texto)
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
  // cuando hay imagen de referencia, fuerza preservaciÃ¯Â¿Â½n
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
    "Camera look: DSLR/mirrorless, shallow depth of field (f/2.8Ã¯Â¿Â½f/4).",
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

// === WHATSAPP BOT PROXY ===
// Todas las rutas /api/whatsapp/* se redirigen al backend en Render
const WA_BACKEND = process.env.WA_BACKEND_URL || 'https://sanate-wa-bot.onrender.com';
const WA_BACKEND_SECRET = process.env.SECRET || '';

app.use('/api/whatsapp', async (req, res) => {
  try {
    const targetUrl = WA_BACKEND + req.originalUrl;
    const headers = { 'Content-Type': req.headers['content-type'] || 'application/json', 'Accept': req.headers.accept || '*/*' };
    if (WA_BACKEND_SECRET) headers['x-secret'] = WA_BACKEND_SECRET;
    if (req.originalUrl.includes('/events')) {
      const https = await import('https');
      const url = new URL(targetUrl);
      const proxyReq = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'GET', headers: { ...headers, 'Accept': 'text/event-stream' } }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': req.headers.origin || '*', 'Access-Control-Allow-Credentials': 'true' });
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (e) => { if (!res.headersSent) res.status(502).json({ error: 'Backend no disponible' }); });
      req.on('close', () => proxyReq.destroy());
      proxyReq.end();
      return;
    }
    const fetchOpts = { method: req.method, headers };
    if (['POST','PUT','PATCH'].includes(req.method) && req.body) fetchOpts.body = JSON.stringify(req.body);
    const response = await fetch(targetUrl, fetchOpts);
    const ct = response.headers.get('content-type') || '';
    res.status(response.status);
    if (ct.includes('json')) { res.json(await response.json()); }
    else if (ct.includes('image')) { res.set('Content-Type', ct); res.send(Buffer.from(await response.arrayBuffer())); }
    else { res.set('Content-Type', ct); res.send(await response.text()); }
  } catch (err) { console.error('WA proxy error:', err.message); res.status(502).json({ error: 'WhatsApp backend no disponible', details: err.message }); }
});

// --- WhatsApp Bot API (persistencia local en generated/whatsapp-db.json)
app.get("/api/whatsapp/chats", (req, res) => {
  try {
    const db = readWhatsAppDb();
    let filtered = [...db.chats];

    // ââ Asegurar que cada chat tenga isGroup correctamente ââ
    filtered = filtered.map(c => ({
      ...c,
      isGroup: c.isGroup || (c.chatId || "").endsWith("@g.us"),
    }));

    // ââ Limpiar nombres: para @lid no mostrar nÃºmeros LID como nombre ââ
    filtered = filtered.map(c => {
      const cId = c.chatId || "";
      const rawNum = cId.split("@")[0];
      let name = c.name || "";
      // Si el nombre es solo el nÃºmero LID o vacÃ­o, y es @lid, poner "Contacto"
      if (isLidJid(cId) && (!name || name === rawNum || isJustDigits(name))) {
        // Intentar buscar en memoria por si hay un pushName mÃ¡s reciente
        const memChat = waChats.get(cId);
        const memName = memChat?.name || "";
        name = (memName && !isJustDigits(memName) && memName !== "Contacto") ? memName : "Contacto";
      }
      // Para @s.whatsapp.net, si nombre es solo un nÃºmero, usar el telÃ©fono
      if (cId.endsWith("@s.whatsapp.net") && isJustDigits(name)) {
        const memChat = waChats.get(cId);
        name = memChat?.name || name;
      }
      return { ...c, name };
    });

    // ââ Filtro por tipo: "individual", "group", o "all" (default) ââ
    const typeFilter = (req.query?.type || "all").toLowerCase();
    if (typeFilter === "individual") {
      filtered = filtered.filter(c => !c.isGroup);
    } else if (typeFilter === "group") {
      filtered = filtered.filter(c => c.isGroup);
    }

    // ââ Solo mostrar chats que tienen al menos un mensaje (activos) ââ
    // Excepto si se pide explÃ­citamente todos con ?includeEmpty=true
    const includeEmpty = req.query?.includeEmpty === "true";
    if (!includeEmpty) {
      filtered = filtered.filter(c => c.lastMessageAt || c.lastMessagePreview);
    }

    // ââ BÃºsqueda por nombre o telÃ©fono âââââââââââââââââââââââââââââ
    const q = (req.query?.q || req.query?.search || "").trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/[^\d]/g, "");
      filtered = filtered.filter((c) => {
        const name  = (c.name || "").toLowerCase();
        const phone = (c.phone || c.chatId || "").replace(/[^\d]/g, "");
        return name.includes(q) || phone.includes(qDigits) || (c.chatId || "").toLowerCase().includes(q);
      });
    }
    const sorted = filtered.sort((a, b) => {
      return new Date(b?.lastMessageAt || b?.updatedAt || 0).getTime()
        - new Date(a?.lastMessageAt || a?.updatedAt || 0).getTime();
    });
    // Default 50 chats (solo activos, no todos)
    const { items, nextCursor, limit } = paginateByCursor(sorted, req.query?.cursor, req.query?.limit || 50);
    return res.json({
      ok: true,
      chats: items.map((chat) => ({
        ...chat,
        isGroup: chat.isGroup || (chat.chatId || "").endsWith("@g.us"),
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

    // ââ Intentar envÃ­o real por Baileys ââââââââââââââââââââââââââââââââââ
    let waError = null;
    if (waSocket && waStatus === "connected") {
      // Anti-detecciÃ³n: verificar rate limit
      if (!canSendMessage()) {
        msg.status = "rate_limited";
        return res.status(429).json({ ok: false, error: "Rate limit alcanzado. Espera antes de enviar mÃ¡s mensajes.", message: msg });
      }
      try {
        const jid = chatId.includes("@") ? chatId : `${chatId}@s.whatsapp.net`;
        recordMessageSent(); // Registrar envÃ­o
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

// ââ ConfiguraciÃ³n del bot para Chrome cerrado (n8n + openaiKey + prompt) ââ
app.get("/api/whatsapp/settings", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    // Nunca devolver openaiKey completa: enmascarar por seguridad
    const s = { ...(db.settings || {}) };
    if (s.openaiKey) s.openaiKey = s.openaiKey.substring(0, 8) + "****";
    return res.json({ ok: true, settings: s });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/whatsapp/settings", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    const allowed = [
      "botEnabled", "n8nEnabled", "n8nWebhook", "backendPublicUrl", "openaiKey", "systemPrompt",
      "aiContactMap",
      "nativeBotEnabled", "nativeBotWelcome", "nativeBotMenu", "nativeBotMenuMap",
      "nativeBotSessionTTL", "nativeBotEscalateWords", "nativeBotReplyDelay",
      "nativeBotAskName", "nativeBotAskNameMsg", "nativeBotFallback",
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    }
    db.settings = { ...(db.settings || {}), ...patch };
    writeWhatsAppDb(db);
    console.log("[WA][settings] Actualizado:", Object.keys(patch).join(", "));
    const masked = { ...db.settings };
    if (masked.openaiKey) masked.openaiKey = "****";
    return res.json({ ok: true, settings: masked });
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
// - image: (file)             <-- tambiÃ¯Â¿Â½n soportado
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
        // Guardamos temporalmente para crear readStream (mÃ¯Â¿Â½s compatible)
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

      // Preferimos guardar base64 para servirlo nosotros (mÃ¯Â¿Â½s estable)
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

// Save externally-generated image (e.g. Pollinations) to the store
app.post("/api/ai-images/save-external", express.json(), (req, res) => {
  try {
    const { userId = "admin", productId = "general", productName, template, url: imageUrl, prompt } = req.body || {};
    if (!imageUrl) return res.status(400).json({ ok: false, error: "url requerida" });
    const store = loadAiImagesStore();
    const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      userId: safeText(userId, 60) || "admin",
      productId: safeText(productId, 80) || "general",
      productName: safeText(productName, 200) || "Producto",
      template: safeText(template, 50) || "Hero",
      url: imageUrl,
      prompt_used: safeText(prompt, 2000) || "",
      source: "external",
      createdAt: new Date().toISOString(),
    };
    store.push(record);
    saveAiImagesStore(store);
    return res.json({ ok: true, image_id: id, image_url: imageUrl });
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
  { id: 2, nombre: "Camiseta Sport", name: "Camiseta Sport", precio: 29.99, price: 29.99, imagen: "https://via.placeholder.com/300?text=Camiseta", image: "https://via.placeholder.com/300?text=Camiseta", categoria: "nuevos", category: "nuevos", descripcion: "Transpirable y cÃÂ³moda." },
  { id: 3, nombre: "Reloj Inteligente", name: "Reloj Inteligente", precio: 150.00, price: 150.00, imagen: "https://via.placeholder.com/300?text=Reloj", image: "https://via.placeholder.com/300?text=Reloj", categoria: "destacados", category: "destacados", descripcion: "Conecta con tu vida." },
  { id: 4, nombre: "Mochila Urbana", name: "Mochila Urbana", precio: 45.50, price: 45.50, imagen: "https://via.placeholder.com/300?text=Mochila", image: "https://via.placeholder.com/300?text=Mochila", categoria: "ofertas", category: "ofertas", descripcion: "Para el dÃÂ­a a dÃÂ­a." }
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

// Rutas Productos y CategorÃÂ­as
app.get('/api/categories', (req, res) => {
  console.log("[API] GET /api/categories - Enviando", MOCK_CATEGORIAS.length, "categorÃÂ­as");
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

// ââ WhatsApp Bot (Baileys) ââââââââââââââââââââââââââââââââââââââââââââââââââ
const WA_SECRET = process.env.WA_SECRET || "sanate_secret_2025";
const waAuthDir = path.join(generatedDir, "wa-auth");

let waSocket        = null;
let waStatus        = "disconnected"; // 'disconnected' | 'connecting' | 'connected'
let waQR            = null;           // data-url PNG
let waPhone         = "";
let waIniting       = false;
let downloadMediaFn = null; // set after Baileys dynamic import
let waReconnectAttempt = 0; // for exponential backoff

// ââ Anti-detecciÃ³n: Rate limiter global de mensajes âââââââââââââââââââââââââ
// MÃ¡ximo 20 mensajes por minuto, 200 por hora (WhatsApp limita mÃ¡s bajo para nuevos)
const _msgTimestamps = [];
const MSG_PER_MINUTE = 20;
const MSG_PER_HOUR   = 200;
function canSendMessage() {
  const now = Date.now();
  // Limpiar timestamps viejos (>1 hora)
  while (_msgTimestamps.length && _msgTimestamps[0] < now - 3600_000) _msgTimestamps.shift();
  if (_msgTimestamps.length >= MSG_PER_HOUR) {
    console.warn("[WA][rate-limit] â  LÃ­mite por hora alcanzado. Protegiendo cuenta.");
    return false;
  }
  const lastMinute = _msgTimestamps.filter(t => t > now - 60_000);
  if (lastMinute.length >= MSG_PER_MINUTE) {
    console.warn("[WA][rate-limit] â  LÃ­mite por minuto alcanzado. Esperando...");
    return false;
  }
  return true;
}
function recordMessageSent() { _msgTimestamps.push(Date.now()); }

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ââ BOT NATIVO: Motor de flujo conversacional (sin APIs externas) âââââââ
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Estados (steps): "new" â "ask_name" â "menu" â "free" â "escalated"
// - "new":       primera vez que escribe â se le da bienvenida
// - "ask_name":  esperando que diga su nombre
// - "menu":      esperando que elija del menÃº
// - "free":      conversaciÃ³n libre (esperando input abierto)
// - "escalated": derivado a humano â el bot ya no responde

const nativeBotSessions = new Map();

// Cargar sesiones persistidas al iniciar
try {
  const _db = readWhatsAppDb();
  if (_db.nativeBotSessions && typeof _db.nativeBotSessions === "object") {
    for (const [k, v] of Object.entries(_db.nativeBotSessions)) {
      nativeBotSessions.set(k, v);
    }
    console.log("[NativeBot] Cargadas", nativeBotSessions.size, "sesiones desde DB");
  }
} catch {}

function persistNativeBotSessions() {
  try {
    const db = readWhatsAppDb();
    db.nativeBotSessions = Object.fromEntries(nativeBotSessions);
    writeWhatsAppDb(db);
  } catch {}
}

/** Guardar un lead capturado en la DB */
function saveLead(leadData) {
  try {
    const db = readWhatsAppDb();
    if (!db.leads) db.leads = [];
    db.leads.push({
      id:         randomId("lead_"),
      ...leadData,
      source:     "native-bot",
      capturedAt: nowIso(),
    });
    if (db.leads.length > 500) db.leads = db.leads.slice(-500);
    writeWhatsAppDb(db);
    console.log("[NativeBot][lead]", leadData.phone, leadData.name);
  } catch (err) {
    console.error("[NativeBot][lead-error]", err?.message || err);
  }
}

/** Comprobar si la sesiÃ³n expirÃ³ */
function nativeBotSessionExpired(session, ttlHours) {
  if (!session?.createdAt) return true;
  const ttl = (ttlHours || 24) * 60 * 60 * 1000;
  return Date.now() - new Date(session.createdAt).getTime() > ttl;
}

/** Comprobar si el mensaje pide escalar a un humano */
function shouldEscalate(text, escalateWords) {
  if (!escalateWords) return false;
  const words = escalateWords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
  const lc = text.toLowerCase().trim();
  return words.some(w => lc.includes(w));
}

/** Detectar nombre de un texto corto (heurÃ­stica simple) */
function extractNameFromText(text) {
  const clean = (text || "").trim();
  // Si es muy largo (>50 chars) probablemente no es un nombre
  if (clean.length > 50) return null;
  // Remover "me llamo", "soy", "mi nombre es", etc.
  const stripped = clean
    .replace(/^(me llamo|soy|mi nombre es|hola,?\s*(me llamo|soy)?)\s*/i, "")
    .replace(/^(i'?m|my name is|i am)\s*/i, "")
    .trim();
  if (!stripped || stripped.length < 2 || stripped.length > 40) return null;
  // Si tiene mÃ¡s de 4 palabras, probablemente no es un nombre
  if (stripped.split(/\s+/).length > 4) return null;
  // Capitalizar primera letra de cada palabra
  return stripped.replace(/\b\w/g, c => c.toUpperCase());
}

/** Reemplazar variables en template: {{nombre}}, {{telefono}} */
function templateReplace(template, vars) {
  return (template || "").replace(/\{\{(\w+)\}\}/g, (m, key) => {
    return vars[key] !== undefined ? vars[key] : m;
  });
}

/** Parsear el menuMap (JSON string â objeto) */
function parseMenuMap(menuMapStr) {
  try {
    if (typeof menuMapStr === "object") return menuMapStr;
    return JSON.parse(menuMapStr || "{}");
  } catch {
    return {};
  }
}

/**
 * Motor principal del bot nativo.
 * Recibe un mensaje y devuelve las respuestas a enviar.
 * NO hace fetch a ninguna API externa.
 */
function handleNativeBotMessage(jid, messageText, pushName, settings) {
  const text = (messageText || "").trim();
  const ttl = settings.nativeBotSessionTTL || 24;
  const phone = jid.split("@")[0];

  // Obtener o crear sesiÃ³n
  let session = nativeBotSessions.get(jid);

  // Si sesiÃ³n expirada â reset
  if (session && nativeBotSessionExpired(session, ttl)) {
    console.log("[NativeBot][session-expired]", jid);
    session = null;
    nativeBotSessions.delete(jid);
  }

  // ââ EscalaciÃ³n a humano (funciona en cualquier estado) ââ
  if (shouldEscalate(text, settings.nativeBotEscalateWords)) {
    console.log("[NativeBot][escalate]", jid);
    if (session) session.step = "escalated";
    else {
      session = { step: "escalated", name: pushName || "", phone, createdAt: nowIso(), msgCount: 1 };
      nativeBotSessions.set(jid, session);
    }
    persistNativeBotSessions();
    return ["ð Â¡Entendido! Te voy a comunicar con un asesor humano.", "Un momento por favor, alguien del equipo te atenderÃ¡ pronto ð"];
  }

  // ââ Si estÃ¡ escalado, el bot NO responde (lo atiende un humano) ââ
  if (session?.step === "escalated") {
    return []; // silencio â el humano responde
  }

  // ââ NUEVA CONVERSACIÃN â capturar lead y enviar a IA ââ
  if (!session) {
    const detectedName = pushName || extractNameFromText(text) || "";
    session = {
      step:      "ai",
      name:      detectedName,
      phone,
      createdAt: nowIso(),
      msgCount:  1,
      firstMsg:  text,
    };
    nativeBotSessions.set(jid, session);
    saveLead({ phone, name: detectedName, interest: text });
    persistNativeBotSessions();
    return { needsAI: true, context: `Primera vez que escribe. Se llama "${detectedName || "desconocido"}". SalÃºdalo cÃ¡lidamente por su nombre si lo tienes.` };
  }

  // ââ ConversaciÃ³n existente â todo va a IA ââ
  session.msgCount = (session.msgCount || 0) + 1;
  session.step = "ai";

  // Actualizar lead si tenemos info nueva
  if (pushName && !session.name) {
    session.name = pushName;
    saveLead({ phone, name: pushName, interest: text });
  }

  persistNativeBotSessions();
  return { needsAI: true, context: `Cliente "${session.name || "desconocido"}", mensaje #${session.msgCount}.` };
}

// ââ Chat store en memoria âââââââââââââââââââââââââââââââââââââââââââââââââââ
const WA_HISTORY_DAYS = 15;
const waChats    = new Map(); // jid â { id, name, phone, lastMsg, lastMsgTime, unread }
const waMessages = new Map(); // jid â [{ id, dir, txt, time, ts }]

// ── SSE real-time push ──────────────────────────────────────────────────
const sseClients = new Set();
function broadcastSSE(type, payload) {
  if (!sseClients.size) return;
  const msg = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const c of [...sseClients]) {
    try { c.res.write(msg); } catch { sseClients.delete(c); }
  }
}

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

async function storeMsg(msg) {
  const jid = msg?.key?.remoteJid;
  if (!jid || jid === "status@broadcast") return;

  const ts      = Number(msg.messageTimestamp || 0) * 1000 || Date.now();
  const cutoff  = Date.now() - WA_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  if (ts < cutoff) return;

  const text    = extractText(msg);
  const fromMe  = Boolean(msg.key?.fromMe);
  const isGroup = jid.endsWith("@g.us");
  const isLid   = isLidJid(jid);
  const rawIdNum = jid.split("@")[0];

  // ââ ResoluciÃ³n de nombre mejorada (soporta WhatsApp Business + @lid) ââ
  // Prioridad: pushName > verifiedName > cachedName (si es real) > "Contacto" (para @lid) o telÃ©fono (para @s.whatsapp.net)
  const pushName = (!fromMe && msg.pushName) ? msg.pushName.trim() : "";
  const verifiedName = (msg.verifiedBizName || "").trim();
  const cachedName = waChats.get(jid)?.name || "";
  const cachedNameIsReal = cachedName && !isJustDigits(cachedName) && !cachedName.includes("@") && cachedName !== "Contacto";

  // Para @lid JIDs, el rawIdNum NO es un telÃ©fono â no usarlo como nombre
  const fallbackName = isLid ? "Contacto" : (isGroup ? "Grupo" : rawIdNum);
  const resolvedName = pushName || verifiedName || (cachedNameIsReal ? cachedName : "") || fallbackName;
  const name = resolvedName;

  // Actualizar/crear chat en memoria
  const cachedPhone = waChats.get(jid)?.phone || "";
  const phoneForChat = isLid ? cachedPhone : rawIdNum;
  const chat = waChats.get(jid) || { id: jid, name: resolvedName, phone: phoneForChat, unread: 0, lastMsg: "", lastMsgTime: 0, isGroup };

  // Solo actualizar nombre si tenemos uno real (no sobreescribir nombre bueno con "Contacto" o nÃºmero)
  const pushNameIsReal = pushName && !isJustDigits(pushName);
  if (pushNameIsReal) chat.name = pushName;
  else if (verifiedName) chat.name = verifiedName;
  else if (!chat.name || isJustDigits(chat.name) || chat.name === "Contacto") chat.name = resolvedName;

  chat.lastMsg     = text;
  chat.lastMsgTime = ts;
  if (!fromMe) chat.unread = (chat.unread || 0) + 1;
  waChats.set(jid, chat);
  broadcastSSE("chat_update", { chatId: jid, name: chat.name, phone: chat.phone || "", lastMsg: text, lastMsgTime: ts, unread: chat.unread, isGroup });

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

  // ââ Persistir en DB en disco (whatsapp-db.json) âââââââââââââââââââââââââââ
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

    // ââ Descargar media si hay adjunto âââââââââââââââââââââââââââââââââââââ
    let mediaUrl = "";
    if (type !== "text" && type !== "sticker" && downloadMediaFn) {
      try {
        const buf  = await downloadMediaFn(msg, "buffer", {});
        const ext  = (mimeType.split("/")[1] || "bin").split(";")[0];
        const fname = `${msgId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
        const fpath = path.join(whatsappUploadsDir, fname);
        fs.writeFileSync(fpath, buf);
        mediaUrl = `/uploads/whatsapp/${fname}`;
        console.log("[WA][storeMsg][media-saved]", fname);
      } catch (dlErr) {
        console.warn("[WA][storeMsg][media-download-failed]", dlErr?.message || dlErr);
      }
    }

    const saved = saveMessage(db, {
      providerMessageId: msgId,
      chatId:    jid,
      from:      fromMe ? (waPhone || "agent@sanate.store") : jid,
      to:        fromMe ? jid : (waPhone || "agent@sanate.store"),
      timestamp: new Date(ts).toISOString(),
      type,
      text,
      mediaUrl,
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

    // ââ ReenvÃ­o a n8n si botEnabled + n8nEnabled (opera con Chrome cerrado) â
    const settings = db.settings || {};
    // isGroup ya definido arriba (lÃ­nea resoluciÃ³n de nombres)
    // ââ Verificar si la IA estÃ¡ activa para este chat (per-chat map) ââ
    // botEnabled = toggle global "IA ON" del frontend
    // aiContactMap = per-chat map { [jid]: true/false }
    const aiContactMap = settings.aiContactMap || {};
    const hasPerChatMap = Object.keys(aiContactMap).length > 0;
    // La IA estÃ¡ activa si: (1) toggle global ON, Y (2) chat activado explÃ­citamente
    // Si no hay mapa per-chat (legacy), NO activar para nadie (seguridad)
    const aiActiveForChat = settings.botEnabled && hasPerChatMap && aiContactMap[jid] === true;

    // SEGURIDAD: NUNCA responder a grupos automÃ¡ticamente
    if (isGroup) {
      // Solo almacenar, no responder
    } else if (!fromMe && isNew && !saved.dedup && settings.n8nEnabled && settings.n8nWebhook && aiActiveForChat) {
      const publicBase = (settings.backendPublicUrl || "").replace(/\/$/, "");
      const mediaFull = (url) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${publicBase}${url.startsWith("/") ? "" : "/"}${url}`;
      };
      const msgType =
        type === "audio"   ? "audio" :
        (type === "image" || type === "sticker") ? "image" : "text";

      // ââ FIX: Construir historial de Ãºltimos 10 mensajes para contexto IA ââ
      const chatMsgs = db.messages
        .filter(m => String(m.chatId) === String(jid))
        .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
        .slice(-10)
        .map(m => ({
          role: m.direction === "outgoing" ? "assistant" : "user",
          content: m.text || "[media]",
        }));

      const n8nPayload = {
        chatId:        jid,
        messageType:   msgType,
        text,
        audioUrl:      msgType === "audio" ? mediaFull(mediaUrl) : "",
        imageUrl:      msgType === "image" ? mediaFull(mediaUrl) : "",
        clientName:    name,
        systemPrompt:  settings.systemPrompt || "",
        openaiKey:     settings.openaiKey || process.env.OPENAI_API_KEY || "",
        backendUrl:    publicBase ? `${publicBase}/api/whatsapp` : "",
        backendSecret: WA_SECRET,
        history:       chatMsgs,
        source:        "backend-baileys",
      };

      // ââ FIX: Retry lÃ³gica â hasta 2 reintentos con backoff ââ
      const callN8n = async (attempt = 1) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          const r = await fetch(settings.n8nWebhook, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(n8nPayload),
            signal:  controller.signal,
          });
          clearTimeout(timeout);
          const data = await r.json().catch(() => ({}));
          const replyText = data?.reply || data?.text || data?.message || data?.output || "";
          console.log("[WA][n8n-forward][ok]", { chatId: jid, msgType, hasReply: !!replyText, attempt });

          // ââ Enviar respuesta de n8n directamente por Baileys ââââââââââââââ
          if (replyText && waSocket && waStatus === "connected") {
            try {
              // FIX: usar separador |||| que es el que usa el workflow n8n
              const parts = replyText.split(/\|\|\|\|/).map(p => p.trim()).filter(Boolean);
              const toSend = parts.length > 0 ? parts : [replyText.trim()];

              // Anti-detecciÃ³n: verificar rate limit antes de responder
              if (!canSendMessage()) {
                console.warn("[WA][n8n-auto-reply] Rate limit alcanzado, no se envÃ­a respuesta");
                return;
              }

              // Anti-detecciÃ³n: simular "escribiendo..." antes de responder
              try { await waSocket.presenceSubscribe(jid); } catch {}
              try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
              // Delay proporcional al largo del texto (simula lectura + escritura humana)
              const typingDelay = Math.min(800 + Math.floor(Math.random() * 2000) + toSend[0].length * 30, 8000);
              await new Promise(r => setTimeout(r, typingDelay));

              for (const part of toSend) {
                if (!canSendMessage()) break; // Rate limit check per-part
                recordMessageSent();
                await waSocket.sendMessage(jid, { text: part });

                // ââ FIX: Guardar cada parte del reply del bot en la DB ââââââ
                const replyMsgId = randomId("n8n_reply");
                saveMessage(readWhatsAppDb(), {
                  providerMessageId: replyMsgId,
                  chatId:    jid,
                  from:      waPhone || "agent@sanate.store",
                  to:        jid,
                  timestamp: nowIso(),
                  type:      "text",
                  text:      part,
                  status:    "sent",
                  direction: "outgoing",
                  chatName:  name,
                  rawPayload: { source: "n8n-auto-reply" },
                });
                const freshDb = readWhatsAppDb();
                writeWhatsAppDb(freshDb);

                // Anti-detecciÃ³n: delay humano entre partes
                if (toSend.length > 1) {
                  try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
                  const partDelay = 1200 + Math.floor(Math.random() * 2500); // 1.2-3.7s
                  await new Promise(res => setTimeout(res, partDelay));
                }
              }
              // Anti-detecciÃ³n: quitar estado "escribiendo"
              try { await waSocket.sendPresenceUpdate("paused", jid); } catch {}
              console.log("[WA][n8n-auto-reply][sent]", { chatId: jid, parts: toSend.length });
            } catch (sendErr) {
              console.warn("[WA][n8n-auto-reply][error]", sendErr?.message || sendErr);
            }
          }
        } catch (e) {
          console.warn(`[WA][n8n-forward][fail][attempt=${attempt}]`, e?.message || e);
          if (attempt < 3) {
            const delay = attempt * 3000; // 3s, 6s
            console.log(`[WA][n8n-forward][retry] attempt ${attempt + 1} in ${delay}ms`);
            await new Promise(res => setTimeout(res, delay));
            return callN8n(attempt + 1);
          }
          console.error("[WA][n8n-forward][exhausted] all retries failed for", jid);
        }
      };
      callN8n();
    }

    // ââ Bot Nativo: flujo conversacional ââââââââââââââââââââââââââââââââ
    // Solo responde si:
    // 1. NO es grupo (nunca responder en grupos)
    // 2. nativeBotEnabled estÃ¡ ON (toggle global en Ajustes)
    // 3. La IA estÃ¡ activa per-chat (aiContactMap[jid] === true) Y botEnabled global ON
    // NUNCA modo legacy (responder a todos) â requiere activaciÃ³n explÃ­cita per-chat
    const nbActiveForChat = !isGroup && settings.nativeBotEnabled && aiActiveForChat;
    if (!fromMe && isNew && !saved.dedup && nbActiveForChat) {
      const replyDelay = Math.max(300, Math.min(3000, settings.nativeBotReplyDelay || 800));
      (async () => {
        try {
          const result = handleNativeBotMessage(jid, text, name, settings);

          let replies = [];
          // Si handleNativeBotMessage devolviÃ³ un objeto con needsAI, intentar OpenAI
          if (result && result.needsAI) {
            const aiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
            if (aiKey) {
              // Obtener historial de mensajes para contexto
              const chatMsgs = (waMessages.get(jid) || []).slice(-8).map(m => ({
                role: m.dir === "s" ? "assistant" : "user",
                content: m.txt || "[media]",
              }));
              const defaultPrompt = `Eres la asesora de ventas de Sanate Store â productos naturales colombianos ð¿
REGLAS ESTRICTAS:
- Responde en espaÃ±ol, tono cÃ¡lido y humano como una amiga que asesora.
- Usa emojis estratÃ©gicos (1-2 por mensaje, NO en cada lÃ­nea). Ejemplos: ð¿ â¨ ð ð ð
- NUNCA respondas todo en un solo mensaje largo. Separa tu respuesta en 2-3 mensajes cortos usando el separador ||||
- Cada mensaje debe ser de mÃ¡ximo 2 lÃ­neas. Piensa como si escribieras por WhatsApp: frases cortas, naturales.
- Si el cliente saluda, salÃºdalo cÃ¡lidamente por su nombre (si lo tienes).
- Si preguntan por productos, recomienda visitar https://sanate.store
- Si piden hablar con alguien, di que conectarÃ¡s con un asesor.
${result.context || ""}`;
              const sysPrompt = settings.systemPrompt
                ? settings.systemPrompt + `\n\nIMPORTANTE: Separa tu respuesta en 2-3 mensajes cortos con el separador |||| entre cada uno. No respondas en un solo bloque.`
                : defaultPrompt;
              const aiReply = await callOpenAIChat({
                messages: [{ role: "system", content: sysPrompt }, ...chatMsgs, { role: "user", content: text }],
                maxTokens: 300,
                settings,
              });
              if (aiReply) {
                // Soportar respuestas multi-parte con separador ||||
                replies = aiReply.split(/\|\|\|\|/).map(p => p.trim()).filter(Boolean);
                console.log("[NativeBot][AI-enhanced]", { chatId: jid, parts: replies.length });
              }
            }
            // Si no hay API key o fallÃ³, usar fallback amigable
            if (!replies.length) {
              replies = ["Hola! ð En este momento no puedo procesar tu mensaje", "Pero te conecto con un asesor que te ayudarÃ¡ pronto ð"];
            }
          } else if (Array.isArray(result)) {
            replies = result;
          }

          if (replies.length && waSocket && waStatus === "connected") {
            // Anti-detecciÃ³n: verificar rate limit
            if (!canSendMessage()) {
              console.warn("[WA][native-bot] Rate limit alcanzado, no se envÃ­a respuesta");
              return;
            }
            // Anti-detecciÃ³n: simular lectura del mensaje + tiempo de pensar antes de escribir
            const readDelay = 500 + Math.floor(Math.random() * 1500); // 0.5-2s leyendo
            await new Promise(r => setTimeout(r, readDelay));

            try { await waSocket.presenceSubscribe(jid); } catch {}
            try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
            // Delay proporcional al largo de la respuesta (simula escritura humana)
            const firstReplyTyping = Math.min(
              1000 + Math.floor(Math.random() * 1500) + (replies[0]?.length || 0) * 25,
              6000 // mÃ¡ximo 6 segundos
            );
            await new Promise(r => setTimeout(r, firstReplyTyping));

            for (let i = 0; i < replies.length; i++) {
              const reply = replies[i];
              if (!reply.trim()) continue;
              if (!canSendMessage()) break; // Rate limit per-part
              recordMessageSent();
              await waSocket.sendMessage(jid, { text: reply });
              // Persistir respuesta del bot en DB
              const replyMsgId = randomId("bot_reply");
              saveMessage(readWhatsAppDb(), {
                providerMessageId: replyMsgId,
                chatId:    jid,
                from:      waPhone || "agent@sanate.store",
                to:        jid,
                timestamp: nowIso(),
                type:      "text",
                text:      reply,
                status:    "sent",
                direction: "outgoing",
                chatName:  name,
                rawPayload: { source: "native-bot-reply" },
              });
              writeWhatsAppDb(readWhatsAppDb());
              if (i < replies.length - 1) {
                // Anti-detecciÃ³n: pausa antes de "escribir" la siguiente parte
                try { await waSocket.sendPresenceUpdate("paused", jid); } catch {}
                const pauseBetween = 800 + Math.floor(Math.random() * 2000); // 0.8-2.8s pausa
                await new Promise(r => setTimeout(r, pauseBetween));
                try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
                // Simular escritura de la siguiente parte
                const nextTyping = Math.min(800 + (replies[i+1]?.length || 0) * 25 + Math.floor(Math.random() * 1500), 5000);
                await new Promise(r => setTimeout(r, nextTyping));
              }
            }
            // Quitar estado "escribiendo"
            try { await waSocket.sendPresenceUpdate("paused", jid); } catch {}
            console.log("[NativeBot][reply][sent]", { chatId: jid, parts: replies.length });
          }
        } catch (botErr) {
          console.error("[NativeBot][reply][error]", botErr?.message || botErr);
        }
      })();
    }
  } catch (err) {
    console.error("[WA][storeMsg][persist-error]", err?.message || err);
  }
}

// ââ Bot Nativo: endpoints para ver/resetear sesiones y leads ââââââââââââââ
app.get("/api/whatsapp/bot/sessions", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const sessions = [];
  for (const [jid, s] of nativeBotSessions) {
    sessions.push({ jid, ...s });
  }
  res.json({ ok: true, sessions, total: sessions.length });
});

app.delete("/api/whatsapp/bot/sessions/:jid", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const jid = req.params.jid;
  nativeBotSessions.delete(jid);
  persistNativeBotSessions();
  res.json({ ok: true, deleted: jid });
});

app.delete("/api/whatsapp/bot/sessions", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const count = nativeBotSessions.size;
  nativeBotSessions.clear();
  persistNativeBotSessions();
  res.json({ ok: true, cleared: count });
});

// ââ Leads capturados âââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get("/api/whatsapp/bot/leads", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    const leads = db.leads || [];
    const limit = Math.min(200, parseInt(req.query?.limit) || 50);
    const recent = leads.slice(-limit).reverse();
    res.json({ ok: true, leads: recent, total: leads.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error reading leads" });
  }
});

app.delete("/api/whatsapp/bot/leads", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    const count = (db.leads || []).length;
    db.leads = [];
    writeWhatsAppDb(db);
    res.json({ ok: true, cleared: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error" });
  }
});

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
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage, Browsers } =
      await import("@whiskeysockets/baileys");
    downloadMediaFn = downloadMediaMessage;
    const { default: pino } = await import("pino");
    const { toDataURL }     = await import("qrcode");

    if (!fs.existsSync(waAuthDir)) fs.mkdirSync(waAuthDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(waAuthDir);
    const { version }          = await fetchLatestBaileysVersion();

    waStatus = "connecting";
    // ââ Anti-detecciÃ³n: imitar WhatsApp Web real ââââââââââââââââââââââââââââââ
    // Browsers tiene presets: "ubuntu", "windows", "macOS", "appropriate"
    // Usar uno de los presets oficiales para parecer un navegador real.
    const browserFingerprint = Browsers
      ? Browsers.windows("Chrome")           // Genera ["Windows", "Chrome", "10.0.22631"]
      : ["Windows", "Chrome", "10.0.22631"]; // Fallback: Windows 11 Chrome

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: browserFingerprint,
      syncFullHistory: false,
      // Anti-detecciÃ³n: delays y timeouts mÃ¡s humanos
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: undefined, // Sin timeout agresivo en queries
      keepAliveIntervalMs: 25_000,      // Keepalive cada 25s (como WA Web real)
      emitOwnEvents: true,
      markOnlineOnConnect: true,         // Marcar como "en lÃ­nea" al conectar (comportamiento normal)
    });

    sock.ev.on("creds.update", saveCreds);

    // ââ Contador de QRs generados en esta sesiÃ³n (evitar escaneos infinitos) ââ
    let qrCount = 0;
    const MAX_QR_PER_SESSION = 5; // MÃ¡ximo 5 QRs antes de parar (evita ban por login spam)

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrCount++;
        if (qrCount > MAX_QR_PER_SESSION) {
          console.warn(`[WA] â  LÃ­mite de QRs alcanzado (${MAX_QR_PER_SESSION}). Deteniendo para proteger la cuenta.`);
          waStatus = "disconnected"; waQR = null; waIniting = false;
          try { sock.end(undefined); } catch {}
          return;
        }
        try { waQR = await toDataURL(qr); } catch {}
        waStatus = "connecting";
        console.log(`[WA] QR generado (${qrCount}/${MAX_QR_PER_SESSION})`);
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log("[WA] Conexion cerrada, loggedOut:", loggedOut, "code:", code);
        waStatus = "disconnected"; waQR = null; waPhone = ""; waSocket = null; waIniting = false;
        broadcastSSE("status", { status: "disconnected" });

        // Anti-detecciÃ³n: NO reconectar si fue logout o ban (cÃ³digos 401, 403, 440)
        const dangerCodes = [401, 403, 440, DisconnectReason.loggedOut];
        if (dangerCodes.includes(code) || loggedOut) {
          console.warn("[WA] â  SesiÃ³n cerrada por WhatsApp. NO se reconectarÃ¡ automÃ¡ticamente para proteger la cuenta.");
          return;
        }

        // ReconexiÃ³n con delay HUMANO (aleatorio, no predecible)
        waReconnectAttempt++;
        if (waReconnectAttempt > 8) {
          console.warn("[WA] â  Demasiados reintentos. Deteniendo reconexiÃ³n automÃ¡tica.");
          return;
        }
        // Delay base + jitter aleatorio para parecer humano
        const baseDelay = Math.min(10_000 * Math.pow(2, waReconnectAttempt - 1), 300_000); // 10s â 5min max
        const jitter = Math.floor(Math.random() * 15_000); // 0-15s de variaciÃ³n aleatoria
        const delay = baseDelay + jitter;
        console.log(`[WA] Reconectando en ${Math.round(delay/1000)}s (intento ${waReconnectAttempt}/8)`);
        setTimeout(initWhatsApp, delay);
      } else if (connection === "open") {
        waStatus = "connected"; waQR = null;
        waReconnectAttempt = 0; // reset backoff on successful connection
        qrCount = 0;           // reset QR counter on successful connection
        waPhone  = sock.user?.id?.split(":")[0] || sock.user?.id || "";
        console.log("[WA] â Conectado:", waPhone);
        broadcastSSE("status", { status: "connected", phone: waPhone });

        // ââ Fetch metadata para TODOS los grupos con nombre genÃ©rico ââ
        setTimeout(async () => {
          try {
            const db = readWhatsAppDb();
            const groupChats = db.chats.filter(c =>
              (c.chatId || "").endsWith("@g.us") &&
              (!c.name || c.name === "Grupo" || c.name === "Esteban" || isJustDigits(c.name))
            );
            for (const gc of groupChats) {
              try {
                const meta = await sock.groupMetadata(gc.chatId);
                const subject = (meta?.subject || "").trim();
                if (subject) {
                  gc.name = subject;
                  // Actualizar en memoria
                  const memChat = waChats.get(gc.chatId);
                  if (memChat) { memChat.name = subject; waChats.set(gc.chatId, memChat); }
                  console.log(`[WA] Grupo actualizado: ${gc.chatId} â "${subject}"`);
                }
              } catch {}
              // Anti-detecciÃ³n: delay entre cada consulta de metadata
              await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
            }
            if (groupChats.length) writeWhatsAppDb(db);
          } catch (e) {
            console.warn("[WA] Error fetching group metadata:", e?.message);
          }
        }, 5000); // Esperar 5s despuÃ©s de conexiÃ³n para empezar
      }
    });

    // ââ Almacenar mensajes entrantes/salientes âââââââââââââââââââââââââââââ
    sock.ev.on("messages.upsert", ({ messages: msgs, type }) => {
      for (const m of msgs) storeMsg(m).catch(e => console.error("[WA][storeMsg]", e?.message));
    });

    // ââ Historial inicial al reconectar (procesado suavemente para no disparar rate limits)
    sock.ev.on("messaging-history.set", ({ chats: histChats, messages: histMsgs }) => {
      console.log("[WA] Historial recibido: chats:", histChats?.length, "msgs:", histMsgs?.length);
      if (Array.isArray(histMsgs) && histMsgs.length > 0) {
        // Anti-detecciÃ³n: batches mÃ¡s pequeÃ±os (20) con setTimeout (no setImmediate)
        let idx = 0;
        const batch = () => {
          const end = Math.min(idx + 20, histMsgs.length);
          for (; idx < end; idx++) storeMsg(histMsgs[idx]).catch(() => {});
          if (idx < histMsgs.length) setTimeout(batch, 100); // 100ms entre batches
          else console.log("[WA] Historial mensajes procesado:", histMsgs.length);
        };
        setTimeout(batch, 500); // Esperar 500ms antes de empezar a procesar
      }
      if (Array.isArray(histChats)) {
        for (const c of histChats) {
          const cIsLid = isLidJid(c.id);
          const cIsGroup = c.id.endsWith("@g.us");
          const rawNum = c.id.split("@")[0];
          const cName = c.name || (cIsGroup ? "Grupo" : (cIsLid ? "Contacto" : rawNum));
          const cPhone = cIsLid ? "" : rawNum;
          if (!waChats.has(c.id)) {
            waChats.set(c.id, {
              id:          c.id,
              name:        cName,
              phone:       cPhone,
              unread:      c.unreadCount || 0,
              lastMsg:     "",
              lastMsgTime: 0,
              isGroup:     cIsGroup,
            });
          }
        }
      }
    });

    // ââ Upsert de chats (lista inicial) âââââââââââââââââââââââââââââââââââ
    sock.ev.on("chats.upsert", (chats) => {
      for (const c of chats) {
        const cIsLid = isLidJid(c.id);
        const cIsGroup = c.id.endsWith("@g.us");
        const rawNum = c.id.split("@")[0];
        const cPhone = cIsLid ? "" : rawNum;
        // Para @lid, NO usar el nÃºmero como nombre
        const chatName = c.name || (cIsGroup ? "Grupo" : (cIsLid ? "Contacto" : rawNum));
        const chatNameIsReal = chatName && !isJustDigits(chatName) && chatName !== "Contacto";

        if (!waChats.has(c.id)) {
          waChats.set(c.id, {
            id:          c.id,
            name:        chatName,
            phone:       cPhone,
            unread:      c.unreadCount || 0,
            lastMsg:     "",
            lastMsgTime: 0,
            isGroup:     cIsGroup,
          });
        } else {
          const existing = waChats.get(c.id);
          // Solo actualizar nombre si el nuevo es real y el existente no lo es
          if (chatNameIsReal && (!existing.name || isJustDigits(existing.name) || existing.name === "Contacto")) {
            existing.name = chatName;
            waChats.set(c.id, existing);
          }
        }
        // Persistir en DB
        try {
          const db = readWhatsAppDb();
          ensureChat(db, { chatId: c.id, name: chatName, phone: cPhone });
          writeWhatsAppDb(db);
        } catch {}

        // ââ Fetch metadata de grupo para obtener el nombre real (subject) ââ
        if (cIsGroup && sock) {
          sock.groupMetadata(c.id).then(meta => {
            const subject = (meta?.subject || "").trim();
            if (!subject) return;
            // Actualizar en memoria
            const memChat = waChats.get(c.id);
            if (memChat) { memChat.name = subject; waChats.set(c.id, memChat); }
            // Actualizar en DB
            try {
              const db2 = readWhatsAppDb();
              const gIdx = db2.chats.findIndex(ch => ch.chatId === c.id);
              if (gIdx >= 0) { db2.chats[gIdx].name = subject; writeWhatsAppDb(db2); }
              else { ensureChat(db2, { chatId: c.id, name: subject, phone: "" }); writeWhatsAppDb(db2); }
            } catch {}
            console.log(`[WA] Grupo metadata: ${c.id} â "${subject}"`);
          }).catch(() => {}); // Silenciar errores de metadata
        }
      }
    });

    // ââ Capturar nombres de contactos desde Baileys ââââââââââââââââââââââ
    // Actualiza tanto en memoria como en DB persistente
    const _updateContactName = (c) => {
      if (!c.id) return;
      const name = (c.notify || c.verifiedName || c.name || "").trim();
      if (!name) return;
      const cIsLid = isLidJid(c.id);
      const rawNum = c.id.split("@")[0];
      // No guardar un nÃºmero puro como nombre (a menos que sea @s.whatsapp.net donde ES el telÃ©fono)
      if (isJustDigits(name) && (cIsLid || name === rawNum)) return;
      const cPhone = cIsLid ? "" : rawNum;

      // Actualizar en memoria
      const existing = waChats.get(c.id);
      if (existing) {
        existing.name = name;
        waChats.set(c.id, existing);
      } else {
        waChats.set(c.id, {
          id: c.id, name, phone: cPhone,
          unread: 0, lastMsg: "", lastMsgTime: 0,
          isGroup: c.id.endsWith("@g.us"),
        });
      }
      // Actualizar en DB persistente â siempre actualizar si tenemos un nombre real
      try {
        const db = readWhatsAppDb();
        const chatIdx = db.chats.findIndex(ch => String(ch.chatId) === String(c.id));
        if (chatIdx >= 0) {
          const oldName = db.chats[chatIdx].name || "";
          // Siempre actualizar si nombre viejo no es un nombre real
          if (!oldName || isJustDigits(oldName) || oldName.includes("@") || oldName === "Contacto") {
            db.chats[chatIdx].name = name;
            writeWhatsAppDb(db);
          }
        } else {
          // Chat no existe en DB, crearlo
          ensureChat(db, { chatId: c.id, name, phone: cPhone });
          writeWhatsAppDb(db);
        }
      } catch {}
    };

    sock.ev.on("contacts.update", (contacts) => {
      for (const c of contacts) _updateContactName(c);
    });

    sock.ev.on("contacts.upsert", (contacts) => {
      for (const c of contacts) _updateContactName(c);
    });

    waSocket = sock;
  } catch (err) {
    console.error("[WA] Error init:", err?.message || err);
    waStatus = "disconnected"; waIniting = false;
    waReconnectAttempt++;
    if (waReconnectAttempt > 8) {
      console.warn("[WA] â  Demasiados errores de init. Deteniendo reconexiÃ³n automÃ¡tica para proteger la cuenta.");
      return;
    }
    // Anti-detecciÃ³n: delay largo + jitter
    const baseDelay = Math.min(15_000 * Math.pow(2, waReconnectAttempt - 1), 300_000);
    const jitter = Math.floor(Math.random() * 20_000);
    const delay = baseDelay + jitter;
    console.log(`[WA] Reintentando init en ${Math.round(delay/1000)}s (intento ${waReconnectAttempt}/8)`);
    setTimeout(initWhatsApp, delay);
  }
}

// Arrancar WhatsApp al iniciar
initWhatsApp();

// ââ WATCHDOG: auto-heal SUAVE (anti-detecciÃ³n) âââââââââââââââââââââââââââââ
// Cada 2 minutos (+ jitter) verifica la conexiÃ³n. NO fuerza reconexiones agresivas.
let _lastConnectedAt = 0;
const WATCHDOG_BASE_INTERVAL = 120_000; // 2 minutos base
const watchdogCheck = () => {
  const jitter = Math.floor(Math.random() * 30_000); // 0-30s variaciÃ³n
  setTimeout(() => {
    if (waStatus === "connected") {
      _lastConnectedAt = Date.now();
      watchdogCheck(); // Programar siguiente check
      return;
    }
    // Si estÃ¡ en "connecting" por mÃ¡s de 5 minutos SIN QR, algo fallÃ³
    if (waStatus === "connecting" && !waQR && (Date.now() - _lastConnectedAt > 300_000)) {
      console.log("[WA][watchdog] connecting sin QR por >5min, reiniciando suavemente...");
      waIniting = false;
      waReconnectAttempt = 0; // Reset para dar oportunidad limpia
      initWhatsApp();
      watchdogCheck();
      return;
    }
    // Si estÃ¡ disconnected y nadie lo estÃ¡ manejando, reconectar UNA vez
    if (waStatus === "disconnected" && !waIniting && waReconnectAttempt < 8) {
      console.log("[WA][watchdog] disconnected, reconectando suavemente...");
      initWhatsApp();
    }
    watchdogCheck(); // Programar siguiente check
  }, WATCHDOG_BASE_INTERVAL + jitter);
};
watchdogCheck();

// ââ Rutas API WhatsApp (estado, QR, desvinculaciÃ³n) âââââââââââââââââââââââ
// ── SSE real-time events ──────────────────────────────────────────────────
app.get("/api/whatsapp/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  const client = { id: Date.now(), res };
  sseClients.add(client);
  res.write(`data: ${JSON.stringify({ type: "status", status: waStatus, phone: waPhone })}\n\n`);
  const hb = setInterval(() => {
    try { res.write(": keepalive\n\n"); } catch { clearInterval(hb); sseClients.delete(client); }
  }, 25000);
  req.on("close", () => { clearInterval(hb); sseClients.delete(client); });
});

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
    waReconnectAttempt = 0; // Reset para nueva sesiÃ³n limpia
    if (fs.existsSync(waAuthDir)) fs.rmSync(waAuthDir, { recursive: true, force: true });
    // Anti-detecciÃ³n: esperar 3-5 segundos antes de reiniciar (no inmediato)
    const logoutDelay = 3000 + Math.floor(Math.random() * 2000);
    setTimeout(initWhatsApp, logoutDelay);
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

// ââ Presencia / indicador de escritura (typing simulation) âââââââââââââââââââ
// POST /api/whatsapp/chats/:chatId/presence
// body: { action: "composing" | "paused" | "available" | "recording" }
app.post("/api/whatsapp/chats/:chatId/presence", async (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    const action = toSafeString(req.body?.action || "composing", 30);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    if (waSocket && waStatus === "connected") {
      const jid = chatId.includes("@") ? chatId : `${chatId}@s.whatsapp.net`;
      await waSocket.sendPresenceUpdate(action, jid);
      return res.json({ ok: true, action, jid });
    }
    return res.json({ ok: false, error: "WhatsApp no conectado" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Foto de perfil vÃ­a Baileys (con cachÃ© en DB)
app.get("/api/whatsapp/chats/:chatId/photo", async (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    const db = readWhatsAppDb();
    const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
    let photoUrl = idx >= 0 ? db.chats[idx].photoUrl : "";
    // Intentar refrescar vÃ­a Baileys si hay socket
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

// Intentar iniciar con HTTPS (cert auto-firmado local, instalado como trusted)
// Esto permite que sanate.store (HTTPS) llame a localhost sin bloqueo de Chrome PNA
// ═══════════════════════════════════════════════════════════════════════
// ── COLOMBIA INTELIGENTE — RSS feeds + topic extraction + investment AI ──
// ═══════════════════════════════════════════════════════════════════════

const COLOMBIA_RSS_FEEDS = [
  { name: 'El Tiempo', url: 'https://www.eltiempo.com/rss/colombia.xml' },
  { name: 'Semana', url: 'https://www.semana.com/rss' },
  { name: 'RCN Radio', url: 'https://www.rcnradio.com/feeds/colombia.xml' },
  { name: 'Blu Radio', url: 'https://www.bluradio.com/rss' },
  { name: 'Portafolio', url: 'https://www.portafolio.co/rss/economia.xml' },
];

const colombiaCache = { news: null, topics: null, parties: null, candidates: null, virals: null, investment: null, lastFetch: 0 };
const COLOMBIA_CACHE_TTL = 45000;

async function fetchRSSFeed(feedUrl, feedName, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SanateMonitor/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' }
    });
    clearTimeout(timer);
    if (!resp.ok) return [];
    const xml = await resp.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
      const block = match[1];
      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const descMatch = block.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/);
      const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
      const linkMatch = block.match(/<link>(.*?)<\/link>/);
      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
      if (!title) continue;
      const pubDate = dateMatch?.[1] ? new Date(dateMatch[1]) : new Date();
      const hours = pubDate.getHours();
      const mins = String(pubDate.getMinutes()).padStart(2, '0');
      items.push({ id: feedName + '-' + items.length, title, source: feedName, hour: hours + ':' + mins, summary: (descMatch?.[1] || descMatch?.[2] || '').replace(/<[^>]+>/g, '').trim().slice(0, 180), link: (linkMatch?.[1] || '').trim(), updatedAt: pubDate.toISOString() });
    }
    return items;
  } catch { clearTimeout(timer); return []; }
}

async function refreshColombiaData() {
  if (Date.now() - colombiaCache.lastFetch < COLOMBIA_CACHE_TTL && colombiaCache.news) return;
  const feedResults = await Promise.allSettled(COLOMBIA_RSS_FEEDS.map(f => fetchRSSFeed(f.url, f.name)));
  const allNews = feedResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  allNews.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  colombiaCache.news = allNews.slice(0, 20);
  const topicKeywords = {
    'Gobierno y congreso': ['gobierno', 'congreso', 'senado', 'presidente', 'petro', 'reforma'],
    'Seguridad regional': ['seguridad', 'militar', 'ejercito', 'policia', 'conflicto', 'guerrilla'],
    'Economia y empleo': ['economia', 'empleo', 'desempleo', 'pib', 'inflacion', 'banco', 'dolar'],
    'Salud publica': ['salud', 'hospital', 'eps', 'vacuna'],
    'Educacion': ['educacion', 'universidad', 'escuela'],
    'Medio ambiente': ['ambiente', 'deforestacion', 'cambio climatico'],
    'Tecnologia e innovacion': ['tecnologia', 'digital', 'ia', 'startups'],
    'Deportes Colombia': ['seleccion', 'futbol', 'olimpicos', 'ciclismo'],
  };
  const topicScores = {};
  for (const item of allNews) {
    const text = (item.title + ' ' + item.summary).toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => text.includes(kw))) topicScores[topic] = (topicScores[topic] || 0) + 1;
    }
  }
  colombiaCache.topics = Object.entries(topicScores).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title], idx) => ({ id: idx + 1, title }));
  colombiaCache.parties = [
    { id: 'p1', title: 'Pacto Historico', party: 'Coalicion gobierno' },
    { id: 'p2', title: 'Centro Democratico', party: 'Oposicion' },
    { id: 'p3', title: 'Partido Liberal', party: 'Independiente' },
    { id: 'p4', title: 'Partido Conservador', party: 'Independiente' },
    { id: 'p5', title: 'Partido Verde', party: 'Coalicion gobierno' },
    { id: 'p6', title: 'Cambio Radical', party: 'Independiente' },
  ];
  colombiaCache.candidates = [
    { id: 'c1', title: 'Gustavo Petro', studies: 'Presidente actual', recognitions: 'Pacto Historico' },
    { id: 'c2', title: 'Maria Fernanda Cabal', studies: 'Senadora', recognitions: 'Centro Democratico' },
    { id: 'c3', title: 'Sergio Fajardo', studies: 'Ex-gobernador Antioquia', recognitions: 'Independiente' },
    { id: 'c4', title: 'German Vargas Lleras', studies: 'Ex-vicepresidente', recognitions: 'Cambio Radical' },
  ];
  colombiaCache.virals = [];
  colombiaCache.investment = [
    { asset: 'ETF iColcap', type: 'ETF', horizon: '15d', score: 7, thesis: 'Indice colombiano con potencial de recuperacion' },
    { asset: 'Ecopetrol', type: 'accion', horizon: '2m', score: 6, thesis: 'Petrolera estatal, dividendos atractivos' },
    { asset: 'Bancolombia', type: 'accion', horizon: '15d', score: 7, thesis: 'Sector bancario solido' },
  ];
  colombiaCache.lastFetch = Date.now();
}

app.get('/api/colombia/news', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.news || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/topics', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.topics || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/parties', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.parties || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/candidates', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.candidates || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/virals', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.virals || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/investment-insights', async (req, res) => { try { await refreshColombiaData(); res.json({ ideas: colombiaCache.investment || [] }); } catch { res.json({ ideas: [] }); } });

// SPA fallback - serve index.html for all unmatched routes
app.get('*', (req, res) => {
  const pubHtml = path.join(__dirname, '..', 'public_html', 'index.html');
  const buildHtml = path.join(__dirname, '..', 'build', 'index.html');
  const indexPath = fs.existsSync(pubHtml) ? pubHtml : buildHtml;
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

const certDir = path.join(__dirname, 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath  = path.join(certDir, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    const sslOptions = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
      console.log(`SERVER ON HTTPS :${PORT}`);
    });
    http.createServer(app).listen(5056, '0.0.0.0', () => {
      console.log(`SERVER ON HTTP :5056 (fallback)`);
    });
  } catch (e) {
    console.warn('HTTPS failed, falling back to HTTP:', e.message);
    app.listen(PORT, '0.0.0.0', () => { console.log(`SERVER ON HTTP :${PORT}`); });
  }
} else {
  app.listen(PORT, '0.0.0.0', () => { console.log(`SERVER ON HTTP :${PORT}`); });
}







import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-build React app if no build output exists (for Render deployment)
const pubHtmlIndex = path.join(__dirname, '..', 'public_html', 'index.html');
const buildIndex = path.join(__dirname, '..', 'build', 'index.html');
if (!fs.existsSync(pubHtmlIndex) && !fs.existsSync(buildIndex)) {
  console.log('No build found, running npm run build...');
  try {
    execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit', timeout: 300000 });
    console.log('Build completed successfully');
  } catch (e) {
    console.error('Build failed:', e.message);
  }
}

const app = express();
// Chrome Private Network Access: ANTES de cors() para que no sea interceptado
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-secret, Access-Control-Request-Private-Network');
  res.sendStatus(204);
});
app.use(cors({ origin: '*' }));
app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Private-Network', 'true'); next(); });
app.use(express.json({ limit: "20mb" }));

// Serve React build static files (public_html/ for local/Hostinger, build/ for Render)
const buildPath = fs.existsSync(path.join(__dirname, '..', 'public_html', 'index.html'))
  ? path.join(__dirname, '..', 'public_html')
  : path.join(__dirname, '..', 'build');
app.use('/static', express.static(path.join(buildPath, 'static'), { maxAge: '1y' }));
app.use(express.static(buildPath, { index: false }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
});

// carpetas
const publicDir = path.resolve(__dirname, "..", "public");
const buildDir = path.resolve(__dirname, "..", "build");
const generatedDir = path.resolve(__dirname, "..", "generated");

// asegÃ¯Â¿Â½rate que existan
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

// sirve estÃ¯Â¿Â½ticos
app.use("/generated", express.static(generatedDir));

// Si existe build, sirve React (producciÃÂ³n) desde ahÃÂ­
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

/** Llamar a OpenAI Chat Completions (usa la key del settings o env) */
async function callOpenAIChat({ messages, maxTokens = 400, settings = {} }) {
  const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const client = apiKey === process.env.OPENAI_API_KEY && openai
      ? openai
      : new OpenAI({ apiKey });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return r.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn("[callOpenAIChat] Error:", e?.message || e);
    return null;
  }
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
        body: "Hola {{nombre}}, bienvenido a sanate.store. Â¿En quÃ© te ayudo?",
        quickButtons: ["CatÃ¡logo", "Estado pedido", "Soporte"],
        createdAt: nowIso(),
      },
    ],
    triggers: [],
    sync: {
      lastRunAt: null,
      lastStartDate: null,
      runningJobId: null,
    },
    // ââ ConfiguraciÃ³n del bot (para Chrome cerrado vÃ­a n8n) ââââââââââ
    settings: {
      botEnabled:      false,
      n8nEnabled:      false,
      n8nWebhook:      "https://oasiss.app.n8n.cloud/webhook/whatsapp-sanate",
      backendPublicUrl: "",
      openaiKey:       "",
      systemPrompt:    "",
      // ââ Bot Nativo (flujo conversacional sin APIs externas) ââ
      nativeBotEnabled:  false,
      nativeBotWelcome:  "Â¡Hola {{nombre}}! ð Bienvenido/a a *Sanate Store* ð¿\nÂ¿En quÃ© te puedo ayudar hoy?",
      nativeBotMenu:     "1. ð Ver productos\n2. ð¦ Estado de mi pedido\n3. ð¬ Hablar con un asesor\n4. â¹ï¸ MÃ¡s informaciÃ³n",
      nativeBotMenuMap:  JSON.stringify({
        "1": { reply: "ð Puedes ver todo nuestro catÃ¡logo en:\nhttps://sanate.store\n\nÂ¿Te interesa algo en especial? EscrÃ­beme el nombre del producto ð", next: "free" },
        "2": { reply: "ð¦ Por favor envÃ­ame tu nÃºmero de pedido o tu nombre completo para buscarlo.", next: "free" },
        "3": { reply: "ð Â¡Perfecto! Un asesor te atenderÃ¡ pronto.\nMientras tanto, Â¿puedes contarme brevemente quÃ© necesitas?", next: "escalated" },
        "4": { reply: "â¹ï¸ Somos *Sanate Store* â productos naturales para tu bienestar ð¿\nð EnvÃ­os a todo el paÃ­s\nð³ Pagos seguros\nð Horario: Lun-SÃ¡b 8am-6pm\n\nÂ¿Algo mÃ¡s en lo que te pueda ayudar?", next: "menu" },
      }),
      nativeBotSessionTTL:   24,  // horas que dura una sesiÃ³n antes de reiniciar
      nativeBotEscalateWords: "agente,humano,persona,asesor,ayuda real,hablar con alguien",
      nativeBotReplyDelay:   800,  // ms de delay entre mensajes mÃºltiples
      nativeBotAskName:      true, // preguntar nombre si no lo tiene
      nativeBotAskNameMsg:   "Antes de continuar, Â¿cÃ³mo te llamas? ð",
      nativeBotFallback:     "No entendÃ­ tu mensaje ð Por favor elige una opciÃ³n del menÃº o escribe *menu* para verlas de nuevo.",
    },
    // ââ Bot Nativo: sesiones activas { [jid]: { step, name, data, createdAt, msgCount } }
    nativeBotSessions: {},
    // ââ Leads capturados
    leads: [],
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
      settings: {
        ...base.settings,
        ...(parsed?.settings || {}),
      },
    };
  } catch {
    return defaultWhatsAppDb();
  }
}

function writeWhatsAppDb(db) {
  fs.writeFileSync(whatsappDbFile, JSON.stringify(db, null, 2), "utf-8");
}

// ââ Limpieza de datos existentes al iniciar: corregir @lid nombres/phones ââ
(function cleanupExistingDb() {
  try {
    const db = readWhatsAppDb();
    let changed = false;
    for (const chat of db.chats) {
      const cId = chat.chatId || "";
      const rawNum = cId.split("@")[0];
      const cIsLid = cId.endsWith("@lid");
      const cIsGroup = cId.endsWith("@g.us");

      // Limpiar nombre: si es @lid y el nombre es solo el nÃºmero LID, poner "Contacto"
      if (cIsLid && chat.name && /^\d+$/.test(chat.name)) {
        chat.name = "Contacto";
        changed = true;
      }
      // Limpiar phone: si es @lid y el phone es el nÃºmero LID, limpiar
      if (cIsLid && chat.phone && chat.phone === rawNum) {
        chat.phone = "";
        changed = true;
      }
      // Asegurar isGroup
      if (cIsGroup && !chat.isGroup) {
        chat.isGroup = true;
        changed = true;
      }
    }
    if (changed) {
      writeWhatsAppDb(db);
      console.log("[DB] Limpieza de datos @lid completada");
    }
  } catch (e) {
    console.warn("[DB] Error en limpieza:", e?.message);
  }
})();

function normalizePhoneLike(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

/** Detecta si un JID es formato @lid (Linked Identity) de WhatsApp */
function isLidJid(jid) {
  return String(jid || "").endsWith("@lid");
}

/** Detecta si un string es solo dÃ­gitos (nÃºmero sin nombre real) */
function isJustDigits(s) {
  return /^\d+$/.test(String(s || "").trim());
}

function getChatDisplayName(chatId, fallback = "") {
  const cleaned = String(fallback || "").trim();
  // Si el fallback es un nombre real (no solo dÃ­gitos, no contiene @), usarlo
  if (cleaned && !isJustDigits(cleaned) && !cleaned.includes("@")) return cleaned;
  // Para @lid JIDs, NO usar el nÃºmero LID como nombre â es un ID interno sin sentido
  const id = String(chatId || "");
  if (isLidJid(id)) return cleaned || "Contacto";
  // Para @g.us, mostrar "Grupo"
  if (id.endsWith("@g.us")) return cleaned || "Grupo";
  // Para @s.whatsapp.net, usar el nÃºmero de telÃ©fono
  if (id.includes("@")) return cleaned || id.split("@")[0];
  return cleaned || id || "Contacto";
}

function buildAvatarFallback(nameOrPhone = "") {
  const safe = encodeURIComponent(toSafeString(nameOrPhone || "Contacto", 40));
  return `https://ui-avatars.com/api/?name=${safe}&background=e5f3ff&color=1b4d7a&size=128`;
}

function ensureChat(db, incoming = {}) {
  const chatId = toSafeString(incoming.chatId || incoming.id || "", 140);
  if (!chatId) return null;
  const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
  const isGroup = chatId.endsWith("@g.us");
  const isLid = isLidJid(chatId);
  const rawIdNum = chatId.split("@")[0];

  // Resolver nombre: para @lid NO usar el nÃºmero LID como nombre
  const incomingName = toSafeString(incoming.name || "", 120).trim();
  const incomingNameIsReal = incomingName && !isJustDigits(incomingName) && !incomingName.includes("@");
  const resolvedName = incomingNameIsReal
    ? incomingName
    : getChatDisplayName(chatId, incomingNameIsReal ? incomingName : "");

  // Para @lid, el phone solo debe ser un telÃ©fono real, no el ID LID
  const incomingPhone = incoming.phone || "";
  const phoneForBase = isLid
    ? (incomingPhone && !isLidJid(incomingPhone) && !incomingPhone.includes("@lid") ? normalizePhoneLike(incomingPhone) : "")
    : normalizePhoneLike(incomingPhone || chatId);

  const base = {
    chatId,
    name: resolvedName,
    phone: phoneForBase,
    photoUrl: toSafeString(incoming.photoUrl || "", 800) || "",
    updatedAt: nowIso(),
    unreadCount: 0,
    lastMessagePreview: "",
    lastMessageAt: null,
    isGroup,
  };
  if (idx < 0) {
    db.chats.push(base);
    return db.chats[db.chats.length - 1];
  }
  const chat = db.chats[idx];
  // No sobreescribir un nombre real con un nÃºmero o "Contacto"
  const existingNameIsReal = chat.name && !isJustDigits(chat.name) && !chat.name.includes("@") && chat.name !== "Contacto";
  const bestName = incomingNameIsReal ? incomingName : (existingNameIsReal ? chat.name : resolvedName);

  // Para phone, mantener el existente si era real y el nuevo es vacÃ­o o LID
  const bestPhone = phoneForBase || chat.phone || "";

  const merged = {
    ...chat,
    ...base,
    name: bestName,
    phone: bestPhone,
    photoUrl: toSafeString(incoming.photoUrl || chat.photoUrl || "", 800),
    updatedAt: nowIso(),
    isGroup,
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

// ---- PROMPT Ã¯Â¿Â½alto impactoÃ¯Â¿Â½ (sin texto)
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
  // cuando hay imagen de referencia, fuerza preservaciÃ¯Â¿Â½n
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
    "Camera look: DSLR/mirrorless, shallow depth of field (f/2.8Ã¯Â¿Â½f/4).",
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
    let filtered = [...db.chats];

    // ââ Asegurar que cada chat tenga isGroup correctamente ââ
    filtered = filtered.map(c => ({
      ...c,
      isGroup: c.isGroup || (c.chatId || "").endsWith("@g.us"),
    }));

    // ââ Limpiar nombres: para @lid no mostrar nÃºmeros LID como nombre ââ
    filtered = filtered.map(c => {
      const cId = c.chatId || "";
      const rawNum = cId.split("@")[0];
      let name = c.name || "";
      // Si el nombre es solo el nÃºmero LID o vacÃ­o, y es @lid, poner "Contacto"
      if (isLidJid(cId) && (!name || name === rawNum || isJustDigits(name))) {
        // Intentar buscar en memoria por si hay un pushName mÃ¡s reciente
        const memChat = waChats.get(cId);
        const memName = memChat?.name || "";
        name = (memName && !isJustDigits(memName) && memName !== "Contacto") ? memName : "Contacto";
      }
      // Para @s.whatsapp.net, si nombre es solo un nÃºmero, usar el telÃ©fono
      if (cId.endsWith("@s.whatsapp.net") && isJustDigits(name)) {
        const memChat = waChats.get(cId);
        name = memChat?.name || name;
      }
      return { ...c, name };
    });

    // ââ Filtro por tipo: "individual", "group", o "all" (default) ââ
    const typeFilter = (req.query?.type || "all").toLowerCase();
    if (typeFilter === "individual") {
      filtered = filtered.filter(c => !c.isGroup);
    } else if (typeFilter === "group") {
      filtered = filtered.filter(c => c.isGroup);
    }

    // ââ Solo mostrar chats que tienen al menos un mensaje (activos) ââ
    // Excepto si se pide explÃ­citamente todos con ?includeEmpty=true
    const includeEmpty = req.query?.includeEmpty === "true";
    if (!includeEmpty) {
      filtered = filtered.filter(c => c.lastMessageAt || c.lastMessagePreview);
    }

    // ââ BÃºsqueda por nombre o telÃ©fono âââââââââââââââââââââââââââââ
    const q = (req.query?.q || req.query?.search || "").trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/[^\d]/g, "");
      filtered = filtered.filter((c) => {
        const name  = (c.name || "").toLowerCase();
        const phone = (c.phone || c.chatId || "").replace(/[^\d]/g, "");
        return name.includes(q) || phone.includes(qDigits) || (c.chatId || "").toLowerCase().includes(q);
      });
    }
    const sorted = filtered.sort((a, b) => {
      return new Date(b?.lastMessageAt || b?.updatedAt || 0).getTime()
        - new Date(a?.lastMessageAt || a?.updatedAt || 0).getTime();
    });
    // Default 50 chats (solo activos, no todos)
    const { items, nextCursor, limit } = paginateByCursor(sorted, req.query?.cursor, req.query?.limit || 50);
    return res.json({
      ok: true,
      chats: items.map((chat) => ({
        ...chat,
        isGroup: chat.isGroup || (chat.chatId || "").endsWith("@g.us"),
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

    // ââ Intentar envÃ­o real por Baileys ââââââââââââââââââââââââââââââââââ
    let waError = null;
    if (waSocket && waStatus === "connected") {
      // Anti-detecciÃ³n: verificar rate limit
      if (!canSendMessage()) {
        msg.status = "rate_limited";
        return res.status(429).json({ ok: false, error: "Rate limit alcanzado. Espera antes de enviar mÃ¡s mensajes.", message: msg });
      }
      try {
        const jid = chatId.includes("@") ? chatId : `${chatId}@s.whatsapp.net`;
        recordMessageSent(); // Registrar envÃ­o
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

// ââ ConfiguraciÃ³n del bot para Chrome cerrado (n8n + openaiKey + prompt) ââ
app.get("/api/whatsapp/settings", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    // Nunca devolver openaiKey completa: enmascarar por seguridad
    const s = { ...(db.settings || {}) };
    if (s.openaiKey) s.openaiKey = s.openaiKey.substring(0, 8) + "****";
    return res.json({ ok: true, settings: s });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/whatsapp/settings", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    const allowed = [
      "botEnabled", "n8nEnabled", "n8nWebhook", "backendPublicUrl", "openaiKey", "systemPrompt",
      "aiContactMap",
      "nativeBotEnabled", "nativeBotWelcome", "nativeBotMenu", "nativeBotMenuMap",
      "nativeBotSessionTTL", "nativeBotEscalateWords", "nativeBotReplyDelay",
      "nativeBotAskName", "nativeBotAskNameMsg", "nativeBotFallback",
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    }
    db.settings = { ...(db.settings || {}), ...patch };
    writeWhatsAppDb(db);
    console.log("[WA][settings] Actualizado:", Object.keys(patch).join(", "));
    const masked = { ...db.settings };
    if (masked.openaiKey) masked.openaiKey = "****";
    return res.json({ ok: true, settings: masked });
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
// - image: (file)             <-- tambiÃ¯Â¿Â½n soportado
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
        // Guardamos temporalmente para crear readStream (mÃ¯Â¿Â½s compatible)
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

      // Preferimos guardar base64 para servirlo nosotros (mÃ¯Â¿Â½s estable)
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

// Save externally-generated image (e.g. Pollinations) to the store
app.post("/api/ai-images/save-external", express.json(), (req, res) => {
  try {
    const { userId = "admin", productId = "general", productName, template, url: imageUrl, prompt } = req.body || {};
    if (!imageUrl) return res.status(400).json({ ok: false, error: "url requerida" });
    const store = loadAiImagesStore();
    const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      userId: safeText(userId, 60) || "admin",
      productId: safeText(productId, 80) || "general",
      productName: safeText(productName, 200) || "Producto",
      template: safeText(template, 50) || "Hero",
      url: imageUrl,
      prompt_used: safeText(prompt, 2000) || "",
      source: "external",
      createdAt: new Date().toISOString(),
    };
    store.push(record);
    saveAiImagesStore(store);
    return res.json({ ok: true, image_id: id, image_url: imageUrl });
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
  { id: 2, nombre: "Camiseta Sport", name: "Camiseta Sport", precio: 29.99, price: 29.99, imagen: "https://via.placeholder.com/300?text=Camiseta", image: "https://via.placeholder.com/300?text=Camiseta", categoria: "nuevos", category: "nuevos", descripcion: "Transpirable y cÃÂ³moda." },
  { id: 3, nombre: "Reloj Inteligente", name: "Reloj Inteligente", precio: 150.00, price: 150.00, imagen: "https://via.placeholder.com/300?text=Reloj", image: "https://via.placeholder.com/300?text=Reloj", categoria: "destacados", category: "destacados", descripcion: "Conecta con tu vida." },
  { id: 4, nombre: "Mochila Urbana", name: "Mochila Urbana", precio: 45.50, price: 45.50, imagen: "https://via.placeholder.com/300?text=Mochila", image: "https://via.placeholder.com/300?text=Mochila", categoria: "ofertas", category: "ofertas", descripcion: "Para el dÃÂ­a a dÃÂ­a." }
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

// Rutas Productos y CategorÃÂ­as
app.get('/api/categories', (req, res) => {
  console.log("[API] GET /api/categories - Enviando", MOCK_CATEGORIAS.length, "categorÃÂ­as");
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

// ââ WhatsApp Bot (Baileys) ââââââââââââââââââââââââââââââââââââââââââââââââââ
const WA_SECRET = process.env.WA_SECRET || "sanate_secret_2025";
const waAuthDir = path.join(generatedDir, "wa-auth");

let waSocket        = null;
let waStatus        = "disconnected"; // 'disconnected' | 'connecting' | 'connected'
let waQR            = null;           // data-url PNG
let waPhone         = "";
let waIniting       = false;
let downloadMediaFn = null; // set after Baileys dynamic import
let waReconnectAttempt = 0; // for exponential backoff

// ââ Anti-detecciÃ³n: Rate limiter global de mensajes âââââââââââââââââââââââââ
// MÃ¡ximo 20 mensajes por minuto, 200 por hora (WhatsApp limita mÃ¡s bajo para nuevos)
const _msgTimestamps = [];
const MSG_PER_MINUTE = 20;
const MSG_PER_HOUR   = 200;
function canSendMessage() {
  const now = Date.now();
  // Limpiar timestamps viejos (>1 hora)
  while (_msgTimestamps.length && _msgTimestamps[0] < now - 3600_000) _msgTimestamps.shift();
  if (_msgTimestamps.length >= MSG_PER_HOUR) {
    console.warn("[WA][rate-limit] â  LÃ­mite por hora alcanzado. Protegiendo cuenta.");
    return false;
  }
  const lastMinute = _msgTimestamps.filter(t => t > now - 60_000);
  if (lastMinute.length >= MSG_PER_MINUTE) {
    console.warn("[WA][rate-limit] â  LÃ­mite por minuto alcanzado. Esperando...");
    return false;
  }
  return true;
}
function recordMessageSent() { _msgTimestamps.push(Date.now()); }

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ââ BOT NATIVO: Motor de flujo conversacional (sin APIs externas) âââââââ
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Estados (steps): "new" â "ask_name" â "menu" â "free" â "escalated"
// - "new":       primera vez que escribe â se le da bienvenida
// - "ask_name":  esperando que diga su nombre
// - "menu":      esperando que elija del menÃº
// - "free":      conversaciÃ³n libre (esperando input abierto)
// - "escalated": derivado a humano â el bot ya no responde

const nativeBotSessions = new Map();

// Cargar sesiones persistidas al iniciar
try {
  const _db = readWhatsAppDb();
  if (_db.nativeBotSessions && typeof _db.nativeBotSessions === "object") {
    for (const [k, v] of Object.entries(_db.nativeBotSessions)) {
      nativeBotSessions.set(k, v);
    }
    console.log("[NativeBot] Cargadas", nativeBotSessions.size, "sesiones desde DB");
  }
} catch {}

function persistNativeBotSessions() {
  try {
    const db = readWhatsAppDb();
    db.nativeBotSessions = Object.fromEntries(nativeBotSessions);
    writeWhatsAppDb(db);
  } catch {}
}

/** Guardar un lead capturado en la DB */
function saveLead(leadData) {
  try {
    const db = readWhatsAppDb();
    if (!db.leads) db.leads = [];
    db.leads.push({
      id:         randomId("lead_"),
      ...leadData,
      source:     "native-bot",
      capturedAt: nowIso(),
    });
    if (db.leads.length > 500) db.leads = db.leads.slice(-500);
    writeWhatsAppDb(db);
    console.log("[NativeBot][lead]", leadData.phone, leadData.name);
  } catch (err) {
    console.error("[NativeBot][lead-error]", err?.message || err);
  }
}

/** Comprobar si la sesiÃ³n expirÃ³ */
function nativeBotSessionExpired(session, ttlHours) {
  if (!session?.createdAt) return true;
  const ttl = (ttlHours || 24) * 60 * 60 * 1000;
  return Date.now() - new Date(session.createdAt).getTime() > ttl;
}

/** Comprobar si el mensaje pide escalar a un humano */
function shouldEscalate(text, escalateWords) {
  if (!escalateWords) return false;
  const words = escalateWords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
  const lc = text.toLowerCase().trim();
  return words.some(w => lc.includes(w));
}

/** Detectar nombre de un texto corto (heurÃ­stica simple) */
function extractNameFromText(text) {
  const clean = (text || "").trim();
  // Si es muy largo (>50 chars) probablemente no es un nombre
  if (clean.length > 50) return null;
  // Remover "me llamo", "soy", "mi nombre es", etc.
  const stripped = clean
    .replace(/^(me llamo|soy|mi nombre es|hola,?\s*(me llamo|soy)?)\s*/i, "")
    .replace(/^(i'?m|my name is|i am)\s*/i, "")
    .trim();
  if (!stripped || stripped.length < 2 || stripped.length > 40) return null;
  // Si tiene mÃ¡s de 4 palabras, probablemente no es un nombre
  if (stripped.split(/\s+/).length > 4) return null;
  // Capitalizar primera letra de cada palabra
  return stripped.replace(/\b\w/g, c => c.toUpperCase());
}

/** Reemplazar variables en template: {{nombre}}, {{telefono}} */
function templateReplace(template, vars) {
  return (template || "").replace(/\{\{(\w+)\}\}/g, (m, key) => {
    return vars[key] !== undefined ? vars[key] : m;
  });
}

/** Parsear el menuMap (JSON string â objeto) */
function parseMenuMap(menuMapStr) {
  try {
    if (typeof menuMapStr === "object") return menuMapStr;
    return JSON.parse(menuMapStr || "{}");
  } catch {
    return {};
  }
}

/**
 * Motor principal del bot nativo.
 * Recibe un mensaje y devuelve las respuestas a enviar.
 * NO hace fetch a ninguna API externa.
 */
function handleNativeBotMessage(jid, messageText, pushName, settings) {
  const text = (messageText || "").trim();
  const ttl = settings.nativeBotSessionTTL || 24;
  const phone = jid.split("@")[0];

  // Obtener o crear sesiÃ³n
  let session = nativeBotSessions.get(jid);

  // Si sesiÃ³n expirada â reset
  if (session && nativeBotSessionExpired(session, ttl)) {
    console.log("[NativeBot][session-expired]", jid);
    session = null;
    nativeBotSessions.delete(jid);
  }

  // ââ EscalaciÃ³n a humano (funciona en cualquier estado) ââ
  if (shouldEscalate(text, settings.nativeBotEscalateWords)) {
    console.log("[NativeBot][escalate]", jid);
    if (session) session.step = "escalated";
    else {
      session = { step: "escalated", name: pushName || "", phone, createdAt: nowIso(), msgCount: 1 };
      nativeBotSessions.set(jid, session);
    }
    persistNativeBotSessions();
    return ["ð Â¡Entendido! Te voy a comunicar con un asesor humano.", "Un momento por favor, alguien del equipo te atenderÃ¡ pronto ð"];
  }

  // ââ Si estÃ¡ escalado, el bot NO responde (lo atiende un humano) ââ
  if (session?.step === "escalated") {
    return []; // silencio â el humano responde
  }

  // ââ NUEVA CONVERSACIÃN â capturar lead y enviar a IA ââ
  if (!session) {
    const detectedName = pushName || extractNameFromText(text) || "";
    session = {
      step:      "ai",
      name:      detectedName,
      phone,
      createdAt: nowIso(),
      msgCount:  1,
      firstMsg:  text,
    };
    nativeBotSessions.set(jid, session);
    saveLead({ phone, name: detectedName, interest: text });
    persistNativeBotSessions();
    return { needsAI: true, context: `Primera vez que escribe. Se llama "${detectedName || "desconocido"}". SalÃºdalo cÃ¡lidamente por su nombre si lo tienes.` };
  }

  // ââ ConversaciÃ³n existente â todo va a IA ââ
  session.msgCount = (session.msgCount || 0) + 1;
  session.step = "ai";

  // Actualizar lead si tenemos info nueva
  if (pushName && !session.name) {
    session.name = pushName;
    saveLead({ phone, name: pushName, interest: text });
  }

  persistNativeBotSessions();
  return { needsAI: true, context: `Cliente "${session.name || "desconocido"}", mensaje #${session.msgCount}.` };
}

// ââ Chat store en memoria âââââââââââââââââââââââââââââââââââââââââââââââââââ
const WA_HISTORY_DAYS = 15;
const waChats    = new Map(); // jid â { id, name, phone, lastMsg, lastMsgTime, unread }
const waMessages = new Map(); // jid â [{ id, dir, txt, time, ts }]

// ── SSE real-time push ──────────────────────────────────────────────────
const sseClients = new Set();
function broadcastSSE(type, payload) {
  if (!sseClients.size) return;
  const msg = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const c of [...sseClients]) {
    try { c.res.write(msg); } catch { sseClients.delete(c); }
  }
}

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

async function storeMsg(msg) {
  const jid = msg?.key?.remoteJid;
  if (!jid || jid === "status@broadcast") return;

  const ts      = Number(msg.messageTimestamp || 0) * 1000 || Date.now();
  const cutoff  = Date.now() - WA_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  if (ts < cutoff) return;

  const text    = extractText(msg);
  const fromMe  = Boolean(msg.key?.fromMe);
  const isGroup = jid.endsWith("@g.us");
  const isLid   = isLidJid(jid);
  const rawIdNum = jid.split("@")[0];

  // ââ ResoluciÃ³n de nombre mejorada (soporta WhatsApp Business + @lid) ââ
  // Prioridad: pushName > verifiedName > cachedName (si es real) > "Contacto" (para @lid) o telÃ©fono (para @s.whatsapp.net)
  const pushName = (!fromMe && msg.pushName) ? msg.pushName.trim() : "";
  const verifiedName = (msg.verifiedBizName || "").trim();
  const cachedName = waChats.get(jid)?.name || "";
  const cachedNameIsReal = cachedName && !isJustDigits(cachedName) && !cachedName.includes("@") && cachedName !== "Contacto";

  // Para @lid JIDs, el rawIdNum NO es un telÃ©fono â no usarlo como nombre
  const fallbackName = isLid ? "Contacto" : (isGroup ? "Grupo" : rawIdNum);
  const resolvedName = pushName || verifiedName || (cachedNameIsReal ? cachedName : "") || fallbackName;
  const name = resolvedName;

  // Actualizar/crear chat en memoria
  const cachedPhone = waChats.get(jid)?.phone || "";
  const phoneForChat = isLid ? cachedPhone : rawIdNum;
  const chat = waChats.get(jid) || { id: jid, name: resolvedName, phone: phoneForChat, unread: 0, lastMsg: "", lastMsgTime: 0, isGroup };

  // Solo actualizar nombre si tenemos uno real (no sobreescribir nombre bueno con "Contacto" o nÃºmero)
  const pushNameIsReal = pushName && !isJustDigits(pushName);
  if (pushNameIsReal) chat.name = pushName;
  else if (verifiedName) chat.name = verifiedName;
  else if (!chat.name || isJustDigits(chat.name) || chat.name === "Contacto") chat.name = resolvedName;

  chat.lastMsg     = text;
  chat.lastMsgTime = ts;
  if (!fromMe) chat.unread = (chat.unread || 0) + 1;
  waChats.set(jid, chat);
  broadcastSSE("chat_update", { chatId: jid, name: chat.name, phone: chat.phone || "", lastMsg: text, lastMsgTime: ts, unread: chat.unread, isGroup });

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

  // ââ Persistir en DB en disco (whatsapp-db.json) âââââââââââââââââââââââââââ
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

    // ââ Descargar media si hay adjunto âââââââââââââââââââââââââââââââââââââ
    let mediaUrl = "";
    if (type !== "text" && type !== "sticker" && downloadMediaFn) {
      try {
        const buf  = await downloadMediaFn(msg, "buffer", {});
        const ext  = (mimeType.split("/")[1] || "bin").split(";")[0];
        const fname = `${msgId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
        const fpath = path.join(whatsappUploadsDir, fname);
        fs.writeFileSync(fpath, buf);
        mediaUrl = `/uploads/whatsapp/${fname}`;
        console.log("[WA][storeMsg][media-saved]", fname);
      } catch (dlErr) {
        console.warn("[WA][storeMsg][media-download-failed]", dlErr?.message || dlErr);
      }
    }

    const saved = saveMessage(db, {
      providerMessageId: msgId,
      chatId:    jid,
      from:      fromMe ? (waPhone || "agent@sanate.store") : jid,
      to:        fromMe ? jid : (waPhone || "agent@sanate.store"),
      timestamp: new Date(ts).toISOString(),
      type,
      text,
      mediaUrl,
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

    // ââ ReenvÃ­o a n8n si botEnabled + n8nEnabled (opera con Chrome cerrado) â
    const settings = db.settings || {};
    // isGroup ya definido arriba (lÃ­nea resoluciÃ³n de nombres)
    // ââ Verificar si la IA estÃ¡ activa para este chat (per-chat map) ââ
    // botEnabled = toggle global "IA ON" del frontend
    // aiContactMap = per-chat map { [jid]: true/false }
    const aiContactMap = settings.aiContactMap || {};
    const hasPerChatMap = Object.keys(aiContactMap).length > 0;
    // La IA estÃ¡ activa si: (1) toggle global ON, Y (2) chat activado explÃ­citamente
    // Si no hay mapa per-chat (legacy), NO activar para nadie (seguridad)
    const aiActiveForChat = settings.botEnabled && hasPerChatMap && aiContactMap[jid] === true;

    // SEGURIDAD: NUNCA responder a grupos automÃ¡ticamente
    if (isGroup) {
      // Solo almacenar, no responder
    } else if (!fromMe && isNew && !saved.dedup && settings.n8nEnabled && settings.n8nWebhook && aiActiveForChat) {
      const publicBase = (settings.backendPublicUrl || "").replace(/\/$/, "");
      const mediaFull = (url) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${publicBase}${url.startsWith("/") ? "" : "/"}${url}`;
      };
      const msgType =
        type === "audio"   ? "audio" :
        (type === "image" || type === "sticker") ? "image" : "text";

      // ââ FIX: Construir historial de Ãºltimos 10 mensajes para contexto IA ââ
      const chatMsgs = db.messages
        .filter(m => String(m.chatId) === String(jid))
        .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
        .slice(-10)
        .map(m => ({
          role: m.direction === "outgoing" ? "assistant" : "user",
          content: m.text || "[media]",
        }));

      const n8nPayload = {
        chatId:        jid,
        messageType:   msgType,
        text,
        audioUrl:      msgType === "audio" ? mediaFull(mediaUrl) : "",
        imageUrl:      msgType === "image" ? mediaFull(mediaUrl) : "",
        clientName:    name,
        systemPrompt:  settings.systemPrompt || "",
        openaiKey:     settings.openaiKey || process.env.OPENAI_API_KEY || "",
        backendUrl:    publicBase ? `${publicBase}/api/whatsapp` : "",
        backendSecret: WA_SECRET,
        history:       chatMsgs,
        source:        "backend-baileys",
      };

      // ââ FIX: Retry lÃ³gica â hasta 2 reintentos con backoff ââ
      const callN8n = async (attempt = 1) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          const r = await fetch(settings.n8nWebhook, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(n8nPayload),
            signal:  controller.signal,
          });
          clearTimeout(timeout);
          const data = await r.json().catch(() => ({}));
          const replyText = data?.reply || data?.text || data?.message || data?.output || "";
          console.log("[WA][n8n-forward][ok]", { chatId: jid, msgType, hasReply: !!replyText, attempt });

          // ââ Enviar respuesta de n8n directamente por Baileys ââââââââââââââ
          if (replyText && waSocket && waStatus === "connected") {
            try {
              // FIX: usar separador |||| que es el que usa el workflow n8n
              const parts = replyText.split(/\|\|\|\|/).map(p => p.trim()).filter(Boolean);
              const toSend = parts.length > 0 ? parts : [replyText.trim()];

              // Anti-detecciÃ³n: verificar rate limit antes de responder
              if (!canSendMessage()) {
                console.warn("[WA][n8n-auto-reply] Rate limit alcanzado, no se envÃ­a respuesta");
                return;
              }

              // Anti-detecciÃ³n: simular "escribiendo..." antes de responder
              try { await waSocket.presenceSubscribe(jid); } catch {}
              try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
              // Delay proporcional al largo del texto (simula lectura + escritura humana)
              const typingDelay = Math.min(800 + Math.floor(Math.random() * 2000) + toSend[0].length * 30, 8000);
              await new Promise(r => setTimeout(r, typingDelay));

              for (const part of toSend) {
                if (!canSendMessage()) break; // Rate limit check per-part
                recordMessageSent();
                await waSocket.sendMessage(jid, { text: part });

                // ââ FIX: Guardar cada parte del reply del bot en la DB ââââââ
                const replyMsgId = randomId("n8n_reply");
                saveMessage(readWhatsAppDb(), {
                  providerMessageId: replyMsgId,
                  chatId:    jid,
                  from:      waPhone || "agent@sanate.store",
                  to:        jid,
                  timestamp: nowIso(),
                  type:      "text",
                  text:      part,
                  status:    "sent",
                  direction: "outgoing",
                  chatName:  name,
                  rawPayload: { source: "n8n-auto-reply" },
                });
                const freshDb = readWhatsAppDb();
                writeWhatsAppDb(freshDb);

                // Anti-detecciÃ³n: delay humano entre partes
                if (toSend.length > 1) {
                  try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
                  const partDelay = 1200 + Math.floor(Math.random() * 2500); // 1.2-3.7s
                  await new Promise(res => setTimeout(res, partDelay));
                }
              }
              // Anti-detecciÃ³n: quitar estado "escribiendo"
              try { await waSocket.sendPresenceUpdate("paused", jid); } catch {}
              console.log("[WA][n8n-auto-reply][sent]", { chatId: jid, parts: toSend.length });
            } catch (sendErr) {
              console.warn("[WA][n8n-auto-reply][error]", sendErr?.message || sendErr);
            }
          }
        } catch (e) {
          console.warn(`[WA][n8n-forward][fail][attempt=${attempt}]`, e?.message || e);
          if (attempt < 3) {
            const delay = attempt * 3000; // 3s, 6s
            console.log(`[WA][n8n-forward][retry] attempt ${attempt + 1} in ${delay}ms`);
            await new Promise(res => setTimeout(res, delay));
            return callN8n(attempt + 1);
          }
          console.error("[WA][n8n-forward][exhausted] all retries failed for", jid);
        }
      };
      callN8n();
    }

    // ââ Bot Nativo: flujo conversacional ââââââââââââââââââââââââââââââââ
    // Solo responde si:
    // 1. NO es grupo (nunca responder en grupos)
    // 2. nativeBotEnabled estÃ¡ ON (toggle global en Ajustes)
    // 3. La IA estÃ¡ activa per-chat (aiContactMap[jid] === true) Y botEnabled global ON
    // NUNCA modo legacy (responder a todos) â requiere activaciÃ³n explÃ­cita per-chat
    const nbActiveForChat = !isGroup && settings.nativeBotEnabled && aiActiveForChat;
    if (!fromMe && isNew && !saved.dedup && nbActiveForChat) {
      const replyDelay = Math.max(300, Math.min(3000, settings.nativeBotReplyDelay || 800));
      (async () => {
        try {
          const result = handleNativeBotMessage(jid, text, name, settings);

          let replies = [];
          // Si handleNativeBotMessage devolviÃ³ un objeto con needsAI, intentar OpenAI
          if (result && result.needsAI) {
            const aiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
            if (aiKey) {
              // Obtener historial de mensajes para contexto
              const chatMsgs = (waMessages.get(jid) || []).slice(-8).map(m => ({
                role: m.dir === "s" ? "assistant" : "user",
                content: m.txt || "[media]",
              }));
              const defaultPrompt = `Eres la asesora de ventas de Sanate Store â productos naturales colombianos ð¿
REGLAS ESTRICTAS:
- Responde en espaÃ±ol, tono cÃ¡lido y humano como una amiga que asesora.
- Usa emojis estratÃ©gicos (1-2 por mensaje, NO en cada lÃ­nea). Ejemplos: ð¿ â¨ ð ð ð
- NUNCA respondas todo en un solo mensaje largo. Separa tu respuesta en 2-3 mensajes cortos usando el separador ||||
- Cada mensaje debe ser de mÃ¡ximo 2 lÃ­neas. Piensa como si escribieras por WhatsApp: frases cortas, naturales.
- Si el cliente saluda, salÃºdalo cÃ¡lidamente por su nombre (si lo tienes).
- Si preguntan por productos, recomienda visitar https://sanate.store
- Si piden hablar con alguien, di que conectarÃ¡s con un asesor.
${result.context || ""}`;
              const sysPrompt = settings.systemPrompt
                ? settings.systemPrompt + `\n\nIMPORTANTE: Separa tu respuesta en 2-3 mensajes cortos con el separador |||| entre cada uno. No respondas en un solo bloque.`
                : defaultPrompt;
              const aiReply = await callOpenAIChat({
                messages: [{ role: "system", content: sysPrompt }, ...chatMsgs, { role: "user", content: text }],
                maxTokens: 300,
                settings,
              });
              if (aiReply) {
                // Soportar respuestas multi-parte con separador ||||
                replies = aiReply.split(/\|\|\|\|/).map(p => p.trim()).filter(Boolean);
                console.log("[NativeBot][AI-enhanced]", { chatId: jid, parts: replies.length });
              }
            }
            // Si no hay API key o fallÃ³, usar fallback amigable
            if (!replies.length) {
              replies = ["Hola! ð En este momento no puedo procesar tu mensaje", "Pero te conecto con un asesor que te ayudarÃ¡ pronto ð"];
            }
          } else if (Array.isArray(result)) {
            replies = result;
          }

          if (replies.length && waSocket && waStatus === "connected") {
            // Anti-detecciÃ³n: verificar rate limit
            if (!canSendMessage()) {
              console.warn("[WA][native-bot] Rate limit alcanzado, no se envÃ­a respuesta");
              return;
            }
            // Anti-detecciÃ³n: simular lectura del mensaje + tiempo de pensar antes de escribir
            const readDelay = 500 + Math.floor(Math.random() * 1500); // 0.5-2s leyendo
            await new Promise(r => setTimeout(r, readDelay));

            try { await waSocket.presenceSubscribe(jid); } catch {}
            try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
            // Delay proporcional al largo de la respuesta (simula escritura humana)
            const firstReplyTyping = Math.min(
              1000 + Math.floor(Math.random() * 1500) + (replies[0]?.length || 0) * 25,
              6000 // mÃ¡ximo 6 segundos
            );
            await new Promise(r => setTimeout(r, firstReplyTyping));

            for (let i = 0; i < replies.length; i++) {
              const reply = replies[i];
              if (!reply.trim()) continue;
              if (!canSendMessage()) break; // Rate limit per-part
              recordMessageSent();
              await waSocket.sendMessage(jid, { text: reply });
              // Persistir respuesta del bot en DB
              const replyMsgId = randomId("bot_reply");
              saveMessage(readWhatsAppDb(), {
                providerMessageId: replyMsgId,
                chatId:    jid,
                from:      waPhone || "agent@sanate.store",
                to:        jid,
                timestamp: nowIso(),
                type:      "text",
                text:      reply,
                status:    "sent",
                direction: "outgoing",
                chatName:  name,
                rawPayload: { source: "native-bot-reply" },
              });
              writeWhatsAppDb(readWhatsAppDb());
              if (i < replies.length - 1) {
                // Anti-detecciÃ³n: pausa antes de "escribir" la siguiente parte
                try { await waSocket.sendPresenceUpdate("paused", jid); } catch {}
                const pauseBetween = 800 + Math.floor(Math.random() * 2000); // 0.8-2.8s pausa
                await new Promise(r => setTimeout(r, pauseBetween));
                try { await waSocket.sendPresenceUpdate("composing", jid); } catch {}
                // Simular escritura de la siguiente parte
                const nextTyping = Math.min(800 + (replies[i+1]?.length || 0) * 25 + Math.floor(Math.random() * 1500), 5000);
                await new Promise(r => setTimeout(r, nextTyping));
              }
            }
            // Quitar estado "escribiendo"
            try { await waSocket.sendPresenceUpdate("paused", jid); } catch {}
            console.log("[NativeBot][reply][sent]", { chatId: jid, parts: replies.length });
          }
        } catch (botErr) {
          console.error("[NativeBot][reply][error]", botErr?.message || botErr);
        }
      })();
    }
  } catch (err) {
    console.error("[WA][storeMsg][persist-error]", err?.message || err);
  }
}

// ââ Bot Nativo: endpoints para ver/resetear sesiones y leads ââââââââââââââ
app.get("/api/whatsapp/bot/sessions", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const sessions = [];
  for (const [jid, s] of nativeBotSessions) {
    sessions.push({ jid, ...s });
  }
  res.json({ ok: true, sessions, total: sessions.length });
});

app.delete("/api/whatsapp/bot/sessions/:jid", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const jid = req.params.jid;
  nativeBotSessions.delete(jid);
  persistNativeBotSessions();
  res.json({ ok: true, deleted: jid });
});

app.delete("/api/whatsapp/bot/sessions", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  const count = nativeBotSessions.size;
  nativeBotSessions.clear();
  persistNativeBotSessions();
  res.json({ ok: true, cleared: count });
});

// ââ Leads capturados âââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get("/api/whatsapp/bot/leads", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    const leads = db.leads || [];
    const limit = Math.min(200, parseInt(req.query?.limit) || 50);
    const recent = leads.slice(-limit).reverse();
    res.json({ ok: true, leads: recent, total: leads.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error reading leads" });
  }
});

app.delete("/api/whatsapp/bot/leads", (req, res) => {
  if (!checkWaSecret(req, res)) return;
  try {
    const db = readWhatsAppDb();
    const count = (db.leads || []).length;
    db.leads = [];
    writeWhatsAppDb(db);
    res.json({ ok: true, cleared: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Error" });
  }
});

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
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage, Browsers } =
      await import("@whiskeysockets/baileys");
    downloadMediaFn = downloadMediaMessage;
    const { default: pino } = await import("pino");
    const { toDataURL }     = await import("qrcode");

    if (!fs.existsSync(waAuthDir)) fs.mkdirSync(waAuthDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(waAuthDir);
    const { version }          = await fetchLatestBaileysVersion();

    waStatus = "connecting";
    // ââ Anti-detecciÃ³n: imitar WhatsApp Web real ââââââââââââââââââââââââââââââ
    // Browsers tiene presets: "ubuntu", "windows", "macOS", "appropriate"
    // Usar uno de los presets oficiales para parecer un navegador real.
    const browserFingerprint = Browsers
      ? Browsers.windows("Chrome")           // Genera ["Windows", "Chrome", "10.0.22631"]
      : ["Windows", "Chrome", "10.0.22631"]; // Fallback: Windows 11 Chrome

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: browserFingerprint,
      syncFullHistory: false,
      // Anti-detecciÃ³n: delays y timeouts mÃ¡s humanos
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: undefined, // Sin timeout agresivo en queries
      keepAliveIntervalMs: 25_000,      // Keepalive cada 25s (como WA Web real)
      emitOwnEvents: true,
      markOnlineOnConnect: true,         // Marcar como "en lÃ­nea" al conectar (comportamiento normal)
    });

    sock.ev.on("creds.update", saveCreds);

    // ââ Contador de QRs generados en esta sesiÃ³n (evitar escaneos infinitos) ââ
    let qrCount = 0;
    const MAX_QR_PER_SESSION = 5; // MÃ¡ximo 5 QRs antes de parar (evita ban por login spam)

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrCount++;
        if (qrCount > MAX_QR_PER_SESSION) {
          console.warn(`[WA] â  LÃ­mite de QRs alcanzado (${MAX_QR_PER_SESSION}). Deteniendo para proteger la cuenta.`);
          waStatus = "disconnected"; waQR = null; waIniting = false;
          try { sock.end(undefined); } catch {}
          return;
        }
        try { waQR = await toDataURL(qr); } catch {}
        waStatus = "connecting";
        console.log(`[WA] QR generado (${qrCount}/${MAX_QR_PER_SESSION})`);
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log("[WA] Conexion cerrada, loggedOut:", loggedOut, "code:", code);
        waStatus = "disconnected"; waQR = null; waPhone = ""; waSocket = null; waIniting = false;
        broadcastSSE("status", { status: "disconnected" });

        // Anti-detecciÃ³n: NO reconectar si fue logout o ban (cÃ³digos 401, 403, 440)
        const dangerCodes = [401, 403, 440, DisconnectReason.loggedOut];
        if (dangerCodes.includes(code) || loggedOut) {
          console.warn("[WA] â  SesiÃ³n cerrada por WhatsApp. NO se reconectarÃ¡ automÃ¡ticamente para proteger la cuenta.");
          return;
        }

        // ReconexiÃ³n con delay HUMANO (aleatorio, no predecible)
        waReconnectAttempt++;
        if (waReconnectAttempt > 8) {
          console.warn("[WA] â  Demasiados reintentos. Deteniendo reconexiÃ³n automÃ¡tica.");
          return;
        }
        // Delay base + jitter aleatorio para parecer humano
        const baseDelay = Math.min(10_000 * Math.pow(2, waReconnectAttempt - 1), 300_000); // 10s â 5min max
        const jitter = Math.floor(Math.random() * 15_000); // 0-15s de variaciÃ³n aleatoria
        const delay = baseDelay + jitter;
        console.log(`[WA] Reconectando en ${Math.round(delay/1000)}s (intento ${waReconnectAttempt}/8)`);
        setTimeout(initWhatsApp, delay);
      } else if (connection === "open") {
        waStatus = "connected"; waQR = null;
        waReconnectAttempt = 0; // reset backoff on successful connection
        qrCount = 0;           // reset QR counter on successful connection
        waPhone  = sock.user?.id?.split(":")[0] || sock.user?.id || "";
        console.log("[WA] â Conectado:", waPhone);
        broadcastSSE("status", { status: "connected", phone: waPhone });

        // ââ Fetch metadata para TODOS los grupos con nombre genÃ©rico ââ
        setTimeout(async () => {
          try {
            const db = readWhatsAppDb();
            const groupChats = db.chats.filter(c =>
              (c.chatId || "").endsWith("@g.us") &&
              (!c.name || c.name === "Grupo" || c.name === "Esteban" || isJustDigits(c.name))
            );
            for (const gc of groupChats) {
              try {
                const meta = await sock.groupMetadata(gc.chatId);
                const subject = (meta?.subject || "").trim();
                if (subject) {
                  gc.name = subject;
                  // Actualizar en memoria
                  const memChat = waChats.get(gc.chatId);
                  if (memChat) { memChat.name = subject; waChats.set(gc.chatId, memChat); }
                  console.log(`[WA] Grupo actualizado: ${gc.chatId} â "${subject}"`);
                }
              } catch {}
              // Anti-detecciÃ³n: delay entre cada consulta de metadata
              await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
            }
            if (groupChats.length) writeWhatsAppDb(db);
          } catch (e) {
            console.warn("[WA] Error fetching group metadata:", e?.message);
          }
        }, 5000); // Esperar 5s despuÃ©s de conexiÃ³n para empezar
      }
    });

    // ââ Almacenar mensajes entrantes/salientes âââââââââââââââââââââââââââââ
    sock.ev.on("messages.upsert", ({ messages: msgs, type }) => {
      for (const m of msgs) storeMsg(m).catch(e => console.error("[WA][storeMsg]", e?.message));
    });

    // ââ Historial inicial al reconectar (procesado suavemente para no disparar rate limits)
    sock.ev.on("messaging-history.set", ({ chats: histChats, messages: histMsgs }) => {
      console.log("[WA] Historial recibido: chats:", histChats?.length, "msgs:", histMsgs?.length);
      if (Array.isArray(histMsgs) && histMsgs.length > 0) {
        // Anti-detecciÃ³n: batches mÃ¡s pequeÃ±os (20) con setTimeout (no setImmediate)
        let idx = 0;
        const batch = () => {
          const end = Math.min(idx + 20, histMsgs.length);
          for (; idx < end; idx++) storeMsg(histMsgs[idx]).catch(() => {});
          if (idx < histMsgs.length) setTimeout(batch, 100); // 100ms entre batches
          else console.log("[WA] Historial mensajes procesado:", histMsgs.length);
        };
        setTimeout(batch, 500); // Esperar 500ms antes de empezar a procesar
      }
      if (Array.isArray(histChats)) {
        for (const c of histChats) {
          const cIsLid = isLidJid(c.id);
          const cIsGroup = c.id.endsWith("@g.us");
          const rawNum = c.id.split("@")[0];
          const cName = c.name || (cIsGroup ? "Grupo" : (cIsLid ? "Contacto" : rawNum));
          const cPhone = cIsLid ? "" : rawNum;
          if (!waChats.has(c.id)) {
            waChats.set(c.id, {
              id:          c.id,
              name:        cName,
              phone:       cPhone,
              unread:      c.unreadCount || 0,
              lastMsg:     "",
              lastMsgTime: 0,
              isGroup:     cIsGroup,
            });
          }
        }
      }
    });

    // ââ Upsert de chats (lista inicial) âââââââââââââââââââââââââââââââââââ
    sock.ev.on("chats.upsert", (chats) => {
      for (const c of chats) {
        const cIsLid = isLidJid(c.id);
        const cIsGroup = c.id.endsWith("@g.us");
        const rawNum = c.id.split("@")[0];
        const cPhone = cIsLid ? "" : rawNum;
        // Para @lid, NO usar el nÃºmero como nombre
        const chatName = c.name || (cIsGroup ? "Grupo" : (cIsLid ? "Contacto" : rawNum));
        const chatNameIsReal = chatName && !isJustDigits(chatName) && chatName !== "Contacto";

        if (!waChats.has(c.id)) {
          waChats.set(c.id, {
            id:          c.id,
            name:        chatName,
            phone:       cPhone,
            unread:      c.unreadCount || 0,
            lastMsg:     "",
            lastMsgTime: 0,
            isGroup:     cIsGroup,
          });
        } else {
          const existing = waChats.get(c.id);
          // Solo actualizar nombre si el nuevo es real y el existente no lo es
          if (chatNameIsReal && (!existing.name || isJustDigits(existing.name) || existing.name === "Contacto")) {
            existing.name = chatName;
            waChats.set(c.id, existing);
          }
        }
        // Persistir en DB
        try {
          const db = readWhatsAppDb();
          ensureChat(db, { chatId: c.id, name: chatName, phone: cPhone });
          writeWhatsAppDb(db);
        } catch {}

        // ââ Fetch metadata de grupo para obtener el nombre real (subject) ââ
        if (cIsGroup && sock) {
          sock.groupMetadata(c.id).then(meta => {
            const subject = (meta?.subject || "").trim();
            if (!subject) return;
            // Actualizar en memoria
            const memChat = waChats.get(c.id);
            if (memChat) { memChat.name = subject; waChats.set(c.id, memChat); }
            // Actualizar en DB
            try {
              const db2 = readWhatsAppDb();
              const gIdx = db2.chats.findIndex(ch => ch.chatId === c.id);
              if (gIdx >= 0) { db2.chats[gIdx].name = subject; writeWhatsAppDb(db2); }
              else { ensureChat(db2, { chatId: c.id, name: subject, phone: "" }); writeWhatsAppDb(db2); }
            } catch {}
            console.log(`[WA] Grupo metadata: ${c.id} â "${subject}"`);
          }).catch(() => {}); // Silenciar errores de metadata
        }
      }
    });

    // ââ Capturar nombres de contactos desde Baileys ââââââââââââââââââââââ
    // Actualiza tanto en memoria como en DB persistente
    const _updateContactName = (c) => {
      if (!c.id) return;
      const name = (c.notify || c.verifiedName || c.name || "").trim();
      if (!name) return;
      const cIsLid = isLidJid(c.id);
      const rawNum = c.id.split("@")[0];
      // No guardar un nÃºmero puro como nombre (a menos que sea @s.whatsapp.net donde ES el telÃ©fono)
      if (isJustDigits(name) && (cIsLid || name === rawNum)) return;
      const cPhone = cIsLid ? "" : rawNum;

      // Actualizar en memoria
      const existing = waChats.get(c.id);
      if (existing) {
        existing.name = name;
        waChats.set(c.id, existing);
      } else {
        waChats.set(c.id, {
          id: c.id, name, phone: cPhone,
          unread: 0, lastMsg: "", lastMsgTime: 0,
          isGroup: c.id.endsWith("@g.us"),
        });
      }
      // Actualizar en DB persistente â siempre actualizar si tenemos un nombre real
      try {
        const db = readWhatsAppDb();
        const chatIdx = db.chats.findIndex(ch => String(ch.chatId) === String(c.id));
        if (chatIdx >= 0) {
          const oldName = db.chats[chatIdx].name || "";
          // Siempre actualizar si nombre viejo no es un nombre real
          if (!oldName || isJustDigits(oldName) || oldName.includes("@") || oldName === "Contacto") {
            db.chats[chatIdx].name = name;
            writeWhatsAppDb(db);
          }
        } else {
          // Chat no existe en DB, crearlo
          ensureChat(db, { chatId: c.id, name, phone: cPhone });
          writeWhatsAppDb(db);
        }
      } catch {}
    };

    sock.ev.on("contacts.update", (contacts) => {
      for (const c of contacts) _updateContactName(c);
    });

    sock.ev.on("contacts.upsert", (contacts) => {
      for (const c of contacts) _updateContactName(c);
    });

    waSocket = sock;
  } catch (err) {
    console.error("[WA] Error init:", err?.message || err);
    waStatus = "disconnected"; waIniting = false;
    waReconnectAttempt++;
    if (waReconnectAttempt > 8) {
      console.warn("[WA] â  Demasiados errores de init. Deteniendo reconexiÃ³n automÃ¡tica para proteger la cuenta.");
      return;
    }
    // Anti-detecciÃ³n: delay largo + jitter
    const baseDelay = Math.min(15_000 * Math.pow(2, waReconnectAttempt - 1), 300_000);
    const jitter = Math.floor(Math.random() * 20_000);
    const delay = baseDelay + jitter;
    console.log(`[WA] Reintentando init en ${Math.round(delay/1000)}s (intento ${waReconnectAttempt}/8)`);
    setTimeout(initWhatsApp, delay);
  }
}

// Arrancar WhatsApp al iniciar
initWhatsApp();

// ââ WATCHDOG: auto-heal SUAVE (anti-detecciÃ³n) âââââââââââââââââââââââââââââ
// Cada 2 minutos (+ jitter) verifica la conexiÃ³n. NO fuerza reconexiones agresivas.
let _lastConnectedAt = 0;
const WATCHDOG_BASE_INTERVAL = 120_000; // 2 minutos base
const watchdogCheck = () => {
  const jitter = Math.floor(Math.random() * 30_000); // 0-30s variaciÃ³n
  setTimeout(() => {
    if (waStatus === "connected") {
      _lastConnectedAt = Date.now();
      watchdogCheck(); // Programar siguiente check
      return;
    }
    // Si estÃ¡ en "connecting" por mÃ¡s de 5 minutos SIN QR, algo fallÃ³
    if (waStatus === "connecting" && !waQR && (Date.now() - _lastConnectedAt > 300_000)) {
      console.log("[WA][watchdog] connecting sin QR por >5min, reiniciando suavemente...");
      waIniting = false;
      waReconnectAttempt = 0; // Reset para dar oportunidad limpia
      initWhatsApp();
      watchdogCheck();
      return;
    }
    // Si estÃ¡ disconnected y nadie lo estÃ¡ manejando, reconectar UNA vez
    if (waStatus === "disconnected" && !waIniting && waReconnectAttempt < 8) {
      console.log("[WA][watchdog] disconnected, reconectando suavemente...");
      initWhatsApp();
    }
    watchdogCheck(); // Programar siguiente check
  }, WATCHDOG_BASE_INTERVAL + jitter);
};
watchdogCheck();

// ââ Rutas API WhatsApp (estado, QR, desvinculaciÃ³n) âââââââââââââââââââââââ
// ── SSE real-time events ──────────────────────────────────────────────────
app.get("/api/whatsapp/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  const client = { id: Date.now(), res };
  sseClients.add(client);
  res.write(`data: ${JSON.stringify({ type: "status", status: waStatus, phone: waPhone })}\n\n`);
  const hb = setInterval(() => {
    try { res.write(": keepalive\n\n"); } catch { clearInterval(hb); sseClients.delete(client); }
  }, 25000);
  req.on("close", () => { clearInterval(hb); sseClients.delete(client); });
});

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
    waReconnectAttempt = 0; // Reset para nueva sesiÃ³n limpia
    if (fs.existsSync(waAuthDir)) fs.rmSync(waAuthDir, { recursive: true, force: true });
    // Anti-detecciÃ³n: esperar 3-5 segundos antes de reiniciar (no inmediato)
    const logoutDelay = 3000 + Math.floor(Math.random() * 2000);
    setTimeout(initWhatsApp, logoutDelay);
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

// ââ Presencia / indicador de escritura (typing simulation) âââââââââââââââââââ
// POST /api/whatsapp/chats/:chatId/presence
// body: { action: "composing" | "paused" | "available" | "recording" }
app.post("/api/whatsapp/chats/:chatId/presence", async (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    const action = toSafeString(req.body?.action || "composing", 30);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    if (waSocket && waStatus === "connected") {
      const jid = chatId.includes("@") ? chatId : `${chatId}@s.whatsapp.net`;
      await waSocket.sendPresenceUpdate(action, jid);
      return res.json({ ok: true, action, jid });
    }
    return res.json({ ok: false, error: "WhatsApp no conectado" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Foto de perfil vÃ­a Baileys (con cachÃ© en DB)
app.get("/api/whatsapp/chats/:chatId/photo", async (req, res) => {
  try {
    const chatId = toSafeString(req.params?.chatId || "", 140);
    if (!chatId) return res.status(400).json({ ok: false, error: "chatId requerido" });
    const db = readWhatsAppDb();
    const idx = db.chats.findIndex((c) => String(c.chatId) === String(chatId));
    let photoUrl = idx >= 0 ? db.chats[idx].photoUrl : "";
    // Intentar refrescar vÃ­a Baileys si hay socket
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

// Intentar iniciar con HTTPS (cert auto-firmado local, instalado como trusted)
// Esto permite que sanate.store (HTTPS) llame a localhost sin bloqueo de Chrome PNA
// ═══════════════════════════════════════════════════════════════════════
// ── COLOMBIA INTELIGENTE — RSS feeds + topic extraction + investment AI ──
// ═══════════════════════════════════════════════════════════════════════

const COLOMBIA_RSS_FEEDS = [
  { name: 'El Tiempo', url: 'https://www.eltiempo.com/rss/colombia.xml' },
  { name: 'Semana', url: 'https://www.semana.com/rss' },
  { name: 'RCN Radio', url: 'https://www.rcnradio.com/feeds/colombia.xml' },
  { name: 'Blu Radio', url: 'https://www.bluradio.com/rss' },
  { name: 'Portafolio', url: 'https://www.portafolio.co/rss/economia.xml' },
];

const colombiaCache = { news: null, topics: null, parties: null, candidates: null, virals: null, investment: null, lastFetch: 0 };
const COLOMBIA_CACHE_TTL = 45000;

async function fetchRSSFeed(feedUrl, feedName, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SanateMonitor/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' }
    });
    clearTimeout(timer);
    if (!resp.ok) return [];
    const xml = await resp.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
      const block = match[1];
      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const descMatch = block.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/);
      const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
      const linkMatch = block.match(/<link>(.*?)<\/link>/);
      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
      if (!title) continue;
      const pubDate = dateMatch?.[1] ? new Date(dateMatch[1]) : new Date();
      const hours = pubDate.getHours();
      const mins = String(pubDate.getMinutes()).padStart(2, '0');
      items.push({ id: feedName + '-' + items.length, title, source: feedName, hour: hours + ':' + mins, summary: (descMatch?.[1] || descMatch?.[2] || '').replace(/<[^>]+>/g, '').trim().slice(0, 180), link: (linkMatch?.[1] || '').trim(), updatedAt: pubDate.toISOString() });
    }
    return items;
  } catch { clearTimeout(timer); return []; }
}

async function refreshColombiaData() {
  if (Date.now() - colombiaCache.lastFetch < COLOMBIA_CACHE_TTL && colombiaCache.news) return;
  const feedResults = await Promise.allSettled(COLOMBIA_RSS_FEEDS.map(f => fetchRSSFeed(f.url, f.name)));
  const allNews = feedResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  allNews.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  colombiaCache.news = allNews.slice(0, 20);
  const topicKeywords = {
    'Gobierno y congreso': ['gobierno', 'congreso', 'senado', 'presidente', 'petro', 'reforma'],
    'Seguridad regional': ['seguridad', 'militar', 'ejercito', 'policia', 'conflicto', 'guerrilla'],
    'Economia y empleo': ['economia', 'empleo', 'desempleo', 'pib', 'inflacion', 'banco', 'dolar'],
    'Salud publica': ['salud', 'hospital', 'eps', 'vacuna'],
    'Educacion': ['educacion', 'universidad', 'escuela'],
    'Medio ambiente': ['ambiente', 'deforestacion', 'cambio climatico'],
    'Tecnologia e innovacion': ['tecnologia', 'digital', 'ia', 'startups'],
    'Deportes Colombia': ['seleccion', 'futbol', 'olimpicos', 'ciclismo'],
  };
  const topicScores = {};
  for (const item of allNews) {
    const text = (item.title + ' ' + item.summary).toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => text.includes(kw))) topicScores[topic] = (topicScores[topic] || 0) + 1;
    }
  }
  colombiaCache.topics = Object.entries(topicScores).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title], idx) => ({ id: idx + 1, title }));
  colombiaCache.parties = [
    { id: 'p1', title: 'Pacto Historico', party: 'Coalicion gobierno' },
    { id: 'p2', title: 'Centro Democratico', party: 'Oposicion' },
    { id: 'p3', title: 'Partido Liberal', party: 'Independiente' },
    { id: 'p4', title: 'Partido Conservador', party: 'Independiente' },
    { id: 'p5', title: 'Partido Verde', party: 'Coalicion gobierno' },
    { id: 'p6', title: 'Cambio Radical', party: 'Independiente' },
  ];
  colombiaCache.candidates = [
    { id: 'c1', title: 'Gustavo Petro', studies: 'Presidente actual', recognitions: 'Pacto Historico' },
    { id: 'c2', title: 'Maria Fernanda Cabal', studies: 'Senadora', recognitions: 'Centro Democratico' },
    { id: 'c3', title: 'Sergio Fajardo', studies: 'Ex-gobernador Antioquia', recognitions: 'Independiente' },
    { id: 'c4', title: 'German Vargas Lleras', studies: 'Ex-vicepresidente', recognitions: 'Cambio Radical' },
  ];
  colombiaCache.virals = [];
  colombiaCache.investment = [
    { asset: 'ETF iColcap', type: 'ETF', horizon: '15d', score: 7, thesis: 'Indice colombiano con potencial de recuperacion' },
    { asset: 'Ecopetrol', type: 'accion', horizon: '2m', score: 6, thesis: 'Petrolera estatal, dividendos atractivos' },
    { asset: 'Bancolombia', type: 'accion', horizon: '15d', score: 7, thesis: 'Sector bancario solido' },
  ];
  colombiaCache.lastFetch = Date.now();
}

app.get('/api/colombia/news', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.news || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/topics', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.topics || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/parties', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.parties || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/candidates', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.candidates || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/virals', async (req, res) => { try { await refreshColombiaData(); res.json({ items: colombiaCache.virals || [] }); } catch { res.json({ items: [] }); } });
app.get('/api/colombia/investment-insights', async (req, res) => { try { await refreshColombiaData(); res.json({ ideas: colombiaCache.investment || [] }); } catch { res.json({ ideas: [] }); } });

// SPA fallback - serve index.html for all unmatched routes
app.get('*', (req, res) => {
  const pubHtml = path.join(__dirname, '..', 'public_html', 'index.html');
  const buildHtml = path.join(__dirname, '..', 'build', 'index.html');
  const indexPath = fs.existsSync(pubHtml) ? pubHtml : buildHtml;
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

const certDir = path.join(__dirname, 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath  = path.join(certDir, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    const sslOptions = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
      console.log(`SERVER ON HTTPS :${PORT}`);
    });
    http.createServer(app).listen(5056, '0.0.0.0', () => {
      console.log(`SERVER ON HTTP :5056 (fallback)`);
    });
  } catch (e) {
    console.warn('HTTPS failed, falling back to HTTP:', e.message);
    app.listen(PORT, '0.0.0.0', () => { console.log(`SERVER ON HTTP :${PORT}`); });
  }
} else {
  app.listen(PORT, '0.0.0.0', () => { console.log(`SERVER ON HTTP :${PORT}`); });
}







