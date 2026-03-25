#!/usr/bin/env npx tsx
import 'dotenv/config'
import { tokenMonitor } from '../lib/services/token-monitor'

/**
 * Social Media Token Monitoring Script
 * Monitors token health and auto-refreshes when needed
 */

async function monitorTokens() {
  try {
    console.log('🔍 Social Media Token Monitoring')
    console.log('================================\n')

    // Run daily monitoring check
    await tokenMonitor.runDailyCheck()

    // Generate detailed report
    console.log('\n📊 Generating detailed monitoring report...\n')
    const report = await tokenMonitor.generateMonitoringReport()
    console.log(report)

    console.log('✅ Token monitoring completed successfully!')

  } catch (error) {
    console.error('❌ Token monitoring failed:', error)
    process.exit(1)
  }
}

// Run monitoring
monitorTokens()