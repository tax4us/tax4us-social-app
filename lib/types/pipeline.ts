export interface Topic {
    id: string;
    spec_id: string;
    title: string;
    topic: string;
    audience: string;
    language: string;
    type: 'blog_post' | 'podcast' | 'social_post';
    status: 'draft' | 'ready' | 'published' | 'rejected';
    keywords?: string[];
    outline?: string;
    strategy?: string;
}

export interface ContentMetadata {
    title: string;
    excerpt: string;
    slug: string;
    focus_keyword: string;
    keywords: string[];
    word_count: number;
    h2_count: number;
    h3_count: number;
    status: string;
}

export interface ArticleContent {
    metadata: ContentMetadata;
    content: string; // Gutenberg HTML
    seo_score: number;
    validation_results?: any;
}
