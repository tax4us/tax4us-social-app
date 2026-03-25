---
phase: 01-social-media-fix
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: 
  - lib/services/social-media-publisher.ts
  - app/api/social-publish/route.ts
  - scripts/test-social-flow.ts
autonomous: true
requirements: [SOCIAL-01, SOCIAL-02]

must_haves:
  truths:
    - "Facebook videos post as reels when URL contains 'facebook_reel'"
    - "LinkedIn videos post successfully with valid access token"
    - "Test script can verify both platforms work end-to-end"
  artifacts:
    - path: "lib/services/social-media-publisher.ts"
      provides: "Fixed Facebook reel detection and LinkedIn auth"
      min_lines: 700
    - path: "app/api/social-publish/route.ts"  
      provides: "Test endpoint for direct social posting"
      exports: ["POST"]
    - path: "scripts/test-social-flow.ts"
      provides: "End-to-end verification script"
      min_lines: 50
  key_links:
    - from: "scripts/test-social-flow.ts"
      to: "lib/services/social-media-publisher.ts"
      via: "Direct class import"
      pattern: "socialMediaPublisher\\.publishContentToSocial"
    - from: "lib/services/social-media-publisher.ts"
      to: "Facebook Graph API"
      via: "POST to video_reels endpoint"
      pattern: "/video_reels.*facebook_reel"
    - from: "lib/services/social-media-publisher.ts" 
      to: "LinkedIn UGC API"
      via: "Bearer token authentication"
      pattern: "Bearer.*w_member_social"
---

<objective>
Fix Facebook Reels and LinkedIn video posting to work reliably by debugging execution flow and correcting API calls.

Purpose: Restore working social media automation that user confirmed worked before
Output: Verified working Facebook Reels and LinkedIn video posting with test validation
</objective>

<execution_context>
@lib/services/social-media-publisher.ts
@.project-memory/linkedin-token.json
@data/content_pieces.json
</execution_context>

<context>
The user has confirmed both Facebook and LinkedIn posting worked before, with evidence:
- LinkedIn videos exist in content_pieces.json with URLs like "linkedin_video": "http://localhost:3000/videos/..."
- Working LinkedIn post: https://www.linkedin.com/posts/tax4us-il_ustax-expattax-taxplanning-activity-7421601082000322560-6YDa
- Facebook videos should post as reels when URL contains "facebook_reel"
- Current state shows valid tokens exist: CLIENT_ID: 867fvsh119usxe, scope: w_member_social

Current Issues:
1. Facebook: Videos post as regular posts instead of reels despite reel detection logic
2. LinkedIn: ACCESS_DENIED errors despite valid credentials

User constraints: "you have what you need" - don't rebuild, focus on what changed from working state.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Debug and fix Facebook Reel posting logic</name>
  <files>lib/services/social-media-publisher.ts, scripts/test-social-flow.ts</files>
  <action>
    1. Create test script to isolate Facebook reel posting:
       - Mock ContentPiece with facebook_reel URL
       - Test reel detection logic (lines 267-272)
       - Verify endpoint selection: /video_reels vs /videos vs /feed
       - Log actual request payload sent to Facebook API
    
    2. Fix identified issues in Facebook reel posting:
       - Ensure isReel flag is preserved through URL processing (lines 276-288)
       - Verify video_reels endpoint payload format matches Facebook API spec
       - Test that publicMediaUrl maintains reel context
       - Fix any payload structure issues for reels vs regular videos
    
    3. Test with real video URL from content_pieces.json:
       - Use existing facebook_reel URL from line 80: "https://www.tax4us.co.il/wp-content/uploads/2026/03/tax4us_facebook_reel_1774150005411.mp4"
       - Verify the video is publicly accessible
       - Confirm API call succeeds and creates reel, not regular post
  </action>
  <verify>npm run build && npx tsx scripts/test-social-flow.ts facebook-only</verify>
  <done>Facebook video with facebook_reel URL posts as actual reel visible in Facebook page timeline</done>
</task>

<task type="auto">
  <name>Task 2: Debug and fix LinkedIn ACCESS_DENIED errors</name>
  <files>lib/services/social-media-publisher.ts</files>
  <action>
    1. Debug LinkedIn authentication flow:
       - Test token validity with /v2/me endpoint using stored token
       - Verify CLIENT_ID 867fvsh119usxe matches app configuration
       - Check if scope w_member_social has required permissions for UGC posts
       - Log full request headers and response for failed calls
    
    2. Compare working vs broken state:
       - Working post: 7421601082000322560-6YDa suggests successful UGC API usage
       - Check if API endpoint changed: /v2/ugcPosts vs /v2/shares
       - Verify authorUrn format: "urn:li:member:4dY3XgtLPJ" (current member_id)
       - Test payload structure matches LinkedIn API v2 spec
    
    3. Fix identified authentication/API issues:
       - Ensure headers include X-Restli-Protocol-Version: 2.0.0
       - Verify UGC payload structure for video posts
       - Test binary video upload flow (register → upload → ugcPost)
       - Handle any scope or permission changes since working state
  </action>
  <verify>npx tsx scripts/test-social-flow.ts linkedin-only</verify>
  <done>LinkedIn video post succeeds and returns valid post ID, accessible at linkedin.com URL</done>
</task>

<task type="auto">
  <name>Task 3: Create unified test endpoint and validation script</name>
  <files>app/api/social-publish/route.ts, scripts/test-social-flow.ts</files>
  <action>
    1. Create API endpoint for testing social posting:
       - POST /api/social-publish accepts {platform, contentId} 
       - Loads ContentPiece from data/content_pieces.json by ID
       - Calls socialMediaPublisher.publishContentToSocial()
       - Returns detailed success/failure with post URLs
    
    2. Create comprehensive test script:
       - Test Facebook reel with actual content piece data
       - Test LinkedIn video with actual content piece data  
       - Validate both platforms return real post URLs
       - Document working video URLs for regression testing
    
    3. Integration test with real content:
       - Use content_1772572489279_dyjdu0phm (FBAR topic) with existing media URLs
       - Verify Facebook reel URL creates reel: tax4us_facebook_reel_1774150005411.mp4
       - Verify LinkedIn video posts: tax4us_linkedin_1774149148083.mp4  
       - Document expected vs actual behavior for future debugging
  </action>
  <verify>curl -X POST localhost:3000/api/social-publish -d '{"platform":"both","contentId":"content_1772572489279_dyjdu0phm"}' -H "Content-Type: application/json"</verify>
  <done>API returns successful post URLs for both Facebook (as reel) and LinkedIn (as video), accessible in respective platforms</done>
</task>

</tasks>

<verification>
1. Facebook Reel Test: Video with facebook_reel URL posts as reel, not regular video
2. LinkedIn Video Test: Video upload and UGC post succeeds with ACCESS token 
3. End-to-End Test: Both platforms work with real content piece data
4. Regression Test: Test script can validate working state for future monitoring
</verification>

<success_criteria>
- Facebook videos containing "facebook_reel" in URL post as reels visible on Facebook page
- LinkedIn videos upload successfully and create UGC posts with valid LinkedIn URLs  
- Test script passes for both platforms using existing content piece data
- Social media automation restored to previously working state
</success_criteria>

<output>
After completion, create `.planning/phases/01-social-media-fix/01-social-media-fix-01-SUMMARY.md`
</output>