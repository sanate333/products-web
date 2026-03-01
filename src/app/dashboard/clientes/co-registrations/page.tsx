"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  createdAt: string;
  templateTitle: string;
  storeName: string;
  storeSlug: string;
  email: string;
  whatsapp: string;
  status: "registered" | "paid" | "active";
};

export default function CoRegistrationsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch("/api/admin/co-registrations");
    const data = await res.json();
    if (data?.ok) setRows(data.rows || []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      [r.templateTitle, r.storeName, r.storeSlug, r.email, r.whatsapp, r.status]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Registros /co</h1>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Todos los registros creados desde la pagina CO.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por tienda, correo, whatsapp..."
            style={{
              width: 320,
              maxWidth: "72vw",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              padding: "10px 12px",
            }}
          />
          <button
            onClick={load}
            style={{ borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer" }}
          >
            Actualizar
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.10)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>Fecha</th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>Plantilla</th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>Tienda</th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>Link</th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>Correo</th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>WhatsApp</th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, opacity: 0.7 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>{r.templateTitle}</td>
                  <td style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>{r.storeName}</td>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    <a href={`https://sanate.store/${r.storeSlug}`} target="_blank" rel="noreferrer">
                      /{r.storeSlug}
                    </a>
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>{r.email}</td>
                  <td style={{ padding: 12, fontSize: 13 }}>{r.whatsapp}</td>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background:
                        r.status === "active" ? "rgba(34,197,94,0.14)" :
                        r.status === "paid" ? "rgba(59,130,246,0.14)" :
                        "rgba(0,0,0,0.04)",
                    }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, opacity: 0.7 }}>
                    No hay registros aun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

