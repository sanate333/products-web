/**
 * tunnel.mjs — Wrapper para cloudflared que captura la URL del túnel
 * y la guarda en el backend via settings API.
 */
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Full path to cloudflared binary (installed via npm)
const CLOUDFLARED_BIN = "C:\\Users\\sebas\\AppData\\Roaming\\npm\\node_modules\\cloudflared\\bin\\cloudflared.exe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lee WA_SECRET del .env del servidor
let WA_SECRET = "sanate_secret_2025";
const envPath = path.join(__dirname, ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [k, v] = line.split("=");
    if (k?.trim() === "WA_SECRET" && v?.trim()) WA_SECRET = v.trim();
  }
}

const PORT = process.env.PORT || 5005;
const BACKEND = `http://localhost:${PORT}`;
const HOSTINGER_PHP = "https://sanate.store/waBackendUrl.php";

let currentUrl = "";

function updateBackendUrl(url) {
  if (url === currentUrl) return;
  currentUrl = url;
  console.log(`[TUNNEL] URL: ${url}`);

  // Actualiza backend local (con reintentos)
  const tryUpdate = (retries = 10) => {
    fetch(`${BACKEND}/api/whatsapp/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-secret": WA_SECRET },
      body: JSON.stringify({ backendPublicUrl: url, n8nEnabled: true }),
    })
      .then((r) => r.json())
      .then(() => console.log("[TUNNEL] backendPublicUrl actualizado en servidor"))
      .catch(() => {
        if (retries > 0) setTimeout(() => tryUpdate(retries - 1), 3000);
        else console.warn("[TUNNEL] No se pudo actualizar el backend");
      });
  };
  setTimeout(() => tryUpdate(), 5000);

  // También persiste la URL en Hostinger para que el frontend la descubra automáticamente
  fetch(HOSTINGER_PHP, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-secret": WA_SECRET },
    body: JSON.stringify({ backendPublicUrl: url }),
  })
    .then((r) => r.json())
    .then(() => console.log("[TUNNEL] URL guardada en Hostinger"))
    .catch((err) => console.warn("[TUNNEL] No se pudo guardar en Hostinger:", err.message));
}

function startTunnel() {
  const cf = spawn(CLOUDFLARED_BIN, ["tunnel", "--url", `http://localhost:${PORT}`], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const handleOutput = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) updateBackendUrl(match[0]);
  };

  cf.stdout.on("data", handleOutput);
  cf.stderr.on("data", handleOutput);

  cf.on("exit", (code) => {
    console.log(`[TUNNEL] cloudflared salió (${code}), reiniciando en 5s...`);
    setTimeout(startTunnel, 5000);
  });

  cf.on("error", (err) => {
    console.error("[TUNNEL] Error al iniciar cloudflared:", err.message);
    setTimeout(startTunnel, 10000);
  });
}

console.log("[TUNNEL] Iniciando cloudflared tunnel...");
startTunnel();
