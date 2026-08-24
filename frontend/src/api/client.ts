import type {
  ChatHistory,
  ChatResponse,
  Medicine,
  MedicineSummary,
  SessionResponse,
} from "../types";

const API_BASE = `${import.meta.env.BASE_URL}api`;

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

export const getMedicines = () => request<MedicineSummary[]>("/medicines");

export const getMedicine = (id: string) =>
  request<Medicine>(`/medicines/${encodeURIComponent(id)}`);

export const createSession = (medicineId: string) =>
  request<SessionResponse>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ medicine_id: medicineId }),
  });

export const getHistory = (sessionId: string) =>
  request<ChatHistory>(`/chat/sessions/${encodeURIComponent(sessionId)}`);

export const sendChat = (
  medicineId: string,
  sessionId: string,
  message: string,
) =>
  request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({
      medicine_id: medicineId,
      session_id: sessionId,
      message,
    }),
  });
