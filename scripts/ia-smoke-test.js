import { spawn } from 'child_process';

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${PORT}`;
const userId = 'smoke-user';
const productId = 'smoke-product';

async function callAnalyze() {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('country', 'CO');
  formData.append('productName', 'Test Smoke Soap');
  formData.append('productDetails', 'Prueba para test E2E mock');
  const res = await fetch(`${BASE_URL}/image-analyze`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

async function callGenerate() {
  const res = await fetch(`${BASE_URL}/image-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      productId,
      country: 'CO',
      templateType: 'Hero',
      angle: 'prueba',
      benefit: 'segunda prueba',
      style: 'realista',
      size: '256x256',
    }),
  });
  return res.json();
}

async function listImages() {
  const url = new URL(`${BASE_URL}/ai-images`);
  url.searchParams.set('userId', userId);
  url.searchParams.set('productId', productId);
  const res = await fetch(url);
  return res.json();
}

async function reorderImages(images) {
  const order = images.map((img, idx) => ({ id: img.id, orderIndex: idx + 1 }));
  const res = await fetch(`${BASE_URL}/ai-images/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, productId, order }),
  });
  return res.json();
}

async function deleteImage(image) {
  const res = await fetch(`${BASE_URL}/ai-images/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, imageId: image.id }),
  });
  return res.json();
}

async function recommend(images) {
  const res = await fetch(`${BASE_URL}/image-recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      productId,
      imageIds: images.map((img) => img.id),
      context: 'Destacar beneficio clave',
    }),
  });
  return res.json();
}

async function run() {
  const server = spawn('node', ['server/index.mjs'], {
    env: { ...process.env, PORT, OPENAI_MOCK: '1' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  await new Promise((resolve) => setTimeout(resolve, 4000));
  try {
    const analyze = await callAnalyze();
    if (!analyze.ok) throw new Error(`Analyze failed: ${JSON.stringify(analyze)}`);

    const generated = await callGenerate();
    if (!generated.ok || !Array.isArray(generated.variants) || generated.variants.length < 4) {
      throw new Error(`Generate failed: ${JSON.stringify(generated)}`);
    }

    const listed = await listImages();
    if (!listed.ok) throw new Error(`List failed: ${JSON.stringify(listed)}`);

    const reorder = await reorderImages(listed.images);
    if (!reorder.ok) throw new Error(`Reorder failed: ${JSON.stringify(reorder)}`);

    const recommended = await recommend(listed.images);
    if (!recommended.ok) throw new Error(`Recommend failed: ${JSON.stringify(recommended)}`);

    const toDelete = listed.images[0];
    if (!toDelete) throw new Error('No image to delete');
    const deleted = await deleteImage(toDelete);
    if (!deleted.ok) throw new Error(`Delete failed: ${JSON.stringify(deleted)}`);

    console.log("SMOKE_TEST OK");
  } catch (error) {
    console.error("SMOKE_TEST ERROR", error);
    process.exit(1);
  } finally {
    server.kill();
  }
}

run();
