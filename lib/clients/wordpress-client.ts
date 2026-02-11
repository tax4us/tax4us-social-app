/**
 * WordPress API Client logic for Tax4Us
 * Handles posts, categories, tags, and media uploads.
 */
export class WordPressClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_WP_API_URL || process.env.WP_URL || "https://tax4us.co.il";
    const user = process.env.WORDPRESS_APP_USERNAME || process.env.WP_USER || process.env.WP_USERNAME;
    const pass = process.env.WORDPRESS_APP_PASSWORD || process.env.WP_APP_PASSWORD || process.env.WP_APPLICATION_PASSWORD;

    this.baseUrl = url.replace(/\/$/, "");
    if (!this.baseUrl.includes("/wp-json/wp/v2")) {
      this.baseUrl = `${this.baseUrl}/wp-json/wp/v2`;
    }

    if (user && pass) {
      this.auth = Buffer.from(`${user}:${pass}`).toString("base64");
    } else {
      console.warn("WordPressClient: Missing credentials. Some operations may fail.");
      this.auth = "";
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.auth) {
      headers["Authorization"] = `Basic ${this.auth}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
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
    const headers: Record<string, string> = {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": mimeType,
    };

    if (this.auth) {
      headers["Authorization"] = `Basic ${this.auth}`;
    }

    const response = await fetch(`${this.baseUrl}/media`, {
      method: "POST",
      headers,
      body: buffer as any,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WordPress Media Upload Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Resolve category names to WordPress category IDs.
   * Creates categories that don't exist yet.
   */
  async resolveCategories(names: string[]): Promise<number[]> {
    if (!names || names.length === 0) return [1]; // Uncategorized fallback

    try {
      const existing = await this.request("/categories?per_page=100");
      const ids: number[] = [];

      for (const name of names) {
        const found = existing.find((c: any) =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.slug === name.toLowerCase().replace(/\s+/g, '-')
        );

        if (found) {
          ids.push(found.id);
        } else {
          // Create new category
          try {
            const created = await this.request("/categories", {
              method: "POST",
              body: JSON.stringify({ name }),
            });
            ids.push(created.id);
          } catch (e) {
            console.error(`Failed to create category "${name}":`, e);
          }
        }
      }

      return ids.length > 0 ? ids : [1];
    } catch (e) {
      console.error("Category resolution failed:", e);
      return [1];
    }
  }

  /**
   * Resolve tag names to WordPress tag IDs.
   * Creates tags that don't exist yet.
   */
  async resolveTags(names: string[]): Promise<number[]> {
    if (!names || names.length === 0) return [];

    try {
      const existing = await this.request("/tags?per_page=100");
      const ids: number[] = [];

      for (const name of names) {
        const found = existing.find((t: any) =>
          t.name.toLowerCase() === name.toLowerCase() ||
          t.slug === name.toLowerCase().replace(/\s+/g, '-')
        );

        if (found) {
          ids.push(found.id);
        } else {
          // Create new tag
          try {
            const created = await this.request("/tags", {
              method: "POST",
              body: JSON.stringify({ name }),
            });
            ids.push(created.id);
          } catch (e) {
            console.error(`Failed to create tag "${name}":`, e);
          }
        }
      }

      return ids;
    } catch (e) {
      console.error("Tag resolution failed:", e);
      return [];
    }
  }

  async getStats() {
    const headers: Record<string, string> = {};
    if (this.auth) {
      headers["Authorization"] = `Basic ${this.auth}`;
    }

    // Fetch total published posts
    const postsResponse = await fetch(`${this.baseUrl}/posts?status=publish&per_page=1`, {
      method: "GET",
      headers,
    });

    // Fetch categories count
    const categoriesResponse = await fetch(`${this.baseUrl}/categories?per_page=1`, {
      method: "GET",
      headers,
    });

    return {
      publishedPosts: parseInt(postsResponse.headers.get("x-wp-total") || "0", 10),
      categories: parseInt(categoriesResponse.headers.get("x-wp-total") || "0", 10),
    };
  }
}
