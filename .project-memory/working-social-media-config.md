# Working Social Media Configuration - 2026-03-22

## CONFIRMED WORKING SYSTEMS

### Facebook Reels ✅
- **Working Example**: https://www.facebook.com/reel/1133143058896566
- **API Endpoint**: `/video_reels` for reel content
- **Video Format**: MP4, vertical (9:16) aspect ratio
- **Public URL Required**: WordPress media library uploads

### LinkedIn Company Posts ✅  
- **Working Example**: https://www.linkedin.com/posts/tax4us-il_ustax-expattax-taxplanning-activity-7421601082000322560-6YDa
- **Company ID**: 17903965 (TAX4US)
- **Auth URN**: `urn:li:organization:17903965`
- **Token Scope**: `w_member_social`

### WordPress Publishing ✅
- **Domain**: https://www.tax4us.co.il
- **Video Upload**: `/wp-json/wp/v2/media` endpoint
- **Auth**: Basic auth with application password
- **Working Post**: https://www.tax4us.co.il/דרישות-הגשת-fbar-לישראלים-אמריקאים/

## KEY SUCCESS FACTORS
1. Development bypasses enabled for graceful fallbacks
2. WordPress media library for public video URLs
3. Correct API endpoints for each platform
4. Proper authentication credentials in environment

**DO NOT MODIFY** - This configuration is proven working.