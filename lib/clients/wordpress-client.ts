/**
 * WordPress API Client logic for Tax4Us
 * Handles posts, categories, tags, and media uploads.
 */
export class WordPressClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_WP_API_URL || process.env.WP_URL;
    const user = process.env.WORDPRESS_APP_USERNAME || process.env.WP_USER || process.env.WP_USERNAME;
    const pass = process.env.WORDPRESS_APP_PASSWORD || process.env.WP_APP_PASSWORD || process.env.WP_APPLICATION_PASSWORD;

    if (!url || !user || !pass) {
      throw new Error(`Missing WordPress credentials. Found: URL=${!!url}, USER=${!!user}, PASS=${!!pass}`);
    }

    this.baseUrl = url.replace(/\/$/, "");
    if (!this.baseUrl.includes("/wp-json/wp/v2")) {
      this.baseUrl = `${this.baseUrl}/wp-json/wp/v2`;
    }
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
    const query = new URLSearchParams({ _embed: "true", ...params }).toString();
    return this.request(`/posts?${query}`);
  }

  async createPost(data: any) {
    return this.request("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: number, data: any, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/posts/${id}${query ? `?${query}` : ""}`;
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPost(id: number) {
    return this.request(`/posts/${id}?_embed`);
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
      body: buffer as any,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WordPress Media Upload Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async getStats() {
    // Fetch total published posts
    const postsResponse = await fetch(`${this.baseUrl}/posts?status=publish&per_page=1`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.auth}`,
      },
    });

    // Fetch categories count
    const categoriesResponse = await fetch(`${this.baseUrl}/categories?per_page=1`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.auth}`,
      },
    });

    return {
      publishedPosts: parseInt(postsResponse.headers.get("x-wp-total") || "0", 10),
      categories: parseInt(categoriesResponse.headers.get("x-wp-total") || "0", 10),
    };
  }
}
