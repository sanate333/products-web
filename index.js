// Bootstrap de compatibilidad para Render.
// Si Start Command esta en "node index.js", redirige al servidor real.
import("./server/index.mjs").catch((error) => {
  console.error("No se pudo iniciar server/index.mjs:", error?.message || error);
  process.exit(1);
});
