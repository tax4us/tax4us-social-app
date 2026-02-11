export interface Topic {
    id: string;
    spec_id?: string;
    title?: string;
    topic: string;
    audience: string;
    language: string;
    type: 'blog_post' | 'podcast' | 'social_post';
    status: 'draft' | 'ready' | 'published' | 'rejected' | 'processing' | 'proposing';
    keywords?: string[];
    outline?: string;
    strategy?: string;
    instructions?: string;
}

export interface ContentMetadata {
    title: string;
    excerpt: string;
    slug?: string;
    focus_keyword: string;
    keywords?: string[];
    word_count: number;
    h2_count?: number;
    h3_count?: number;
    status: string;
    seo_title: string;
    seo_description: string;
    categories?: string[];
    tags?: string[];
}

export interface ArticleContent {
    metadata: ContentMetadata;
    content: string; // Gutenberg HTML
    seo_score: number;
    featured_media?: number;
    validation_results?: unknown;
}
