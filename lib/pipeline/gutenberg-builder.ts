/**
 * Gutenberg Block Builder for Tax4Us
 * Converts markdown and metadata into WordPress Gutenberg blocks.
 * Properly handles: links, bold, italic, tables, lists, headings, images.
 */
export class GutenbergBuilder {
    /**
     * Converts a whole article into a Gutenberg template.
     * Includes a cover block with video/image and a column layout.
     */
    buildArticle(contentMarkdown: string, mediaUrl: string, isVideo: boolean = true) {
        const mediaBlock = this.buildMediaCover(mediaUrl, isVideo);
        const contentBlocks = this.markdownToBlocks(contentMarkdown);

        // Wrap in a column layout (25/75 as per audit)
        return `
<!-- wp:cover {"url":"${mediaUrl}","dimRatio":50,"overlayColor":"black","minHeight":400,"minHeightUnit":"px","align":"full"} -->
<div class="wp-block-cover alignfull"><span aria-hidden="true" class="wp-block-cover__background has-black-background-color has-background-dim-50 has-background-dim"></span>
${mediaBlock}
</div>
<!-- /wp:cover -->

<!-- wp:columns -->
<div class="wp-block-columns">
  <!-- wp:column {"width":"75%"} -->
  <div class="wp-block-column" style="flex-basis:75%">
    ${contentBlocks}
  </div>
  <!-- /wp:column -->

  <!-- wp:column {"width":"25%"} -->
  <div class="wp-block-column" style="flex-basis:25%">
    <!-- wp:query {"query":{"perPage":5,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":false}} -->
    <div class="wp-block-query">
      <!-- wp:post-template -->
      <!-- wp:post-title {"isLink":true} /-->
      <!-- /wp:post-template -->
    </div>
    <!-- /wp:query -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->
`;
    }

    private buildMediaCover(url: string, isVideo: boolean) {
        if (isVideo) {
            return `<!-- wp:video {"url":"${url}","autoplay":true,"muted":true,"loop":true,"playsInline":true,"controls":false} -->
<figure class="wp-block-video"><video src="${url}" autoplay muted loop playsinline></video></figure>
<!-- /wp:video -->`;
        }
        return `<!-- wp:image {"url":"${url}","sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full"><img src="${url}" alt=""/></figure>
<!-- /wp:image -->`;
    }

    /**
     * Convert inline markdown formatting to HTML.
     * Handles: links, bold, italic, inline code.
     */
    private convertInlineMarkdown(text: string): string {
        // Links: [text](url) → <a href="url">text</a>
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Bold: **text** or __text__ → <strong>text</strong>
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        // Italic: *text* or _text_ → <em>text</em>
        text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

        // Inline code: `code` → <code>code</code>
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        return text;
    }

    /**
     * Convert a markdown table to an HTML table wrapped in Gutenberg blocks.
     */
    private convertTable(tableBlock: string): string {
        const lines = tableBlock.split("\n").filter(l => l.trim().length > 0);
        if (lines.length < 2) return this.wrapParagraph(tableBlock);

        const parseRow = (line: string): string[] => {
            return line.split("|")
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);
        };

        const headerCells = parseRow(lines[0]);
        // Skip separator line (lines[1] contains ---'s)
        const bodyLines = lines.slice(2);

        let html = `<!-- wp:table -->\n<figure class="wp-block-table"><table><thead><tr>`;
        for (const cell of headerCells) {
            html += `<th>${this.convertInlineMarkdown(cell)}</th>`;
        }
        html += `</tr></thead><tbody>`;

        for (const line of bodyLines) {
            const cells = parseRow(line);
            html += `<tr>`;
            for (const cell of cells) {
                html += `<td>${this.convertInlineMarkdown(cell)}</td>`;
            }
            html += `</tr>`;
        }

        html += `</tbody></table></figure>\n<!-- /wp:table -->`;
        return html;
    }

    private wrapParagraph(text: string): string {
        const converted = this.convertInlineMarkdown(text);
        return `<!-- wp:paragraph --><p>${converted}</p><!-- /wp:paragraph -->`;
    }

    private markdownToBlocks(markdown: string) {
        const lines = markdown.split("\n");
        const blocks: string[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();

            // Skip empty lines
            if (line === "") {
                i++;
                continue;
            }

            // Headings
            if (line.startsWith("### ")) {
                const text = this.convertInlineMarkdown(line.replace("### ", ""));
                blocks.push(`<!-- wp:heading {"level":3} --><h3>${text}</h3><!-- /wp:heading -->`);
                i++;
                continue;
            }
            if (line.startsWith("## ")) {
                const text = this.convertInlineMarkdown(line.replace("## ", ""));
                blocks.push(`<!-- wp:heading {"level":2} --><h2>${text}</h2><!-- /wp:heading -->`);
                i++;
                continue;
            }
            if (line.startsWith("# ")) {
                const text = this.convertInlineMarkdown(line.replace("# ", ""));
                blocks.push(`<!-- wp:heading {"level":1} --><h1>${text}</h1><!-- /wp:heading -->`);
                i++;
                continue;
            }

            // Table detection (line contains | and next line has ---)
            if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+\s*\|/.test(lines[i + 1]?.trim())) {
                let tableBlock = line + "\n";
                i++;
                while (i < lines.length && lines[i].trim().includes("|")) {
                    tableBlock += lines[i].trim() + "\n";
                    i++;
                }
                blocks.push(this.convertTable(tableBlock));
                continue;
            }

            // Unordered list
            if (line.startsWith("- ") || line.startsWith("* ")) {
                let items: string[] = [];
                while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
                    const itemText = lines[i].trim().replace(/^[-*] /, "");
                    items.push(`<li>${this.convertInlineMarkdown(itemText)}</li>`);
                    i++;
                }
                blocks.push(`<!-- wp:list --><ul>${items.join("")}</ul><!-- /wp:list -->`);
                continue;
            }

            // Ordered list
            if (/^\d+\.\s/.test(line)) {
                let items: string[] = [];
                while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                    const itemText = lines[i].trim().replace(/^\d+\.\s/, "");
                    items.push(`<li>${this.convertInlineMarkdown(itemText)}</li>`);
                    i++;
                }
                blocks.push(`<!-- wp:list {"ordered":true} --><ol>${items.join("")}</ol><!-- /wp:list -->`);
                continue;
            }

            // Blockquote
            if (line.startsWith("> ")) {
                let quoteLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith("> ")) {
                    quoteLines.push(lines[i].trim().replace(/^> /, ""));
                    i++;
                }
                const quoteText = this.convertInlineMarkdown(quoteLines.join(" "));
                blocks.push(`<!-- wp:quote --><blockquote class="wp-block-quote"><p>${quoteText}</p></blockquote><!-- /wp:quote -->`);
                continue;
            }

            // Regular paragraph — collect consecutive non-empty, non-special lines
            let paragraphLines: string[] = [line];
            i++;
            while (i < lines.length) {
                const nextLine = lines[i].trim();
                if (nextLine === "" || nextLine.startsWith("#") || nextLine.startsWith("- ") ||
                    nextLine.startsWith("* ") || /^\d+\.\s/.test(nextLine) || nextLine.startsWith("> ") ||
                    (nextLine.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+\s*\|/.test(lines[i + 1]?.trim()))) {
                    break;
                }
                paragraphLines.push(nextLine);
                i++;
            }
            blocks.push(this.wrapParagraph(paragraphLines.join(" ")));
        }

        return blocks.join("\n");
    }
}
