import { NextRequest, NextResponse } from 'next/server';
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator';
import { pipelineLogger } from '@/lib/pipeline/logger';

// Handle Ben's topic approval responses from Slack
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, approved, feedback, userId } = body;

    // Verify this is from an authorized user (Ben)
    if (!userId || userId !== process.env.BEN_SLACK_USER_ID) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized user'
      }, { status: 403 });
    }

    const orchestrator = new PipelineOrchestrator();

    if (approved) {
      // Ben approved the topic - start content generation
      pipelineLogger.info(`Ben approved topic for post ${postId}. Starting content generation...`, postId.toString());
      
      try {
        const result = await orchestrator.generatePost(parseInt(postId));
        
        return NextResponse.json({
          success: true,
          message: `Topic approved! Content generation started for post ${postId}`,
          result
        });
      } catch (error) {
        pipelineLogger.error(`Content generation failed after approval: ${error instanceof Error ? error.message : 'Unknown error'}`, postId.toString());
        
        return NextResponse.json({
          success: false,
          error: `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
      
    } else {
      // Ben rejected the topic
      pipelineLogger.info(`Ben rejected topic for post ${postId}. ${feedback ? 'Feedback: ' + feedback : 'No feedback provided.'}`, postId.toString());
      
      if (feedback) {
        // Ben provided feedback - generate a new topic based on feedback
        pipelineLogger.info(`Generating new topic based on Ben's feedback: ${feedback}`, postId.toString());
        
        try {
          // Generate a new topic proposal based on feedback
          const newProposal = await orchestrator.proposeNewTopicWithFeedback(feedback);
          
          return NextResponse.json({
            success: true,
            message: `Topic rejected. New topic proposed based on feedback: "${newProposal.topic}"`,
            newPostId: newProposal.postId
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to generate new topic: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 });
        }
      } else {
        // Simple rejection - just log and wait for next scheduled run
        return NextResponse.json({
          success: true,
          message: `Topic rejected by Ben. Will generate new proposal in next scheduled run.`
        });
      }
    }

  } catch (error) {
    console.error('Topic approval handler error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}