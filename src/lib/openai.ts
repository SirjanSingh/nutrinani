/**
 * Thin OpenAI client. Requests go through the Vite dev proxy at /openai,
 * which injects the Authorization header server-side so the key never ships
 * in the bundle. For production you must replace this with a real backend
 * endpoint that does the same injection.
 */

const OPENAI_BASE = "/openai/v1";

export const OPENAI_MODELS = {
  // Vision + text. Cheap, fast, multimodal — right default for the scanner.
  visionText: "gpt-4o-mini",
  // Heavier text reasoning if ever needed.
  text: "gpt-4o-mini",
  // Image generation (separate model — chat models don't generate images).
  image: "gpt-image-1",
} as const;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
      >;
};

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  /** When set, requests a JSON object response. */
  jsonMode?: boolean;
  maxTokens?: number;
}

export async function chat(opts: ChatOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model || OPENAI_MODELS.visionText,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** chat() + JSON.parse with a forgiving fallback. */
export async function chatJSON<T = unknown>(opts: ChatOptions): Promise<T> {
  const raw = await chat({ ...opts, jsonMode: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Strip code fences if the model wrapped them despite jsonMode.
    const stripped = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    return JSON.parse(stripped) as T;
  }
}

/** Convert a File/Blob to a base64 data URL for vision inputs. */
export function fileToDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
