/**
 * WordPress API Client logic for Tax4Us
 * Handles posts, categories, tags, and media uploads.
 * CONSOLIDATED VERSION - Uses same credentials as wordPressPublisher
 */
interface WordPressPost {
  title?: string;
  content?: string;
  status?: 'publish' | 'draft' | 'private';
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  excerpt?: string;
  meta?: Record<string, unknown>;
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

interface WordPressTag {
  id: number;
  name: string;
  slug: string;
}

export class WordPressClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    // Use SAME credentials as wordPressPublisher to avoid conflicts
    this.baseUrl = (process.env.WP_URL || 'https://tax4us.co.il') + '/wp-json/wp/v2';
    const user = process.env.WP_USERNAME || 'Shai ai';
    const pass = process.env.WP_APPLICATION_PASSWORD || '0nm7^1l&PEN5HAWE7LSamBRu';

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
    const result = await this.request(`/posts?${query}`);
    return Array.isArray(result) ? result : [];
  }

  async createPost(data: WordPressPost) {
    return this.request("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: number, data: Partial<WordPressPost>, params: Record<string, string> = {}) {
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
        const found = existing.find((c: WordPressCategory) =>
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

    // LIMIT: Only use first 5 tags to prevent spam
    const limitedNames = names.slice(0, 5);
    
    // FILTER: Only relevant tax-related tags
    const validTags = limitedNames.filter(name => 
      name && 
      typeof name === 'string' && 
      name.trim().length > 0 &&
      name.trim().length < 30 // Reasonable tag length
    );

    if (validTags.length === 0) return [];

    try {
      const existing = await this.request("/tags?per_page=100");
      const ids: number[] = [];

      for (const name of validTags) {
        const cleanName = name.trim();
        const found = existing.find((t: WordPressTag) =>
          t.name.toLowerCase() === cleanName.toLowerCase() ||
          t.slug === cleanName.toLowerCase().replace(/\s+/g, '-')
        );

        if (found) {
          ids.push(found.id);
        } else {
          // Create new tag (only if we have less than 5 total)
          if (ids.length < 5) {
            try {
              const created = await this.request("/tags", {
                method: "POST",
                body: JSON.stringify({ name: cleanName }),
              });
              ids.push(created.id);
            } catch (e) {
              console.error(`Failed to create tag "${cleanName}":`, e);
            }
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