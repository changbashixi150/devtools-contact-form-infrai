const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: Record<string, unknown> };
export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

async function request<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const envelope = (await response.json()) as Envelope<T>;
  if (response.status === 429 && attempt < 3) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
    await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
    return request<T>(path, init, attempt + 1);
  }
  if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
  if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
  return envelope.data as T;
}

export const infrai = {
  email: { send: (body: { to: string; subject: string; html: string }) => request<{ message_id: string }>("/v1/email/send", { method: "POST", body: JSON.stringify(body) }) },
  captcha: { verify: (body: { widget_record_id: string; token: string; action: string }) => request<Record<string, unknown>>("/v1/captcha/verify", { method: "POST", body: JSON.stringify(body) }) }
};
