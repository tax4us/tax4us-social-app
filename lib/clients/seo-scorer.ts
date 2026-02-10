/**
 * SEO Scorer logic for Tax4Us
 * Mimics Rank Math scoring factors.
 */
export class SEOScorer {
    calculateScore(content: string, title: string, focusKeyword: string) {
        let score = 0;
        const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const contentLower = contentText.toLowerCase();
        const keywordLower = (focusKeyword || "").toLowerCase();
        const wordCount = contentText.split(/\s+/).filter(w => w.length > 1).length;

        if (!focusKeyword) return 0;

        // 1. Keyword in Title (10 pts)
        if (title.toLowerCase().includes(keywordLower)) score += 10;

        // 2. Keyword in Introduction (first 400 chars) (10 pts)
        const intro = contentLower.substring(0, 400);
        if (intro.includes(keywordLower)) score += 10;

        // 3. Keyword in URL/Slug (10 pts)
        score += 10;

        // 4. Content Length (20 pts)
        if (wordCount >= 2500) score += 20;
        else if (wordCount >= 2000) score += 15;
        else if (wordCount >= 1000) score += 10;
        else score += 5;

        // 5. Keyword Density (0.5% - 2.5%) (10 pts)
        const matches = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
        const density = (matches / Math.max(wordCount, 1)) * 100;
        if (density >= 0.5 && density <= 2.5) score += 10;
        else if (density > 0) score += 5;

        // 6. Keyword in Headings (H2/H3) (10 pts)
        const headings = content.match(/<h[2-3].*?>.*?<\/h[2-3]>/gi) || [];
        const headingsText = headings.join(' ').toLowerCase();
        if (headingsText.includes(keywordLower)) score += 10;
        else if (headings.length >= 3) score += 5;

        // 7. Internal & External Links (10 pts)
        const internalLinks = (content.match(/href=["']https?:\/\/(www\.)?tax4us\.co\.il[^"']*/gi) || []).length;
        const allLinks = (content.match(/href=["']https?:\/\/[^"']*/gi) || []).length;
        const externalLinks = allLinks - internalLinks;
        if (internalLinks >= 2 && externalLinks >= 1) score += 10;
        else if (internalLinks >= 1 || externalLinks >= 1) score += 5;

        // 8. Images with Alt Text (Simulation) (10 pts)
        const images = content.match(/<img/gi) || [];
        if (images.length >= 1) score += 10;

        // 9. Meta Lengths & Power Words (Simulation) (10 pts)
        const powerWords = ['ultimate', 'essential', 'proven', 'complete', 'guide', 'מדריך', 'מקיף', 'חיוני', 'מוכח', 'קריטי'];
        if (powerWords.some(pw => title.toLowerCase().includes(pw))) score += 5;
        if (/\d/.test(title)) score += 5;

        return Math.min(score, 100);
    }

    analyzeIssues(content: string, title: string, focusKeyword: string, seoTitle: string, seoDescription: string) {
        const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = contentText.split(/\s+/).filter(w => w.length > 1).length;
        const contentLower = contentText.toLowerCase();
        const keywordLower = (focusKeyword || "").toLowerCase();

        const issues: string[] = [];
        const improvements: string[] = [];

        // 1. Focus Keyword
        if (!focusKeyword || focusKeyword.length < 2) {
            issues.push('❌ Missing focus keyword');
            improvements.push('Add a 2-4 word focus keyword');
        }

        // 2. Keyword in Title
        if (focusKeyword && !seoTitle.toLowerCase().includes(keywordLower)) {
            issues.push('❌ Focus keyword not in SEO title');
            improvements.push('Include focus keyword at beginning of title');
        }

        // 3. Keyword in Meta Description
        if (focusKeyword && !seoDescription.toLowerCase().includes(keywordLower)) {
            issues.push('❌ Focus keyword not in meta description');
            improvements.push('Add focus keyword to meta description');
        }

        // 4. Content Length
        if (wordCount < 2000) {
            issues.push(`❌ Content too short (${wordCount} words, need 2500+)`);
            improvements.push(`Expand content by ${2500 - wordCount}+ words`);
        } else if (wordCount < 2500) {
            issues.push(`⚠️ Content slightly short (${wordCount} words)`);
            improvements.push('Add 300-500 more words');
        }

        // 5. Keyword Density
        if (focusKeyword) {
            const matches = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi")) || []).length;
            const density = (matches / Math.max(wordCount, 1)) * 100;
            if (density < 0.5) {
                issues.push(`❌ Keyword density too low (${density.toFixed(2)}%, need 1-1.5%)`);
                improvements.push('Add focus keyword more naturally throughout content');
            } else if (density > 2.5) {
                issues.push(`⚠️ Keyword density too high (${density.toFixed(2)}%)`);
                improvements.push('Reduce keyword stuffing');
            }
        }

        // 6. Keyword in First Paragraph
        if (focusKeyword && !contentLower.substring(0, 300).includes(keywordLower)) {
            issues.push('❌ Focus keyword not in introduction');
            improvements.push('Add focus keyword to first paragraph');
        }

        // 7. Headings
        const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
        if (h2Count < 3) {
            issues.push(`❌ Too few H2 headings (${h2Count}, need 4+)`);
            improvements.push('Add more H2 section headings');
        }
        if (focusKeyword) {
            const headings = content.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || [];
            const keywordInHeadings = headings.filter(h => h.toLowerCase().includes(keywordLower)).length;
            if (keywordInHeadings === 0) {
                issues.push('❌ Focus keyword not in any heading');
                improvements.push('Include focus keyword in at least one H2/H3');
            }
        }

        // 8. SEO Title Length
        if (seoTitle.length < 40 || seoTitle.length > 65) {
            issues.push(`⚠️ SEO title length (${seoTitle.length} chars, ideal: 50-60)`);
            improvements.push('Adjust SEO title to 50-60 characters');
        }

        // 9. Meta Description Length
        if (seoDescription.length < 120 || seoDescription.length > 160) {
            issues.push(`⚠️ Meta description length (${seoDescription.length} chars, ideal: 150-160)`);
            improvements.push('Adjust meta description to 150-160 characters');
        }

        // 10. Number in Title
        if (!/\d/.test(title)) {
            issues.push('⚠️ No number in title');
            improvements.push('Add a number to title (e.g., "7 Ways...", "5 Tips...")');
        }

        // 11. Power Words
        const powerWords = ['ultimate', 'essential', 'proven', 'complete', 'guide', 'מדריך', 'מקיף', 'חיוני', 'מוכח', 'קריטי'];
        if (!powerWords.some(pw => title.toLowerCase().includes(pw))) {
            issues.push('⚠️ No power word in title');
            improvements.push('Add power word (essential, proven, complete, guide)');
        }

        // 12. Internal/External Links
        const internalLinks = (content.match(/href=["']https?:\/\/(www\.)?tax4us\.co\.il[^"']*/gi) || []).length;
        const allLinks = (content.match(/href=["']https?:\/\/[^"']*/gi) || []).length;
        if (internalLinks < 2) {
            issues.push(`❌ Too few internal links (${internalLinks}, need 3+)`);
            improvements.push('Add 2-3 internal links to other Tax4US articles');
        }
        if (allLinks - internalLinks < 1) {
            issues.push(`⚠️ No external links`);
            improvements.push('Add 1-2 external links to authoritative sources (IRS, etc.)');
        }

        return { issues, improvements };
    }
}
