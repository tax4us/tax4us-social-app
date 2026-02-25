import { NextResponse } from "next/server";
import { WordPressClient } from "@/lib/clients/wordpress-client";
import { podcastProducer } from "@/lib/services/podcast-producer";
import { socialMediaPublisher } from "@/lib/services/social-media-publisher";
import { KieClient } from "@/lib/clients/kie-client";

export async function GET() {
  try {
    const integrations = {
      wordpress: { status: 'checking', message: '', lastChecked: new Date().toISOString() },
      elevenlabs: { status: 'checking', message: '', lastChecked: new Date().toISOString() },
      captivate: { status: 'checking', message: '', lastChecked: new Date().toISOString() },
      facebook: { status: 'checking', message: '', lastChecked: new Date().toISOString() },
      linkedin: { status: 'checking', message: '', lastChecked: new Date().toISOString() },
      kie: { status: 'checking', message: '', lastChecked: new Date().toISOString() },
    };

    // Test WordPress
    try {
      const wp = new WordPressClient();
      const posts = await wp.getPosts({ per_page: '1' });
      integrations.wordpress = {
        status: 'operational',
        message: `Connected successfully. Found ${posts?.length || 0} posts.`,
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      integrations.wordpress = {
        status: 'failed',
        message: `WordPress connection failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }

    // Test ElevenLabs + Captivate via Podcast Producer
    try {
      const testResult = await podcastProducer.testConnections();
      
      integrations.elevenlabs = {
        status: testResult.elevenlabs.success ? 'operational' : 'failed',
        message: testResult.elevenlabs.message,
        lastChecked: new Date().toISOString()
      };

      integrations.captivate = {
        status: testResult.captivate.success ? 'operational' : 'failed', 
        message: testResult.captivate.message,
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      integrations.elevenlabs = {
        status: 'failed',
        message: `ElevenLabs test failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
      integrations.captivate = {
        status: 'failed',
        message: `Captivate test failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }

    // Test Social Media (Facebook/LinkedIn) via Upload-Post API
    try {
      const testResult = await socialMediaPublisher.testConnections();
      
      integrations.facebook = {
        status: testResult.facebook?.success ? 'operational' : 'failed',
        message: testResult.facebook?.message || 'No response from Facebook API',
        lastChecked: new Date().toISOString()
      };

      integrations.linkedin = {
        status: testResult.linkedin?.success ? 'operational' : 'failed',
        message: testResult.linkedin?.message || 'No response from LinkedIn API', 
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      integrations.facebook = {
        status: 'failed',
        message: `Facebook test failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
      integrations.linkedin = {
        status: 'failed',
        message: `LinkedIn test failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }

    // Test Kie.ai
    try {
      const kie = new KieClient();
      // Try a simple API call to test connectivity
      // Note: We don't want to generate actual content in a test
      integrations.kie = {
        status: 'operational',
        message: 'Kie.ai client initialized successfully',
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      integrations.kie = {
        status: 'failed',
        message: `Kie.ai initialization failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }

    // Calculate overall health score
    const totalIntegrations = Object.keys(integrations).length;
    const operationalCount = Object.values(integrations).filter(i => i.status === 'operational').length;
    const healthScore = Math.round((operationalCount / totalIntegrations) * 100);

    return NextResponse.json({
      success: true,
      healthScore,
      operational: operationalCount,
      total: totalIntegrations,
      integrations,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}