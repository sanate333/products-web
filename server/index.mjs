import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const storageDir = path.resolve(__dirname, "..", "public", "ai-images");
const metadataDir = path.resolve(__dirname, "..", "data");
const metadataFile = path.resolve(metadataDir, "ai-images.json");
const MAX_IMAGES_PER_SLOT = 10;

if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
if (!fs.existsSync(metadataDir)) fs.mkdirSync(metadataDir, { recursive: true });
if (!fs.existsSync(metadataFile)) fs.writeFileSync(metadataFile, JSON.stringify({ images: [] }, null, 2));

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "5mb" }));
app.use("/ai-images", express.static(storageDir));

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sanitizeArray = (arr) => Array.isArray(arr) ? arr : [];
const analyzeModel = "gpt-4o-mini";
const recommendModel = "gpt-4.1";
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { files: 3 } });
const mockMode = process.env.OPENAI_MOCK === "1";
const placeholderBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAABlBMVEUAAAD///+l2Z/dAAAACklEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

function extractJson(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const markdown = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = markdown?.[1] ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const payload = candidate.slice(start, end + 1);
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function buildIndex(images) {
  const map = new Map();
  for (const image of images) {
    const key = `${image.userId}:${image.productId}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(image);
  }
  return map;
}

function readMetadata() {
  const raw = fs.readFileSync(metadataFile, "utf-8") || "";
  const data = JSON.parse(raw || "{}");
  data.images = Array.isArray(data.images) ? data.images : [];
  const index = buildIndex(data.images);
  return { data, index };
}

function writeMetadataAtomic(payload) {
  const temp = `${metadataFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(payload, null, 2));
  fs.renameSync(temp, metadataFile);
}

function ensureLimit(index, userId, productId, extra = 1) {
  const key = `${userId}:${productId}`;
  const current = index.get(key)?.length ?? 0;
  if (current + extra > MAX_IMAGES_PER_SLOT) {
    return { ok: false, error: "max_10_images" };
  }
  return { ok: true, available: MAX_IMAGES_PER_SLOT - (current + extra) };
}

function removeFiles(files = []) {
  for (const file of sanitizeArray(files)) {
    const filepath = path.resolve(storageDir, file.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}

function createMockImage(filename) {
  const filepath = path.resolve(storageDir, filename);
  if (!fs.existsSync(filepath)) {
    const buffer = Buffer.from(placeholderBase64, "base64");
    fs.writeFileSync(filepath, buffer);
  }
  return filepath;
}

function getSortedImages(list) {
  return [...list].sort((a, b) => {
    const diff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    if (diff !== 0) return diff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

const PORT = Number(process.env.PORT) || 5055;

app.get("/", (_req, res) => res.send("SERVER ACTIVO DESDE SERVER/INDEX.MJS"));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/ai-images", express.static(storageDir));

const handleAiImagesList = (req, res) => {
  const { userId, productId } = req.query;
  const { data, index } = readMetadata();
  const key = userId && productId ? `${userId}:${productId}` : null;
  let images = key ? (index.get(key) ?? []) : data.images;
  if (userId && !productId) {
    images = data.images.filter((img) => img.userId === userId);
  }
  if (productId && !userId) {
    images = data.images.filter((img) => img.productId === productId);
  }
  res.json({ ok: true, images: getSortedImages(images) });
};

const handleAiImagesReorder = (req, res) => {
  const { userId, productId, order } = req.body;
  if (!userId || !productId || !Array.isArray(order)) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }
  const { data } = readMetadata();
  const target = data.images.filter((img) => img.userId === userId && img.productId === productId);
  if (!target.length) {
    return res.status(404).json({ ok: false, error: "no_images" });
  }
  const orderMap = Object.fromEntries(order.map((item) => [item.id, Number(item.orderIndex)]));
  for (const image of data.images) {
    if (image.userId === userId && image.productId === productId && orderMap[image.id] != null) {
      image.orderIndex = orderMap[image.id];
    }
  }
  writeMetadataAtomic(data);
  res.json({ ok: true });
};

const handleAiImagesDelete = (req, res) => {
  const { userId, imageId } = req.body;
  if (!userId || !imageId) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }
  const { data } = readMetadata();
  const idx = data.images.findIndex((img) => img.id === imageId);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "image_not_found" });
  }
  const image = data.images[idx];
  if (image.userId !== userId) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  removeFiles(image.files);
  data.images.splice(idx, 1);
  writeMetadataAtomic(data);
  res.json({ ok: true });
};

app.get("/ai-images", handleAiImagesList);
app.get("/api/ai-images", handleAiImagesList);
app.post("/ai-images/reorder", handleAiImagesReorder);
app.post("/api/ai-images/reorder", handleAiImagesReorder);
app.post("/ai-images/delete", handleAiImagesDelete);
app.post("/api/ai-images/delete", handleAiImagesDelete);

const variantTemplates = [
  { label: "hero_studio", detail: "hero shot con iluminacion de estudio" },
  { label: "lifestyle", detail: "escena lifestyle que muestre al cliente" },
  { label: "close_up", detail: "primer plano del producto resaltando detalles" },
  { label: "flatlay", detail: "flat lay premium sobre fondo limpio" },
];

const handleImageAnalyze = async (req, res) => {
  const { userId, country, productName, productDetails } = req.body;
  const files = req.files ?? [];
  if (!userId || !country || !productName) {
    return res.status(400).json({ ok: false, error: "missing_required_fields" });
  }

  if (mockMode) {
    return res.json({
      ok: true,
      category: "producto personalizado",
      visualIdentity: "realismo comercial + luz natural",
      angles: [
        "Hero shot emocional",
        "Detalle de textura",
        "Uso lifestyle",
        "Comparativa funcional",
        "Beneficio respaldo",
        "Storytelling natural",
      ],
      benefits: [
        "Apariencia radiante",
        "Duración extendida",
        "Textura premium",
        "Respeto al medio ambiente",
        "Fácil de usar",
        "Alta conversión",
        "Confianza médica",
        "Garantía oficial",
      ],
      doNotClaim: ["no diga curar", "no mencione milagros"],
      recommendedTemplates: ["Hero", "Offer", "Benefits"],
      castingSuggestion: `Casting diverso inspirado en ${country}`,
    });
  }

  const base = `Describe el producto ${productName} (${productDetails ?? "sin detalles adicionales"}) y su posible uso en ${country}.`;
  const attachments = files.map((file) => ({
    type: "input_image",
    image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
  }));

  try {
    const response = await openaiClient.responses.create({
      model: analyzeModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${base} Proporciona categoría, identidad visual, 6 ángulos de venta, 8 beneficios, 5 estilos visuales y qué no afirmar (do not claim). Devuelve solo JSON con keys: category, visualIdentity, angles, benefits, doNotClaim, recommendedTemplates.` },
            ...attachments,
          ],
        },
      ],
      temperature: 0.2,
    });
    const rawText = getResponseText(response);
    const parsed = extractJson(rawText);
    if (!parsed) {
      return res.status(502).json({ ok: false, error: "analysis_json_failed", raw: rawText });
    }
    const result = {
      category: parsed.category ?? "general",
      visualIdentity: parsed.visualIdentity ?? "fotografía realista",
      angles: Array.isArray(parsed.angles) ? parsed.angles : [],
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      doNotClaim: Array.isArray(parsed.doNotClaim) ? parsed.doNotClaim : [],
      recommendedTemplates: Array.isArray(parsed.recommendedTemplates) ? parsed.recommendedTemplates : [],
      castingSuggestion: parsed.castingSuggestion ?? `Casting natural y diverso inspirado en ${country}`,
    };
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
};

app.post("/image-analyze", uploadMemory.array("files", 3), handleImageAnalyze);
app.post("/api/image-analyze", uploadMemory.array("files", 3), handleImageAnalyze);

const handleImageGenerate = async (req, res) => {
  const {
    userId,
    productId,
    country,
    templateType,
    angle,
    benefit,
    style,
    size = "1024x1024",
    referenceImageIds = [],
    referenceFilenames = [],
  } = req.body;

  if (!userId || !productId || !country || !templateType || !angle || !benefit || !style) {
    return res.status(400).json({ ok: false, error: "missing_required_fields" });
  }

  const { data, index } = readMetadata();
  if (!ensureLimit(index, userId, productId, variantTemplates.length).ok) {
    return res.status(409).json({ ok: false, error: "max_10_images" });
  }

  const existing = index.get(`${userId}:${productId}`) ?? [];
  const nextOrder = (existing.reduce((max, img) => Math.max(max, img.orderIndex ?? 0), 0) || 0) + 1;
  const generated = [];

  const referenceSection = [
    referenceImageIds && referenceImageIds.length ? `Referencias: ${referenceImageIds.join(", ")}.` : "",
    referenceFilenames && referenceFilenames.length ? `Influenciado por archivos: ${referenceFilenames.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    if (mockMode) {
      for (const [idx, variant] of variantTemplates.entries()) {
        const prompt = `Mock prompt ${variant.label}`;
        const filename = `mock_${userId}_${productId}_${variant.label}.png`;
        createMockImage(filename);
        const url = `/ai-images/${filename}`;
        const buffer = Buffer.from(placeholderBase64, "base64");
        const record = {
          id: randomUUID(),
          userId,
          productId,
          country,
          templateType,
          prompt,
          createdAt: new Date().toISOString(),
          orderIndex: nextOrder + idx,
          rankScore: null,
          tags: [angle, benefit, style, variant.label],
          source: "generated",
          files: [
            {
              url,
              filename,
              mime: "image/png",
              size: buffer.length,
              width: 1,
              height: 1,
            },
          ],
        };
        data.images.push(record);
        generated.push({ id: record.id, promptUsed: prompt, url });
      }
      writeMetadataAtomic(data);
      return res.json({ ok: true, variants: generated });
    }

    for (const [idx, variant] of variantTemplates.entries()) {
      const prompt = `Fotografia comercial ultra realista para ${templateType} en ${country} sobre productos de ${productId}. Enfatiza ${angle} y el beneficio ${benefit} con estilo ${style}. ${variant.detail}. ${referenceSection} Sin texto dentro de la imagen. Personas reales con apariencia natural. Composicion limpia y espacio negativo para copy.`;
      const response = await openaiClient.images.generate({
        model: "gpt-image-1",
        prompt,
        size,
        response_format: "b64_json",
      });
      const payload = response?.data?.[0];
      const b64 = payload?.b64_json;
      if (!b64) {
        return res.status(502).json({ ok: false, error: "empty_payload" });
      }
      const buffer = Buffer.from(b64, "base64");
      const filename = `${userId}_${productId}_${Date.now()}_${variant.label}.png`;
      const filepath = path.resolve(storageDir, filename);
      fs.writeFileSync(filepath, buffer);
      const url = `/ai-images/${filename}`;
      const record = {
        id: randomUUID(),
        userId,
        productId,
        country,
        templateType,
        prompt,
        createdAt: new Date().toISOString(),
        orderIndex: nextOrder + idx,
        rankScore: null,
        tags: [angle, benefit, style, variant.label],
        source: "generated",
        files: [
          {
            url,
            filename,
            mime: "image/png",
            size: buffer.length,
            width: null,
            height: null,
          },
        ],
      };
      data.images.push(record);
      generated.push({ id: record.id, promptUsed: prompt, url });
    }
    writeMetadataAtomic(data);
    return res.json({ ok: true, variants: generated });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
};

app.post("/image-generate", handleImageGenerate);
app.post("/api/image-generate", handleImageGenerate);

const handleImageRecommend = async (req, res) => {
  const { userId, productId, imageIds = [], imageUrls = [], context = "" } = req.body;
  if (!userId || !productId || ((!imageIds.length) && (!imageUrls.length))) {
    return res.status(400).json({ ok: false, error: "missing_required_fields" });
  }
  const { data } = readMetadata();
  const candidates = data.images.filter(
    (img) =>
      img.userId === userId &&
      img.productId === productId &&
      (imageIds.includes(img.id) || imageUrls.includes(img.files?.[0]?.url ?? ""))
  );
  if (!candidates.length) {
    return res.status(404).json({ ok: false, error: "no_images_found" });
  }
  if (mockMode) {
    const ranking = candidates.map((img, idx) => ({
      id: img.id,
      score: candidates.length - idx,
      reasons: ["Buena iluminación", "Composición clara", "Sensación premium"],
    }));
    const whereToUse = Object.fromEntries(ranking.map((entry, idx) => [entry.id, idx % 4 === 0 ? "hero" : "product"]));
    const bestImageId = ranking[0]?.id;
    for (const image of data.images) {
      const match = ranking.find((r) => r.id === image.id);
      if (match) {
        image.rankScore = match.score;
        image.recommendedFor = whereToUse[image.id];
      }
    }
    writeMetadataAtomic(data);
    const reasons = ranking.reduce((acc, curr) => {
      acc[curr.id] = curr.reasons;
      return acc;
    }, {});
    return res.json({ ok: true, bestImageId, ranking, reasons, whereToUse });
  }
  const details = candidates
    .map(
      (img, idx) =>
        `${idx + 1}) ${img.id} - ${img.files?.[0]?.url ?? "sin URL"} - etiquetas: ${img.tags?.join(
          ", "
        ) ?? "sin tags"}`
    )
    .join("\n");
  const prompt = `Rankea estas imágenes para el cierre de ventas del producto ${productId}. Usa criterios de claridad, credibilidad, ausencia de look IA, composición y espacio negativo. Contexto: ${
    context || "convierte sin perder naturalidad"
  }.\nImágenes:\n${details}\nDevuelve solo JSON con: bestImageId, ranking[{id, score, reasons}], whereToUse{[id]:hero|product|benefits|offer}.`;
  try {
    const response = await openaiClient.responses.create({
      model: recommendModel,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      temperature: 0.2,
    });
    const rawText = getResponseText(response);
    const parsed = extractJson(rawText);
    if (!parsed || !Array.isArray(parsed.ranking)) {
      return res.status(502).json({ ok: false, error: "recommend_json_invalid", raw: rawText });
    }
    const ranking = parsed.ranking.map((entry, idx) => ({
      id: entry.id ?? candidates[idx]?.id,
      score: Number(entry.score ?? (candidates.length - idx)),
      reasons: Array.isArray(entry.reasons) ? entry.reasons : [],
    }));
    const whereToUse = parsed.whereToUse ?? {};
    const bestImageId = parsed.bestImageId ?? ranking[0]?.id;
    const reasons = ranking.reduce((acc, curr) => {
      acc[curr.id] = curr.reasons;
      return acc;
    }, {});
    for (const image of data.images) {
      const ranked = ranking.find((item) => item.id === image.id);
      if (ranked) {
        image.rankScore = ranked.score;
        image.recommendedFor =
          whereToUse[image.id] ??
          (image.id === bestImageId ? parsed.recommendedFor ?? "closing" : image.recommendedFor ?? null);
      }
    }
    writeMetadataAtomic(data);
    return res.json({ ok: true, bestImageId, ranking, reasons, whereToUse });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
};

app.post("/image-recommend", handleImageRecommend);
app.post("/api/image-recommend", handleImageRecommend);

const sanitizeQuotes = (value) =>
  String(value ?? "").replace(/^[\uFEFF]+/, "").replace(/[\u2018\u2019\u201C\u201D]/g, '"').trim();

const getResponseText = (resp) =>
  resp?.response?.text?.()?.trim?.() ?? resp?.text?.()?.trim?.() ?? resp?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

app.post("/landing-plan", async (req, res) => {
  const product = sanitizeQuotes(req.body?.product);
  if (!product) {
    return res.status(400).json({ ok: false, error: "Falta product" });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: "Missing GEMINI_API_KEY" });
  }
  const client = new GoogleGenAI({ apiKey });
  const prompt = "RESPONDE EXACTAMENTE CON EL BLOQUE JSON...";
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });
    const rawText = getResponseText(response);
    const parsed = JSON.parse(rawText);
    return res.json({ ok: true, product, ...parsed });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

app.listen(PORT, () => {
  console.log(`SERVER ACTIVO EN http://localhost:${PORT}`);
});
