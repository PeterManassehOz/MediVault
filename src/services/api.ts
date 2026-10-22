
import { getAuthToken } from "@/utils/authStorage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "http://10.232.58.60:5000/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(
    message =
      "Unable to connect to the server. Check your connection and try again.",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
  code?: string;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (isFormData) {
    // Let fetch set the multipart boundary automatically.
    headers.delete("Content-Type");
  } else if (
    options.body != null &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      },
    );
  } catch (error) {
    console.error("API network error:", error);
    throw new NetworkError();
  }

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError(
        "The request failed.",
        response.status,
      );
    }

    return undefined as T;
  }

  let data: ApiErrorResponse | null = null;

  try {
    data = (await response.json()) as ApiErrorResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message ??
        "Something went wrong. Please try again.",
      response.status,
      data?.code,
    );
  }

  return data as T;
}
