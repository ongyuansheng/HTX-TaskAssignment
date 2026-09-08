const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type ApiErrorResponse = {
  error?: string;
};

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(body.error ?? "Something went wrong. Please try again.");
  }

  return response.json() as Promise<T>;
}
