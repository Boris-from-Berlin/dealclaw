/**
 * Lightweight HTTP client for DealClaw API.
 * Zero external dependencies beyond Node.js built-ins.
 */

export class DealClawClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  async request(method, path, body = null, queryParams = null) {
    let url = `${this.baseUrl}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "DealClaw-MCP/0.1.0",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const options = { method, headers };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const msg = data.error || data.message || `HTTP ${response.status}`;
      const err = new Error(msg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async get(path, queryParams = null) {
    return this.request("GET", path, null, queryParams);
  }

  async post(path, body = null) {
    return this.request("POST", path, body);
  }

  async put(path, body = null) {
    return this.request("PUT", path, body);
  }
}
