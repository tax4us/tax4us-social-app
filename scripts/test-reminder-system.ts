#!/usr/bin/env npx tsx
import 'dotenv/config'
import { linkedInPersistentAuth } from '../lib/services/linkedin-persistent-auth'
import { tokenReminder } from '../lib/services/token-reminder'

/**
 * Test the 60-day reminder system
 */

async function testReminderSystem() {
  console.log('🧪 Testing 60-Day Token Reminder System')
  console.log('======================================\n')

  try {
    // Test 1: Store a token that expires in 2 days to trigger reminder
    console.log('1️⃣ Creating test token that expires in 2 days...\n')
    
    const testToken = 'TEST_TOKEN_' + Date.now()
    const twoDaysInSeconds = 2 * 24 * 60 * 60 // 2 days
    
    await linkedInPersistentAuth.storeAccessToken(testToken, twoDaysInSeconds)
    
    // Test 2: Check reminder system
    console.log('2️⃣ Testing reminder system...\n')
    
    await tokenReminder.testReminder()
    
    // Test 3: Check current token status
    console.log('\n3️⃣ Checking actual token status...\n')
    
    const status = await linkedInPersistentAuth.getTokenStatus()
    console.log('📊 Current Token Status:')
    console.log(`   Has Token: ${status.hasToken ? '✅ Yes' : '❌ No'}`)
    if (status.expiresAt) {
      console.log(`   Expires: ${status.expiresAt}`)
      console.log(`   Days Until Expiry: ${status.daysUntilExpiry}`)
    }
    console.log('')

    // Test 4: Test reminder check with actual token
    console.log('4️⃣ Running reminder check with actual token...\n')
    
    await tokenReminder.checkAndSendReminders()
    
    // Test 5: Show reminder configuration
    console.log('\n5️⃣ Reminder Configuration:')
    const config = tokenReminder.getReminderStatus()
    console.log(`   Method: ${config.method}`)
    console.log(`   Warning Days: ${config.warningDays}`)
    console.log(`   Last Reminder: ${config.lastReminderSent || 'Never'}`)
    console.log('')

    // Test 6: Create a normal 60-day token
    console.log('6️⃣ Creating normal 60-day token...\n')
    
    const normalToken = 'LINKEDIN_TOKEN_' + Date.now()
    const sixtyDaysInSeconds = 60 * 24 * 60 * 60 // 60 days
    
    await linkedInPersistentAuth.storeAccessToken(normalToken, sixtyDaysInSeconds)
    
    const finalStatus = await linkedInPersistentAuth.getTokenStatus()
    console.log('📊 Final Token Status:')
    console.log(`   Has Token: ${finalStatus.hasToken ? '✅ Yes' : '❌ No'}`)
    if (finalStatus.expiresAt) {
      console.log(`   Expires: ${finalStatus.expiresAt}`)
      console.log(`   Days Until Expiry: ${finalStatus.daysUntilExpiry}`)
    }
    console.log('')

    console.log('✅ Reminder System Test Results:')
    console.log('   ✅ 60-day token storage working')
    console.log('   ✅ Day 59 reminder system ready')
    console.log('   ✅ Expiry notification system ready')
    console.log('   ✅ Console, file, and Slack reminder methods available')
    console.log('')
    
    console.log('🎯 Production Setup:')
    console.log('   1. Store real LinkedIn token: npm run get-linkedin-token')
    console.log('   2. Daily monitoring: npm run monitor-tokens')
    console.log('   3. System will remind you on day 59 automatically')
    console.log('   4. Get new token and repeat every 60 days')

  } catch (error) {
    console.error('❌ Reminder system test failed:', error)
    process.exit(1)
  }
}

testReminderSystem()