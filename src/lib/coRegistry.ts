import fs from "fs";
import path from "path";

export type CoRegistrationRow = {
  id: string;
  createdAt: string;
  templateTitle: string;
  storeName: string;
  storeSlug: string;
  email: string;
  whatsapp: string;
  status: "registered" | "paid" | "active";
};

const DB_PATH = path.join(process.cwd(), "data", "co_registrations.json");

export function readAll(): CoRegistrationRow[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CoRegistrationRow[];
  } catch {
    return [];
  }
}

