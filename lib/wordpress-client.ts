import { InventoryItem } from "./pipeline-data";

const WP_API_BASE = "https://tax4us.co.il/wp-json/wp/v2";

interface WpPost {
    id: number;
    date: string;
    slug: string;
    status: "publish" | "future" | "draft" | "pending" | "private";
    type: string;
    link: string;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    categories: number[];
    tags: number[];
    featured_media: number;
    lang?: string; // Polylang
    translations?: Record<string, number>; // Polylang
    _embedded?: {
        "wp:featuredmedia"?: Array<{
            source_url: string;
        }>;
    };
}

export async function fetchWordPressInventory(): Promise<InventoryItem[] | null> {
    try {
        // Fetch posts with embedded media
        // We fetch a larger batch to get a good overview. 
        // In a real app, we'd paginate, but for the dashboard snapshot, 100 recent posts is a good start.
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        // Basic Auth (Username:Password base64 encoded)
        if (process.env.WORDPRESS_APP_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
            const username = process.env.WORDPRESS_APP_USERNAME;
            const password = process.env.WORDPRESS_APP_PASSWORD;
            // console.log("WP Client Debug: Using creds", username, password.substring(0, 3) + "...");
            const auth = Buffer.from(`${username}:${password}`).toString("base64");
            headers["Authorization"] = `Basic ${auth}`;
        }

        const response = await fetch(`${WP_API_BASE}/posts?per_page=100&_embed`, {
            headers,
            next: { revalidate: 0 } // No cache, real-time
        });

        if (!response.ok) {
            console.error(`Failed to fetch WP posts: ${response.statusText} (${response.status})`);
            const text = await response.text();
            console.error("WP Error Body:", text);
            return null;
        }

        const posts: WpPost[] = await response.json();
        console.log(`WP Client: Successfully fetched ${posts.length} posts.`);

        // Map categories (Heuristic or hardcoded for now based on user specs)
        // 20 = Hebrew, 22 = English
        // We should also fetch categories to map IDs to names, but for now we'll imply based on lang or category ID.

        const inventory: InventoryItem[] = posts.map(post => {
            const isHebrew = post.categories.includes(20) || post.lang === 'he';
            const isEnglish = post.categories.includes(22) || post.lang === 'en';

            const hasFeaturedImage = post.featured_media > 0;
            // Check for video in content or robust check if you have a custom field for video
            // Simple heuristic: content contains "video" tag or specific class? 
            // For now, assume false unless we find a specific iframe/video tag, 
            // but let's stick to simple "false" or check content string.
            const hasVideo = post.content.rendered.includes('<video') || post.content.rendered.includes('iframe');

            // Translation status logic
            let translationStatus: "linked" | "missing" | "pending" = "missing";
            if (post.translations) {
                // processing
                const otherLang = isHebrew ? 'en' : 'he';
                if (post.translations[otherLang]) {
                    translationStatus = "linked";
                }
            }

            return {
                id: `wp-${post.id}`,
                titleHe: isHebrew ? post.title.rendered : "",
                titleEn: isEnglish ? post.title.rendered : "",

                status: post.status === 'publish' ? 'published' : 'draft', // map exact status
                date: post.date.split('T')[0],
                category: getCategoryName(post.categories),
                hasVideo: hasVideo,
                hasFeaturedImage: hasFeaturedImage,
                translationStatus: translationStatus
            } as InventoryItem;
        });

        return inventory;
    } catch (error) {
        console.error("Error in fetchWordPressInventory:", error);
        return null;
    }
}


export async function createPost(postData: Partial<WpPost>): Promise<WpPost | null> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${WP_API_BASE}/posts`, {
            method: "POST",
            headers,
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            console.error(`Failed to create WP post: ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating WP post:", error);
        return null;
    }
}

export async function updatePost(id: number, postData: Partial<WpPost>): Promise<WpPost | null> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${WP_API_BASE}/posts/${id}`, {
            method: "POST", // WP API uses POST for updates
            headers,
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            console.error(`Failed to update WP post ${id}: ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Error updating WP post ${id}:`, error);
        return null;
    }
}

export async function uploadMedia(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<any | null> {
    try {
        const headers = await getAuthHeaders();
        // Media upload requires different content-type handling for binary
        // We need to set Content-Disposition
        const mediaHeaders = {
            ...headers,
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${fileName}"`
        };

        const response = await fetch(`${WP_API_BASE}/media`, {
            method: "POST",
            headers: mediaHeaders,
            body: fileBuffer as any,
        });

        if (!response.ok) {
            console.error(`Failed to upload media: ${response.statusText}`);
            const text = await response.text();
            console.error("Media Error:", text);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Error uploading media:", error);
        return null;
    }
}

export async function getPost(id: number): Promise<WpPost | null> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${WP_API_BASE}/posts/${id}?_embed`, {
            headers,
            next: { revalidate: 0 } // No cache for single post fetch usually
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (process.env.WORDPRESS_APP_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
        const username = process.env.WORDPRESS_APP_USERNAME;
        const password = process.env.WORDPRESS_APP_PASSWORD;
        const auth = Buffer.from(`${username}:${password}`).toString("base64");
        headers["Authorization"] = `Basic ${auth}`;
    }
    return headers;
}

function getCategoryName(categoryIds: number[]): string {
    // Simple mapping based on known IDs
    if (categoryIds.includes(20)) return "Hebrew Content";
    if (categoryIds.includes(22)) return "English Content";
    if (categoryIds.includes(44)) return "All You Need (HE)";
    if (categoryIds.includes(46)) return "All You Need (EN)";
    return "Uncategorized";
}
