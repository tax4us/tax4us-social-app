# Tax4US Integration Validation Guide

## External Dependencies Checklist

### WordPress API (tax4us.co.il)
- **Endpoint**: `https://tax4us.co.il/wp-json/wp/v2/posts`
- **Authentication**: WordPress Application Password
- **Credentials**: `WORDPRESS_APP_USERNAME`, `WORDPRESS_APP_PASSWORD`
- **Validation**: Real Hebrew content retrieved, not empty responses

#### Validation Steps
```bash
# Test WordPress connection
curl -s "http://localhost:3000/api/wordpress/posts?limit=1" | jq '.success'
# Should return: true

# Verify real content
curl -s "http://localhost:3000/api/wordpress/posts?limit=1" | jq '.posts[0].title'
# Should return Hebrew text, not placeholder
```

#### Common Failures
- **401 Unauthorized**: Check application password hasn't expired
- **Empty posts array**: WordPress site might be down or content restricted
- **Network timeout**: Check site accessibility

### NotebookLM MCP Integration
- **Service**: NotebookLM via MCP protocol
- **Notebook ID**: `d5f128c4-0d17-42c3-8d52-109916859c76`
- **Authentication**: Cookie-based session
- **Validation**: AI-generated content with tax expertise

#### Validation Steps
```bash
# Test NotebookLM connection (requires MCP)
# This should be done through the notebook query API
curl -s "http://localhost:3000/api/notebook-query" \
  -d '{"notebookId": "d5f128c4-0d17-42c3-8d52-109916859c76", "query": "FBAR requirements"}'
```

#### Common Failures
- **Authentication expired**: Re-run `notebooklm-mcp-auth` or update cookies
- **Rate limiting**: NotebookLM has usage quotas
- **Session timeout**: Long-running operations may lose connection

### Kie.ai Video Generation (Sora-2-Pro)
- **API Key**: `KIE_API_KEY` environment variable
- **Service**: Kie.ai video generation with Sora-2-Pro model
- **Validation**: Real video task IDs returned, not mock responses

#### Validation Steps
```bash
# Test video generation
curl -s -X POST "http://localhost:3000/api/video/generate" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Video", "excerpt": "Test", "style": "documentary", "platform": "facebook"}' | jq '.success'
# Should return: true

# Check task status
curl -s "http://localhost:3000/api/video/status/[taskId]" | jq '.status'
# Should return: "processing" or "success" (never null)
```

#### Common Failures
- **Invalid API key**: Check KIE_API_KEY environment variable
- **Rate limiting**: Kie.ai has usage quotas and processing limits
- **Task timeout**: Video generation can take 2-5 minutes

### Apify Web Scraping Services
- **API Token**: `APIFY_TOKEN` environment variable  
- **User ID**: `APIFY_USER_ID` environment variable
- **Services**: IRS content scraping, LinkedIn lead generation, competitive analysis
- **Validation**: Real scraped data, not placeholder responses

#### Validation Steps
```bash
# Test Apify dashboard
curl -s "http://localhost:3000/api/apify/dashboard" | jq '.dashboard.automation_metrics'
# Should return metrics object

# Test lead generation
curl -s "http://localhost:3000/api/lead-generation" | jq '.analytics.high_value_leads'
# Should return number > 0
```

### Social Media APIs

#### Facebook Page Insights  
- **Page ID**: `844266372343077`
- **Access Token**: `FACEBOOK_PAGE_ACCESS_TOKEN`
- **Validation**: Real engagement metrics

#### LinkedIn Integration
- **Client ID**: `LINKEDIN_CLIENT_ID`
- **Client Secret**: `LINKEDIN_CLIENT_SECRET` 
- **Validation**: Professional profile data

#### Validation Steps
```bash
# Test social media analytics
curl -s "http://localhost:3000/api/social-media/analytics" | jq '.analytics.facebook.posts'
# Should return number > 0
```

### Podcast Platform Analytics

#### Captivate.fm
- **User ID**: `655c0354-dec7-4e77-ade1-c79898c596cb`
- **API Key**: `CAPTIVATE_API_KEY`

#### Apple Podcasts & Spotify
- **Validation**: Download and engagement metrics

#### Validation Steps
```bash
# Test podcast analytics
curl -s "http://localhost:3000/api/podcast/analytics" | jq '.analytics.summary.total_episodes'
# Should return number > 0
```

## Integration Health Check Script

### Comprehensive Validation
Run all integration tests in sequence:

```bash
# Execute comprehensive integration test
scripts/validate-integrations.sh --full
```

Expected output:
- ✅ WordPress: Connected, real content retrieved
- ✅ NotebookLM: Authenticated, AI responses working  
- ✅ Kie.ai: Video generation API responding
- ✅ Apify: Scraping services operational
- ✅ Social Media: Analytics data flowing
- ✅ Podcasts: Platform metrics accessible

## Failure Recovery Procedures

### Authentication Failures
1. **Check environment variables** are properly set
2. **Verify credentials haven't expired** (especially WordPress app passwords)
3. **Test credentials directly** against service APIs
4. **Regenerate tokens** if necessary
5. **Update application configuration**

### Service Unavailability
1. **Check service status pages** for known outages
2. **Test alternative endpoints** if available
3. **Implement graceful degradation** for non-critical features
4. **Add retry logic** with exponential backoff
5. **Cache responses** when possible to reduce dependencies

### Rate Limiting
1. **Implement request throttling** to stay within limits
2. **Add queue systems** for batch operations
3. **Cache responses** to reduce API calls
4. **Upgrade service tiers** if needed for higher quotas
5. **Implement circuit breakers** to prevent cascading failures

## Integration Testing Protocol

### Pre-Deployment Checklist
- [ ] All external APIs return expected data formats
- [ ] Authentication tokens are valid and not expiring soon
- [ ] Error handling covers service unavailability scenarios
- [ ] Rate limiting is respected in all API calls
- [ ] Fallback behaviors work when services are unavailable
- [ ] Data transformations handle edge cases properly
- [ ] No hardcoded URLs or credentials in code
- [ ] Environment variables are properly configured
- [ ] Integration logs provide useful debugging information
- [ ] Performance is acceptable under normal load