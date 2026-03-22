import { useState, useEffect, useCallback } from "react";
import Header from "../Header/Header";
import "./MarketingRedes.css";

const SUPABASE_URL = "https://lvmeswlvszsmvgaasazs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bWVzd2x2c3pzbXZnYWFzYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNTk1MTAsImV4cCI6MjA0ODczNTUxMH0.zmHzMNVPSTqjeAyrFbn2YDJNnMOQkwJEz49hierYWcY";
const SOCIAL_API = `${SUPABASE_URL}/functions/v1/social-api`;
const FB_APP_ID = "1468787708298775";

const PLATFORM_RULES = {
  facebook_marketplace: { label: "Facebook Marketplace", maxDaily: 8, minSpacingMin: 90, icon: "ðª" },
  instagram_feed: { label: "Instagram Feed", maxDaily: 5, minSpacingMin: 120, icon: "ð¸" },
  instagram_story: { label: "Instagram Story", maxDaily: 8, minSpacingMin: 60, icon: "ð±" },
  facebook_page: { label: "Facebook Page", maxDaily: 5, minSpacingMin: 120, icon: "ð" }
};

async function callSocialAPI(action, extra = {}) {
  const res = await fetch(SOCIAL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ action, ...extra })
  });
  return res.json();
}

async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
}

