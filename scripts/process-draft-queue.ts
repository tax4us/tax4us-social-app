import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator';
import { WordPressClient } from '@/lib/clients/wordpress-client';

async function processAirtableDrafts() {
    console.log("Converting Airtable drafts to WordPress and processing through pipeline...\n");
    
    try {
        // Get current draft content pieces from Airtable
        const response = await fetch("http://localhost:3000/api/content/library");
        const data = await response.json();
        
        if (!data.success) {
            throw new Error("Failed to fetch content library");
        }
        
        const draftPieces = data.content_pieces.filter((piece: any) => piece.status === "draft");
        console.log(`Found ${draftPieces.length} draft content pieces to process:`);
        
        for (const piece of draftPieces) {
            console.log(`- ${piece.title_english} (${piece.id})`);
        }
        
        if (draftPieces.length === 0) {
            console.log("No draft content to process.");
            return;
        }
        
        // Initialize clients
        const orchestrator = new PipelineOrchestrator();
        const wp = new WordPressClient();
        
        // Process first draft piece as a test
        const piece = draftPieces[0];
        console.log(`\n=== Processing: ${piece.title_english} ===`);
        
        try {
            // 1. Create WordPress draft from Airtable content piece
            console.log("Creating WordPress draft...");
            const wordPressDraft = await wp.createPost({
                title: piece.title_english,
                content: piece.content_english || "Content generation in progress...",
                status: "draft",
                meta: {
                    airtable_content_id: piece.id,
                    airtable_topic_id: piece.topic_id,
                    target_keywords: piece.target_keywords?.join(", ") || "",
                    seo_score: piece.seo_score || 0
                }
            });
            
            console.log(`WordPress draft created: Post ID ${wordPressDraft.id}`);
            
            // 2. Process through complete pipeline
            console.log("Processing through full pipeline...");
            const result = await orchestrator.generatePost(
                wordPressDraft.id, 
                piece.title_english,
                piece.id // Pass Airtable ID
            );
            
            console.log("Pipeline result:", result);
            
            // 3. Wait for processing to complete (since it's async)
            console.log("Waiting for pipeline completion...");
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            
            // 4. Check the final WordPress post status
            const finalPost = await wp.getPost(wordPressDraft.id);
            console.log(`Final WordPress status: ${finalPost?.status}`);
            console.log(`Final title: ${finalPost?.title?.rendered}`);
            
        } catch (error) {
            console.error(`Failed to process ${piece.title_english}:`, error);
        }
        
        console.log("\n=== Processing Complete ===");
        
        // Check final content status
        const finalResponse = await fetch("http://localhost:3000/api/content/library");
        const finalData = await finalResponse.json();
        
        if (finalData.success) {
            console.log("Final Airtable content status:");
            console.log(JSON.stringify(finalData.statistics.by_status, null, 2));
        }
        
        // Check WordPress posts
        console.log("\nChecking recent WordPress posts...");
        const recentPosts = await wp.getPosts({ per_page: '5', status: 'any' });
        for (const post of recentPosts) {
            console.log(`- ${post.title.rendered} (${post.status})`);
        }
        
    } catch (error) {
        console.error("Error processing Airtable drafts:", error);
    }
}

processAirtableDrafts().catch(console.error);