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

export interface ContentPiece {
    id: string;
    topic_id: string;
    title_hebrew: string;
    title_english: string;
    target_keywords: string[];
    status: 'draft' | 'published' | 'processing';
    created_at: string;
    updated_at: string;
    media_urls: {
        featured_image: string;
        social_video: string;
        social_image: string;
    };
}

export interface WorkerResult {
    success: boolean;
    worker: string;
    artifacts: Record<string, any>;
    errors?: string[];
    duration?: number;
}

export interface PipelineResult {
    success: boolean;
    completed_workers: string[];
    failed_workers: string[];
    artifacts: Record<string, any>;
    errors: string[];
    duration: number;
}

export interface PodcastEpisode {
    id: string;
    title: string;
    description: string;
    audioUrl: string;
    duration: number;
    publishDate: string;
    status: 'published' | 'draft';
}
