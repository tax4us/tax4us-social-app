/**
 * SEO Scorer logic for Tax4Us
 * Mimics Rank Math scoring factors.
 */
export class SEOScorer {
    calculateScore(content: string, title: string, focusKeyword: string) {
        let score = 0;

        // 1. Keyword in Title
        if (title.toLowerCase().includes(focusKeyword.toLowerCase())) {
            score += 10;
        }

        // 2. Keyword in Introduction (first 10%)
        const intro = content.substring(0, Math.floor(content.length * 0.1));
        if (intro.toLowerCase().includes(focusKeyword.toLowerCase())) {
            score += 10;
        }

        // 3. Content Length
        const wordCount = content.split(/\s+/).length;
        if (wordCount > 2000) score += 20;
        else if (wordCount > 1000) score += 10;

        // 4. Keyword Density (simplified)
        const matches = content.toLowerCase().match(new RegExp(focusKeyword.toLowerCase(), "g"));
        const count = matches ? matches.length : 0;
        const density = (count / wordCount) * 100;
        if (density >= 1 && density <= 3) score += 10;

        // 5. Headings
        if (content.match(/<h[2-3].*?>.*?<\/h[2-3]>/)) {
            score += 10;
        }

        // Base score (ultra-lenient as per audit)
        score += 40;

        return Math.min(score, 100);
    }
}
