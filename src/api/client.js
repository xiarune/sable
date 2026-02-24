import API_BASE_URL from "./config";

/**
 * API client with credentials (cookies) support
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    credentials: "include", // Send cookies for auth
    headers: {
      ...options.headers,
    },
    ...options,
  };

  // Only set Content-Type: application/json when there's a body (and it's not FormData)
  if (options.body && !(options.body instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, config);

  // Parse JSON response
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Convenience methods
export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),

  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    }),

  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    }),

  delete: (endpoint) => request(endpoint, { method: "DELETE" }),

  // For file uploads
  upload: (endpoint, formData) =>
    request(endpoint, {
      method: "POST",
      body: formData,
    }),
};

export default api;
