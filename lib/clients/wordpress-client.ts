/**
 * WordPress API Client logic for Tax4Us
 * Handles posts, categories, tags, and media uploads.
 */
export class WordPressClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    const url = process.env.WP_URL;
    const user = process.env.WP_USERNAME;
    const pass = process.env.WP_APPLICATION_PASSWORD;

    if (!url || !user || !pass) {
      throw new Error("Missing WordPress credentials in environment variables.");
    }

    this.baseUrl = `${url}/wp-json/wp/v2`;
    this.auth = Buffer.from(`${user}:${pass}`).toString("base64");
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WordPress API Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async getPosts(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/posts?${query}`);
  }

  async createPost(data: any) {
    return this.request("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: number, data: any) {
    return this.request(`/posts/${id}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCategories(parent?: number) {
    const query = parent ? `?parent=${parent}` : "";
    return this.request(`/categories${query}`);
  }

  async getTags() {
    return this.request("/tags?per_page=100");
  }

  async uploadMedia(buffer: Buffer, filename: string, mimeType: string) {
    const response = await fetch(`${this.baseUrl}/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": mimeType,
      },
      body: buffer,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WordPress Media Upload Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }
}