async function sbPost(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function sbPatch(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export default function MarketingRedes() {
  const [tab, setTab] = useState("conexiones");
  const [connections, setConnections] = useState([]);
  const [posts, setPosts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");

  // Autopublicador form state
  const [newPost, setNewPost] = useState({
    title: "", description: "", price: "", images: "", category: "general",
    platforms: ["instagram_feed"],
    scheduled_at: "",
    show_to_friends: true
  });

  const showMsg = (text, type = "info") => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(""), 5000); };

  // âââ Load data âââ
  const loadConnections = useCallback(async () => {
    try {
      const data = await sbGet("oasis_social_connections", "select=*&order=connected_at.desc");
      setConnections(Array.isArray(data) ? data : []);
    } catch { setConnections([]); }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const data = await sbGet("oasis_scheduled_posts", "select=*&order=created_at.desc&limit=50");
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const data = await sbGet("oasis_publish_log", "select=*&order=created_at.desc&limit=50");
      setLogs(Array.isArray(data) ? data : []);
    } catch { setLogs([]); }
  }, []);

  useEffect(() => {
    loadConnections();
    loadPosts();
    loadLogs();
  }, [loadConnections, loadPosts, loadLogs]);

  // âââ OAuth Connect âââ
  const handleConnect = async (platform) => {
    setLoading(true);
    showMsg(`Iniciando conexiÃ³n con ${platform}...`);
    try {
      const result = await callSocialAPI("get_oauth_url", { platform: platform === "facebook_marketplace" ? "all" : platform, store_id: "default" });
      if (result.oauth_url) {
        const popup = window.open(result.oauth_url, "oauth_popup", "width=600,height=700,scrollbars=yes");
        const handler = (event) => {
          if (event.data?.type === "ig_connected") {
            window.removeEventListener("message", handler);
            showMsg(`Â¡Conectado exitosamente como @${event.data.data?.username || "cuenta"}!`, "success");
            loadConnections();
          } else if (event.data?.type === "ig_error") {
            window.removeEventListener("message", handler);
            showMsg(`Error en conexiÃ³n: ${event.data.error}`, "error");
          }
        };
        window.addEventListener("message", handler);
        // Timeout cleanup
        setTimeout(() => { window.removeEventListener("message", handler); }, 120000);
      } else {
        showMsg(`Error: ${result.error || "No se pudo obtener URL de OAuth"}`, "error");
      }
    } catch (err) {
      showMsg(`Error de conexiÃ³n: ${err.message}`, "error");
    }
    setLoading(false);
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm("Â¿Desconectar esta red social?")) return;
    setLoading(true);
    try {
      await callSocialAPI("disconnect", { store_id: "default" });
      showMsg("Desconectado exitosamente", "success");
      loadConnections();
    } catch (err) {
      showMsg(`Error: ${err.message}`, "error");
    }
    setLoading(false);
  };

  // âââ Publish logic âââ
  const handlePublish = async (post) => {
    setLoading(true);
    const platforms = post.platforms ? (typeof post.platforms === "string" ? JSON.parse(post.platforms) : post.platforms) : ["instagram_feed"];
    const results = [];

    for (const plat of platforms) {
      try {
        let action, payload;
        if (plat === "instagram_feed") {
          action = "publish_ig_feed";
          payload = { image_url: post.images, caption: `${post.title}\n\n${post.description}${post.price ? `\nð° $${post.price}` : ""}`, store_id: "default" };
        } else if (plat === "instagram_story") {
          action = "publish_ig_story";
          payload = { image_url: post.images, store_id: "default" };
        } else if (plat === "facebook_page" || plat === "facebook_marketplace") {
          action = "publish_fb_page";
          payload = { message: `${post.title}\n\n${post.description}${post.price ? `\nð° $${post.price}` : ""}`, image_url: post.images || undefined, store_id: "default" };
        }

        if (action) {
          const result = await callSocialAPI(action, payload);
          results.push({ platform: plat, ...result });
        }
      } catch (err) {
        results.push({ platform: plat, error: err.message });
      }
    }

    const success = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (post.id) {
      await sbPatch("oasis_scheduled_posts", post.id, {
        status: success.length > 0 ? "published" : "failed",
        published_at: new Date().toISOString(),
        result_data: JSON.stringify(results)
      });
    }

    if (success.length > 0) showMsg(`â Publicado en ${success.length} plataforma(s)${failed.length > 0 ? `, ${failed.length} fallaron` : ""}`, "success");
    else showMsg(`â Error al publicar: ${failed.map(f => f.message || f.error).join(", ")}`, "error");

    loadPosts();
    loadLogs();
    setLoading(false);
  };

  // âââ Schedule post âââ
  const handleSchedulePost = async (e) => {
    e.preventDefault();
    if (!newPost.title) return showMsg("TÃ­tulo requerido", "error");
    if (newPost.platforms.length === 0) return showMsg("Selecciona al menos una plataforma", "error");

    setLoading(true);
    try {
      const postData = {
        platform: newPost.platforms.join(","),
        title: newPost.title,
        description: newPost.description,
        price: newPost.price ? parseFloat(newPost.price) : null,
        images: newPost.images,
        category: newPost.category,
        status: newPost.scheduled_at ? "scheduled" : "draft",
        scheduled_at: newPost.scheduled_at || null,
        created_at: new Date().toISOString()
      };

      const result = await sbPost("oasis_scheduled_posts", postData);

      if (result.error || (Array.isArray(result) && result[0]?.error)) {
        showMsg(`Error: ${result.error || result[0]?.error?.message || "No se pudo guardar"}`, "error");
      } else {
        // If no scheduled date, publish immediately
        if (!newPost.scheduled_at) {
          const savedPost = Array.isArray(result) ? result[0] : result;
          savedPost.platforms = newPost.platforms;
          await handlePublish(savedPost);
        } else {
          showMsg("â PublicaciÃ³n programada exitosamente", "success");
        }
        setNewPost({ title: "", description: "", price: "", images: "", category: "general", platforms: ["instagram_feed"], scheduled_at: "", show_to_friends: true });
        loadPosts();
      }
    } catch (err) {
      showMsg(`Error: ${err.message}`, "error");
    }
    setLoading(false);
  };

  const togglePlatform = (plat) => {
    setNewPost(prev => ({
      ...prev,
      platforms: prev.platforms.includes(plat)
        ? prev.platforms.filter(p => p !== plat)
        : [...prev.platforms, plat]
    }));
  };

  // âââ Connection status helpers âââ
  const getConnectionStatus = (platform) => {
    if (platform === "instagram_feed" || platform === "instagram_story" || platform === "instagram") {
      return connections.find(c => c.platform === "instagram" && c.status === "connected");
    }
    if (platform === "facebook_page" || platform === "facebook_marketplace") {
      const igConn = connections.find(c => c.platform === "instagram" && c.status === "connected");
      return igConn?.page_token ? igConn : null;
    }
    return null;
  };

  // âââââââââââââââ RENDER âââââââââââââââ

  return (
    <div className="containerGrid">
      <Header />
      <section className="containerSection">
        <div className="marketing-redes">

          <h2 style={{ marginBottom: 8, fontSize: "1.5rem" }}>ð¡ Marketing Redes - Autopublicador</h2>
          <p style={{ color: "#888", marginBottom: 20, fontSize: "0.9rem" }}>Conecta tus redes sociales y autopublica productos en mÃºltiples plataformas.</p>

          {msg && (
            <div style={{
              padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontWeight: 500,
              background: msgType === "success" ? "#10b981" : msgType === "error" ? "#ef4444" : "#3b82f6",
              color: "#fff"
            }}>
              {msg}
            </div>
          )}

          {/* ââ Tabs ââ */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { id: "conexiones", label: "ð Conexiones" },
              { id: "autopublicar", label: "ð¤ Autopublicador" },
              { id: "historial", label: "ð Historial" },
              { id: "reglas", label: "ð¡ï¸ Reglas Anti-Ban" }
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem",
                  background: tab === t.id ? "#6c63ff" : "#2a2a3e", color: tab === t.id ? "#fff" : "#aaa",
                  transition: "all 0.2s"
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ââââââââââ TAB: CONEXIONES ââââââââââ */}
          {tab === "conexiones" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Conexiones de Redes Sociales</h3>

              {/* Instagram */}
              <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: "1.3rem" }}>ð¸ Instagram</span>
                    {getConnectionStatus("instagram") ? (
                      <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>
                        â Conectado como @{getConnectionStatus("instagram").ig_username || "cuenta"}
                      </span>
                    ) : (
                      <span style={{ marginLeft: 12, color: "#f59e0b" }}>â ï¸ No conectado</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {getConnectionStatus("instagram") ? (
                      <button onClick={() => handleDisconnect("instagram")} disabled={loading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#ef4444", color: "#fff", fontWeight: 600 }}>
                        Desconectar
                      </button>
                    ) : (
                      <button onClick={() => handleConnect("instagram")} disabled={loading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#e1306c", color: "#fff", fontWeight: 600 }}>
                        {loading ? "Conectando..." : "Conectar Instagram"}
                      </button>
                    )}
                  </div>
                </div>
                {getConnectionStatus("instagram") && (
                  <div style={{ marginTop: 12, fontSize: "0.85rem", color: "#888" }}>
                    <p>Token tipo: {getConnectionStatus("instagram").token_type || "N/A"} | Page Token: {getConnectionStatus("instagram").page_token ? "â SÃ­" : "â No"} | PÃ¡gina: {getConnectionStatus("instagram").page_name || "N/A"}</p>
                    <p>Expira: {getConnectionStatus("instagram").expires_at ? new Date(getConnectionStatus("instagram").expires_at).toLocaleDateString() : "N/A"}</p>
                    <p style={{ color: "#10b981", marginTop: 4 }}>â Puede publicar en: Instagram Feed, Instagram Stories{getConnectionStatus("instagram").page_token ? ", Facebook Page" : ""}</p>
                  </div>
                )}
              </div>

              {/* Facebook Page */}
              <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: "1.3rem" }}>ð Facebook Page</span>
                    {getConnectionStatus("facebook_page") ? (
                      <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>
                        â Conectado - {getConnectionStatus("facebook_page").page_name || "PÃ¡gina"}
                      </span>
                    ) : (
                      <span style={{ marginLeft: 12, color: "#f59e0b" }}>â ï¸ {connections.length > 0 ? "Conecta Instagram con una PÃ¡gina de Facebook vinculada" : "No conectado"}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!getConnectionStatus("facebook_page") && (
                      <button onClick={() => handleConnect("all")} disabled={loading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#1877f2", color: "#fff", fontWeight: 600 }}>
                        {loading ? "Conectando..." : "Conectar Facebook"}
                      </button>
                    )}
                  </div>
                </div>
                {getConnectionStatus("facebook_page") && (
                  <div style={{ marginTop: 12, fontSize: "0.85rem", color: "#888" }}>
                    <p>PÃ¡gina ID: {getConnectionStatus("facebook_page").page_id} | Nombre: {getConnectionStatus("facebook_page").page_name}</p>
                    <p style={{ color: "#10b981" }}>â Puede publicar en: Facebook Page (fotos, textos, links)</p>
                  </div>
                )}
              </div>

              {/* Facebook Marketplace */}
              <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: "1.3rem" }}>ðª Facebook Marketplace</span>
                    {getConnectionStatus("facebook_marketplace") ? (
                      <span style={{ marginLeft: 12, color: "#10b981", fontWeight: 600 }}>â Disponible vÃ­a Facebook Page</span>
                    ) : (
                      <span style={{ marginLeft: 12, color: "#f59e0b" }}>â ï¸ Requiere conexiÃ³n de Facebook Page</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!getConnectionStatus("facebook_marketplace") && (
                      <button onClick={() => handleConnect("all")} disabled={loading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#1877f2", color: "#fff", fontWeight: 600 }}>
                        {loading ? "Conectando..." : "Conectar"}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: "0.85rem", color: "#888" }}>
                  <p>Marketplace usa la conexiÃ³n de Facebook Page para publicar productos. Las publicaciones aparecen en tu pÃ¡gina y pueden llegar a Marketplace.</p>
                  {getConnectionStatus("facebook_marketplace") && (
                    <p style={{ color: "#10b981", marginTop: 4 }}>â Las publicaciones en Facebook Page pueden aparecer en Marketplace automÃ¡ticamente</p>
                  )}
                </div>
              </div>

              {/* Connection Info Box */}
              <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, border: "1px solid #333", marginTop: 16 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>â¹ï¸ InformaciÃ³n de ConexiÃ³n</p>
                <p style={{ fontSize: "0.85rem", color: "#888", lineHeight: 1.6 }}>
                  Al conectar Instagram con Facebook Login, se obtiene acceso a: Instagram Feed, Instagram Stories y Facebook Page (si la cuenta de Instagram estÃ¡ vinculada a una pÃ¡gina).
                  Para Marketplace, las publicaciones se realizan a travÃ©s de la pÃ¡gina de Facebook y pueden aparecer automÃ¡ticamente en Marketplace segÃºn la configuraciÃ³n de Facebook.
                </p>
              </div>
            </div>
          )}

          {/* ââââââââââ TAB: AUTOPUBLICADOR ââââââââââ */}
          {tab === "autopublicar" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Crear PublicaciÃ³n</h3>

              <form onSubmit={handleSchedulePost} style={{ background: "#1e1e2e", borderRadius: 12, padding: 20 }}>

                {/* Platform selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: 10 }}>ð¡ Plataformas de destino:</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {Object.entries(PLATFORM_RULES).map(([key, rule]) => {
                      const isConnected = getConnectionStatus(key);
                      const isSelected = newPost.platforms.includes(key);
                      return (
                        <button type="button" key={key}
                          onClick={() => isConnected && togglePlatform(key)}
                          disabled={!isConnected}
                          style={{
                            padding: "10px 16px", borderRadius: 10, border: isSelected ? "2px solid #6c63ff" : "2px solid #333",
                            background: isSelected ? "#6c63ff22" : "#2a2a3e",
                            color: isConnected ? (isSelected ? "#fff" : "#ccc") : "#555",
                            cursor: isConnected ? "pointer" : "not-allowed",
                            fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
                            opacity: isConnected ? 1 : 0.5
                          }}>
                          {rule.icon} {rule.label}
                          {!isConnected && <span style={{ display: "block", fontSize: "0.7rem", color: "#888" }}>No conectado</span>}
                          {isSelected && isConnected && <span style={{ display: "block", fontSize: "0.7rem", color: "#10b981" }}>â Seleccionado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mostrar a amigos toggle (for Marketplace) */}
                {newPost.platforms.includes("facebook_marketplace") && (
                  <div style={{ marginBottom: 20, background: "#2a2a3e", borderRadius: 10, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>ð¥ Mostrar a amigos</span>
                      <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 4 }}>Cuando estÃ¡ activo, tus amigos de Facebook pueden ver tus publicaciones de Marketplace. Desactiva si no quieres que conocidos vean tus anuncios.</p>
                    </div>
                    <button type="button"
                      onClick={() => setNewPost(prev => ({ ...prev, show_to_friends: !prev.show_to_friends }))}
                      style={{
                        width: 56, height: 30, borderRadius: 15, border: "none", cursor: "pointer",
                        background: newPost.show_to_friends ? "#10b981" : "#555",
                        position: "relative", transition: "background 0.3s", flexShrink: 0
                      }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 12, background: "#fff",
                        position: "absolute", top: 3,
                        left: newPost.show_to_friends ? 28 : 4,
                        transition: "left 0.3s"
                      }} />
                    </button>
                  </div>
                )}

                {/* Title */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>TÃ­tulo *</label>
                  <input value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="Nombre del producto o publicaciÃ³n"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff", fontSize: "0.95rem" }} />
                </div>

                {/* Description */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>DescripciÃ³n</label>
                  <textarea value={newPost.description} onChange={e => setNewPost({ ...newPost, description: e.target.value })}
                    rows={4} placeholder="DescripciÃ³n del producto o publicaciÃ³n..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff", fontSize: "0.95rem", resize: "vertical" }} />
                </div>

                {/* Price + Category row */}
                <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Precio (COP)</label>
                    <input type="number" value={newPost.price} onChange={e => setNewPost({ ...newPost, price: e.target.value })}
                      placeholder="0"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>CategorÃ­a</label>
                    <select value={newPost.category} onChange={e => setNewPost({ ...newPost, category: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff" }}>
                      <option value="general">General</option>
                      <option value="cosmetica">CosmÃ©tica</option>
                      <option value="skincare">Skincare</option>
                      <option value="cabello">Cabello</option>
                      <option value="cuerpo">Cuerpo</option>
                      <option value="aromaterapia">Aromaterapia</option>
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>URL de Imagen</label>
                  <input value={newPost.images} onChange={e => setNewPost({ ...newPost, images: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff", fontSize: "0.95rem" }} />
                  <p style={{ fontSize: "0.75rem", color: "#888", marginTop: 4 }}>
                    La imagen debe ser una URL pÃºblica accesible. Instagram requiere imÃ¡genes JPEG de mÃ­nimo 150x150px.
                  </p>
                </div>

                {/* Image preview */}
                {newPost.images && (
                  <div style={{ marginBottom: 14 }}>
                    <img src={newPost.images} alt="Preview"
                      style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, objectFit: "cover" }}
                      onError={e => { e.target.style.display = "none"; }} />
                  </div>
                )}

                {/* Schedule */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>ð Programar publicaciÃ³n (opcional)</label>
                  <input type="datetime-local" value={newPost.scheduled_at} onChange={e => setNewPost({ ...newPost, scheduled_at: e.target.value })}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#1a1a2e", color: "#fff" }} />
                  <p style={{ fontSize: "0.75rem", color: "#888", marginTop: 4 }}>
                    Deja vacÃ­o para publicar inmediatamente.
                  </p>
                </div>

                {/* Submit buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button type="submit" disabled={loading}
                    style={{ padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem", background: "#6c63ff", color: "#fff" }}>
                    {loading ? "Procesando..." : newPost.scheduled_at ? "ð Programar" : "ð Publicar Ahora"}
                  </button>
                </div>
              </form>

              {/* Pending posts */}
              {posts.filter(p => p.status === "scheduled" || p.status === "draft").length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ marginBottom: 12 }}>Publicaciones Pendientes</h3>
                  {posts.filter(p => p.status === "scheduled" || p.status === "draft").map(post => (
                    <div key={post.id} style={{ background: "#1e1e2e", borderRadius: 10, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <strong>{post.title}</strong>
                        <p style={{ fontSize: "0.8rem", color: "#888" }}>
                          {post.platform} | {post.status} {post.scheduled_at && `| Programado: ${new Date(post.scheduled_at).toLocaleString()}`}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handlePublish({ ...post, platforms: post.platform.split(",") })} disabled={loading}
                          style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#10b981", color: "#fff", fontWeight: 600 }}>
                          â¶ Publicar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ââââââââââ TAB: HISTORIAL ââââââââââ */}
          {tab === "historial" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3>Historial de Publicaciones</h3>
                <button onClick={() => { loadLogs(); loadPosts(); }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#2a2a3e", color: "#aaa", fontWeight: 600 }}>
                  ð Actualizar
                </button>
              </div>

              {/* Published posts */}
              {posts.filter(p => p.status === "published").length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ color: "#10b981", marginBottom: 10 }}>â Publicados</h4>
                  {posts.filter(p => p.status === "published").map(post => (
                    <div key={post.id} style={{ background: "#1e1e2e", borderRadius: 10, padding: 14, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <strong>{post.title}</strong>
                        <span style={{ fontSize: "0.8rem", color: "#888" }}>{post.published_at ? new Date(post.published_at).toLocaleString() : ""}</span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 4 }}>Plataformas: {post.platform}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Publish log */}
              <h4 style={{ marginBottom: 10 }}>ð Log de Publicaciones</h4>
              {logs.length === 0 ? (
                <p style={{ color: "#888" }}>No hay registros aÃºn.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} style={{ background: "#1e1e2e", borderRadius: 10, padding: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <span>
                        {log.status === "success" ? "â" : "â"} <strong>{log.post_title}</strong>
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#888" }}>{log.published_at ? new Date(log.published_at).toLocaleString() : ""}</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 4 }}>
                      Plataforma: {log.platform} | Estado: {log.status}
                      {log.error_message && <span style={{ color: "#ef4444" }}> | Error: {log.error_message}</span>}
                    </p>
                  </div>
                ))
              )}

              {posts.length === 0 && logs.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                  <p style={{ fontSize: "2rem" }}>ð­</p>
                  <p>No hay publicaciones ni registros aÃºn. Â¡Crea tu primera publicaciÃ³n en el Autopublicador!</p>
                </div>
              )}
            </div>
          )}

          {/* ââââââââââ TAB: REGLAS ANTI-BAN ââââââââââ */}
          {tab === "reglas" && (
            <div>
              <h3 style={{ marginBottom: 16 }}>ð¡ï¸ Reglas Anti-Ban por Plataforma</h3>
              <p style={{ color: "#888", marginBottom: 20, fontSize: "0.9rem" }}>
                Estas reglas protegen tus cuentas de bloqueos por publicaciÃ³n excesiva. Los lÃ­mites estÃ¡n configurados de forma conservadora.
              </p>

              {Object.entries(PLATFORM_RULES).map(([key, rule]) => (
                <div key={key} style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, marginBottom: 14 }}>
                  <h4 style={{ marginBottom: 10 }}>{rule.icon} {rule.label}</h4>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ background: "#2a2a3e", borderRadius: 8, padding: "10px 16px", flex: 1, minWidth: 150 }}>
                      <p style={{ fontSize: "0.8rem", color: "#888" }}>MÃ¡ximo diario</p>
                      <p style={{ fontSize: "1.3rem", fontWeight: 700 }}>{rule.maxDaily} <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>publicaciones</span></p>
                    </div>
                    <div style={{ background: "#2a2a3e", borderRadius: 8, padding: "10px 16px", flex: 1, minWidth: 150 }}>
                      <p style={{ fontSize: "0.8rem", color: "#888" }}>Espaciado mÃ­nimo</p>
                      <p style={{ fontSize: "1.3rem", fontWeight: 700 }}>{rule.minSpacingMin} <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>minutos</span></p>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, border: "1px solid #333", marginTop: 16 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>ð¡ Consejos Anti-Ban</p>
                <ul style={{ color: "#888", fontSize: "0.85rem", lineHeight: 1.8, paddingLeft: 20 }}>
                  <li>No publiques el mismo contenido en mÃºltiples plataformas simultÃ¡neamente</li>
                  <li>VarÃ­a los textos y descripciones entre publicaciones</li>
                  <li>Respeta los intervalos mÃ­nimos entre publicaciones</li>
                  <li>Evita publicar en horarios inusuales (madrugada)</li>
                  <li>Si una plataforma te bloquea temporalmente, espera 24h antes de reintentar</li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
