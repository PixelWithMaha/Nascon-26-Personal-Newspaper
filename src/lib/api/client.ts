import type { z } from "zod";
import { ApiError } from "./errors";

type RequestOptions<S extends z.ZodType> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  schema: S;
  timeoutMs?: number;
  keepalive?: boolean;
};

export async function apiRequest<S extends z.ZodType>(
  path: string,
    { method = "GET", body, schema, timeoutMs = 60_000, keepalive = false }: RequestOptions<S>,
): Promise<z.output<S>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
            credentials: "same-origin",
      keepalive,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError("network", "Can't reach the server. Check your connection and try again.");
  }

  const data: unknown = await res.json().catch(() => null);

   if (!res.ok) throw new ApiError("http", errorMessage(data, res.status), res.status);

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "body";
    throw new ApiError("contract", `Unexpected response from ${path} at "${field}"`);
  }
  return parsed.data;
}

function errorMessage(data: unknown, status: number): string {
  return data && typeof data === "object" && "error" in data && typeof data.error === "string"
    ? data.error
    : `Request failed (${status})`;
}

/** For binary responses such as PDFs. */
export async function apiDownload(path: string, { timeoutMs = 90_000 } = {}): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ApiError("network", "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    throw new ApiError("http", errorMessage(data, res.status), res.status);
  }
  return res.blob();
}