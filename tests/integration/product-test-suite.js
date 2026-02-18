/**
 * TAX4US Content Factory - Comprehensive Product Testing Suite
 * 
 * This test suite validates the entire product functionality before delivery
 * Tests all core features, integrations, and user workflows
 */

const fetch = require('node-fetch');
const baseUrl = 'http://localhost:3000';

class ProductTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  // Test result tracking
  logTest(testName, passed, details = '') {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ PASS: ${testName}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ FAIL: ${testName} - ${details}`);
    }
    this.testResults.details.push({
      name: testName,
      status: passed ? 'PASS' : 'FAIL',
      details: details,
      timestamp: new Date().toISOString()
    });
  }

  // Core API Tests
  async testDatabaseConnection() {
    try {
      const response = await fetch(`${baseUrl}/api/admin/seed-database`);
      const data = await response.json();
      this.logTest('Database Connection', 
        response.ok && data.stats && data.stats.topics > 0,
        `Topics: ${data.stats?.topics}, Content: ${data.stats?.contentPieces}`
      );
      return data;
    } catch (error) {
      this.logTest('Database Connection', false, error.message);
      return null;
    }
  }

  async testExecutiveCenterDashboard() {
    try {
      const response = await fetch(`${baseUrl}/executive-center`);
      this.logTest('Executive Center Dashboard', 
        response.ok && response.status === 200,
        `HTTP Status: ${response.status}`
      );
      return response.ok;
    } catch (error) {
      this.logTest('Executive Center Dashboard', false, error.message);
      return false;
    }
  }

  async testContentTemplates() {
    try {
      const response = await fetch(`${baseUrl}/api/content-templates`);
      const data = await response.json();
      this.logTest('Content Templates API', 
        response.ok && data.templates && data.templates.length >= 3,
        `Templates available: ${data.templates?.length}`
      );
      return data;
    } catch (error) {
      this.logTest('Content Templates API', false, error.message);
      return null;
    }
  }

  async testContentGeneration() {
    try {
      const response = await fetch(`${baseUrl}/api/content-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          templateId: 'bilingual_tax_article',
          additionalContext: { priority: 'high', target_audience: 'israeli_americans' }
        })
      });
      const data = await response.json();
      this.logTest('Content Generation', 
        response.ok && data.id && data.title && data.content,
        `Generated content ID: ${data.id?.substring(0, 20)}...`
      );
      return data;
    } catch (error) {
      this.logTest('Content Generation', false, error.message);
      return null;
    }
  }

  async testPipelineManagement() {
    try {
      // Test pipeline start
      const startResponse = await fetch(`${baseUrl}/api/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_type: 'manual' })
      });
      const startData = await startResponse.json();
      
      // Test pipeline status
      const statusResponse = await fetch(`${baseUrl}/api/pipeline/status`);
      const statusData = await statusResponse.json();
      
      this.logTest('Pipeline Management', 
        startResponse.ok && startData.success && statusResponse.ok,
        `Pipeline Run ID: ${startData.runId}`
      );
      return { start: startData, status: statusData };
    } catch (error) {
      this.logTest('Pipeline Management', false, error.message);
      return null;
    }
  }

  async testProjectMemory() {
    try {
      const response = await fetch(`${baseUrl}/api/project-memory?action=progress-report`);
      const data = await response.json();
      this.logTest('Project Memory System', 
        response.ok && data.report,
        `Report generated with ${data.report?.split('\n').length} lines`
      );
      return data;
    } catch (error) {
      this.logTest('Project Memory System', false, error.message);
      return null;
    }
  }

  async testTopicApproval() {
    try {
      const response = await fetch(`${baseUrl}/api/topics/approval`);
      const data = await response.json();
      this.logTest('Topic Approval System', 
        response.ok && data.total && data.summary,
        `Total topics: ${data.total}, Pending: ${data.pending}`
      );
      return data;
    } catch (error) {
      this.logTest('Topic Approval System', false, error.message);
      return null;
    }
  }

  async testWordPressIntegration() {
    try {
      const response = await fetch(`${baseUrl}/api/wordpress/posts?limit=3`);
      const data = await response.json();
      this.logTest('WordPress Integration', 
        response.ok && data.success && data.posts && data.posts.length > 0,
        `Retrieved ${data.posts?.length} posts from tax4us.co.il`
      );
      return data;
    } catch (error) {
      this.logTest('WordPress Integration', false, error.message);
      return null;
    }
  }

  async testSocialMediaAnalytics() {
    try {
      const response = await fetch(`${baseUrl}/api/social-media/analytics`);
      const data = await response.json();
      this.logTest('Social Media Analytics', 
        response.ok && data.analytics,
        `Facebook posts: ${data.analytics?.facebook?.posts}, LinkedIn: ${data.analytics?.linkedin?.posts}`
      );
      return data;
    } catch (error) {
      this.logTest('Social Media Analytics', false, error.message);
      return null;
    }
  }

  async testPodcastAnalytics() {
    try {
      const response = await fetch(`${baseUrl}/api/podcast/analytics`);
      const data = await response.json();
      this.logTest('Podcast Analytics', 
        response.ok && data.analytics,
        `Total episodes: ${data.analytics?.summary?.total_episodes}`
      );
      return data;
    } catch (error) {
      this.logTest('Podcast Analytics', false, error.message);
      return null;
    }
  }

  async testLeadGeneration() {
    try {
      const response = await fetch(`${baseUrl}/api/lead-generation`);
      const data = await response.json();
      this.logTest('Lead Generation System', 
        response.ok && data.leads,
        `High-value leads: ${data.analytics?.high_value_leads}`
      );
      return data;
    } catch (error) {
      this.logTest('Lead Generation System', false, error.message);
      return null;
    }
  }

  async testApifyDashboard() {
    try {
      const response = await fetch(`${baseUrl}/api/apify/dashboard`);
      const data = await response.json();
      this.logTest('Apify Intelligence Dashboard', 
        response.ok && data.dashboard,
        `Optimization score: ${data.dashboard?.content_optimization?.overall_score}`
      );
      return data;
    } catch (error) {
      this.logTest('Apify Intelligence Dashboard', false, error.message);
      return null;
    }
  }

  // Run all tests
  async runFullTestSuite() {
    console.log('🚀 Starting TAX4US Content Factory - Full Product Test Suite');
    console.log('=' .repeat(60));

    // Core Infrastructure Tests
    console.log('\n📊 Testing Core Infrastructure...');
    await this.testDatabaseConnection();
    await this.testExecutiveCenterDashboard();
    await this.testProjectMemory();

    // Content Generation Tests  
    console.log('\n📝 Testing Content Generation System...');
    await this.testContentTemplates();
    await this.testContentGeneration();
    await this.testPipelineManagement();

    // Approval & Management Tests
    console.log('\n✅ Testing Approval & Management...');
    await this.testTopicApproval();

    // Integration Tests
    console.log('\n🔗 Testing External Integrations...');
    await this.testWordPressIntegration();
    await this.testSocialMediaAnalytics();
    await this.testPodcastAnalytics();
    await this.testLeadGeneration();
    await this.testApifyDashboard();

    // Generate final report
    this.generateFinalReport();
  }

  generateFinalReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 TAX4US CONTENT FACTORY - FINAL TEST REPORT');
    console.log('=' .repeat(60));
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    
    console.log(`📊 Test Summary:`);
    console.log(`   Total Tests: ${this.testResults.total}`);
    console.log(`   ✅ Passed: ${this.testResults.passed}`);
    console.log(`   ❌ Failed: ${this.testResults.failed}`);
    console.log(`   🎯 Success Rate: ${successRate}%`);
    
    if (successRate >= 95) {
      console.log('\n🚀 PRODUCT STATUS: READY FOR DELIVERY! 🚀');
      console.log('✅ All critical systems operational');
      console.log('✅ Content factory fully functional');
      console.log('✅ Integrations working correctly');
    } else if (successRate >= 80) {
      console.log('\n⚠️  PRODUCT STATUS: MINOR ISSUES DETECTED');
      console.log('🔧 Some non-critical features need attention');
    } else {
      console.log('\n❌ PRODUCT STATUS: MAJOR ISSUES - NOT READY');
      console.log('🚨 Critical issues must be resolved before delivery');
    }

    console.log('\n📋 Detailed Test Results:');
    this.testResults.details.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${status} ${test.name}: ${test.details}`);
    });

    console.log('\n' + '=' .repeat(60));
    return successRate >= 95;
  }
}

// Export for use
module.exports = ProductTestSuite;

// Run tests if called directly
if (require.main === module) {
  const testSuite = new ProductTestSuite();
  testSuite.runFullTestSuite().then(() => {
    process.exit(testSuite.testResults.failed === 0 ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}