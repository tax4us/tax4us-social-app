/**
 * Gutenberg Block Builder for Tax4Us
 * Converts markdown and metadata into WordPress Gutenberg blocks.
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

    private markdownToBlocks(markdown: string) {
        // Simple markdown to block converter
        // In a real app, we'd use a robust library like 'remark-parse' or similar.
        // Following n8n regex logic from audit.
        const sections = markdown.split(/\n\n+/);
        return sections.map(section => {
            if (section.startsWith("# ")) {
                return `<!-- wp:heading {"level":1} --><h1>${section.replace("# ", "")}</h1><!-- /wp:heading -->`;
            }
            if (section.startsWith("## ")) {
                return `<!-- wp:heading {"level":2} --><h2>${section.replace("## ", "")}</h2><!-- /wp:heading -->`;
            }
            if (section.startsWith("### ")) {
                return `<!-- wp:heading {"level":3} --><h3>${section.replace("### ", "")}</h3><!-- /wp:heading -->`;
            }
            if (section.startsWith("- ")) {
                const items = section.split("\n").map(li => `<li>${li.replace("- ", "")}</li>`).join("");
                return `<!-- wp:list --><ul>${items}</ul><!-- /wp:list -->`;
            }
            return `<!-- wp:paragraph --><p>${section}</p><!-- /wp:paragraph -->`;
        }).join("\n");
    }
}
