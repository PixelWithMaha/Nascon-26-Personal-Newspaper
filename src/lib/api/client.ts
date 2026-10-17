import type { z } from "zod";
import { ApiError } from "./errors";

type RequestOptions<S extends z.ZodType> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  schema: S;
  timeoutMs?: number;
};

export async function apiRequest<S extends z.ZodType>(
  path: string,
  { method = "GET", body, schema, timeoutMs = 60_000 }: RequestOptions<S>,
): Promise<z.output<S>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError("network", "Can't reach the server. Check your connection and try again.");
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError("http", message, res.status);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "body";
    throw new ApiError("contract", `Unexpected response from ${path} at "${field}"`);
  }
  return parsed.data;
}