# LinkedIn Member ID Fix

## Problem
The LinkedIn video upload is failing because `LINKEDIN_MEMBER_ID` is not set in the environment. The code defaults to '0' which is invalid.

## The Working Solution (from our own code comments)

1. Open LinkedIn.com in Chrome
2. Open Developer Console (F12)
3. Run this JavaScript:
   ```javascript
   document.body.innerHTML.match(/urn:li:member:(\d+)/)?.[1]
   ```
4. This will return your LinkedIn member ID number
5. Set it permanently using:
   ```bash
   npm run get-linkedin-token -- --token=CURRENT_TOKEN --member-id=YOUR_ID
   ```

## Why This Fixes It

- Image posts worked before because the member ID was set correctly
- Video uploads need the same member ID for the UGC API
- The auth token is valid, we just need the member URN

## Current Status
- ✅ Facebook auth working (page token + permissions)
- ✅ LinkedIn auth working (access token valid)  
- ❌ LinkedIn member ID missing (causes video upload failures)

Once member ID is set, both image and video posts will use the same working auth pattern.