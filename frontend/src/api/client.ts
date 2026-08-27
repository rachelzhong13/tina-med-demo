import type {
  ChatHistory,
  Medicine,
  MedicineSummary,
  SessionResponse,
} from "../types";

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || `${import.meta.env.BASE_URL}api`
).replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = (await response.json().catch(() => ({}))) as {
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(data.detail || `请求失败（${response.status}）`);
  }
  return data as T;
}

export const getMedicine = (id: string) =>
  request<Medicine>(`/medicines/${encodeURIComponent(id)}`);

export const getMedicines = () => request<MedicineSummary[]>("/medicines");

export const createSession = (medicineId: string) =>
  request<SessionResponse>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ medicine_id: medicineId }),
  });

export const getHistory = (sessionId: string) =>
  request<ChatHistory>(`/chat/sessions/${encodeURIComponent(sessionId)}`);
