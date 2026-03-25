#!/usr/bin/env npx tsx
import 'dotenv/config'
import { linkedInPersistentAuth } from '../lib/services/linkedin-persistent-auth'

/**
 * LinkedIn Token Acquisition Script
 * Gets a LinkedIn access token and stores it for long-term use
 * Only needs to be run once every ~60 days
 */

async function getLinkedInToken() {
  try {
    console.log('🔐 LinkedIn Token Setup')
    console.log('=====================\n')

    // Check if we already have a valid token
    const status = await linkedInPersistentAuth.getTokenStatus()
    if (status.hasToken) {
      console.log(`✅ LinkedIn token already available (${status.source})`)
      
      if (status.expiresAt) {
        console.log(`   Expires: ${status.expiresAt}`)
        console.log(`   Days until expiry: ${status.daysUntilExpiry}`)
      }

      // Test the token
      console.log('\n🔬 Testing LinkedIn API access...')
      const testResult = await linkedInPersistentAuth.testToken()
      
      if (testResult.valid) {
        console.log(`✅ Token is valid! Connected as: ${testResult.userInfo?.name}`)
        console.log('\n✨ No action needed - LinkedIn integration is ready!')
        return
      } else {
        console.log(`❌ Token test failed: ${testResult.error}`)
        console.log('🔄 Clearing invalid token and requesting new one...')
        await linkedInPersistentAuth.clearTokens()
      }
    }

    // Need to get a new token
    console.log('❌ No valid LinkedIn token found\n')
    
    // Check command line arguments for token
    const args = process.argv.slice(2)
    const tokenArg = args.find(arg => arg.startsWith('--token='))
    
    const memberIdArg = args.find(arg => arg.startsWith('--member-id='))

    if (tokenArg) {
      const token = tokenArg.split('=')[1]
      if (token && token.length > 20) {
        console.log('🔄 Processing provided LinkedIn token...')

        // Store the token (auto-fetches member_id if r_liteprofile scope present)
        await linkedInPersistentAuth.storeAccessToken(token)

        // If member-id provided manually, patch it in
        if (memberIdArg) {
          const memberId = memberIdArg.split('=')[1]
          if (memberId && /^\d+$/.test(memberId)) {
            const fs = await import('fs/promises')
            const path = await import('path')
            const storePath = path.join(process.cwd(), '.project-memory', 'linkedin-token.json')
            const existing = JSON.parse(await fs.readFile(storePath, 'utf-8'))
            existing.member_id = memberId
            await fs.writeFile(storePath, JSON.stringify(existing, null, 2), 'utf-8')
            process.env.LINKEDIN_MEMBER_ID = memberId
            console.log(`✅ LinkedIn member ID stored: ${memberId}`)
          }
        }
        
        // Test it
        const testResult = await linkedInPersistentAuth.testToken()
        if (testResult.valid) {
          console.log(`✅ Token stored and validated! Connected as: ${testResult.userInfo?.name}`)
          console.log('\n✨ LinkedIn integration is now ready for long-term use!')
        } else {
          console.error(`❌ Provided token is invalid: ${testResult.error}`)
          process.exit(1)
        }
        return
      }
    }

    // Provide instructions for getting a token
    console.log('📋 To get a LinkedIn access token:\n')
    console.log('1. Go to: https://www.linkedin.com/developers/tools/oauth/token-generator')
    console.log('2. Select app: "ai agent" (client_id: ' + process.env.LINKEDIN_CLIENT_ID + ')')
    console.log('3. Select scopes: w_member_social + r_liteprofile (r_liteprofile enables auto-storing member ID)')
    console.log('4. Click "Request access token"')
    console.log('5. Copy the token and run:')
    console.log('   npm run get-linkedin-token -- --token=YOUR_ACCESS_TOKEN\n')
    console.log('⚠️  Token lasts 60 days. Slack reminder fires on day 59 automatically.')

  } catch (error) {
    console.error('❌ LinkedIn token setup failed:', error)
    process.exit(1)
  }
}

getLinkedInToken()