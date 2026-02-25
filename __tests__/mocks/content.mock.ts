import { ContentPiece } from '@/lib/types/pipeline'

export const mockContentPiece: ContentPiece = {
  id: "test-123",
  topic_id: "topic-456",
  title_hebrew: "מס על עובדים מרחוק: הדרכה מקיפה",
  title_english: "Remote Work Taxation: A Comprehensive Guide",
  target_keywords: ["remote work", "taxation", "Israeli-Americans", "FBAR"],
  status: "published" as const,
  created_at: "2026-02-25T18:00:00Z",
  updated_at: "2026-02-25T18:00:00Z",
  media_urls: {
    featured_image: "https://example.com/image.jpg",
    social_video: "https://example.com/video.mp4",
    social_image: "https://example.com/social.jpg"
  }
}

export const mockBlogContent = `
<h2>Understanding Remote Work Tax Obligations</h2>
<p>For Israeli-Americans working remotely, understanding tax obligations is crucial for maintaining compliance with both jurisdictions.</p>

<h3>Key Considerations</h3>
<ul>
<li>FBAR filing requirements for accounts exceeding $10,000</li>
<li>US-Israel tax treaty provisions</li>
<li>State-level tax implications</li>
<li>Documentation requirements for remote work</li>
</ul>

<h3>Best Practices</h3>
<p>Maintain detailed records of your work location, maintain clear documentation of your employment arrangements, and consult with qualified professionals.</p>
`

export const mockPodcastScript = `EMMA: Welcome to Tax4Us Weekly, the essential podcast for Israeli-Americans navigating complex tax obligations. I'm Emma, and I'm here with tax expert Ben to discuss remote work taxation.

BEN: Thanks for having me, Emma. This is such a critical topic for our community, especially with the rise in remote work arrangements.

EMMA: Absolutely. Let's start with FBAR requirements. Can you explain what our listeners need to know?

BEN: FBAR, or the Foreign Bank Account Report, is required when the aggregate value of your foreign financial accounts exceeds $10,000 at any time during the calendar year...`

export const createMockContent = (overrides: Partial<ContentPiece> = {}): ContentPiece => ({
  ...mockContentPiece,
  ...overrides
})