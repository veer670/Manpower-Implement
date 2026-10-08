/** Thrown with the server's own message, so the UI can show it verbatim. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      // The session cookie is httpOnly; it rides along, the script cannot read it.
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server.");
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? "Something went wrong.");
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  del: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "DELETE", body: JSON.stringify(data ?? {}) }),
};
