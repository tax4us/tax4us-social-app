import { config } from 'dotenv';
config({ path: '.env.local' });
import { WordPressClient } from '../lib/clients/wordpress-client';

async function checkProductionData() {
    console.log("🔍 Checking Production Data Availability...");

    const wp = new WordPressClient();
    try {
        console.log("   - Fetching Posts (status=publish)...");
        const posts = await wp.getPosts({ status: 'publish', per_page: '5' });

        if (Array.isArray(posts)) {
            console.log(`   ✅ Success! Recieved ${posts.length} posts.`);
            console.log(`   - First Post Title: ${posts[0]?.title?.rendered}`);
            console.log(`   - First Post Status: ${posts[0]?.status}`);
        } else {
            console.error("   ❌ Failed: Response is not an array.", posts);
        }

        console.log("   - Fetching Categories...");
        const cats = await wp.getCategories();
        console.log(`   ✅ Categories found: ${cats.length}`);

    } catch (error) {
        console.error("   ❌ Error fetching from WordPress:", error);
    }
}

checkProductionData();
