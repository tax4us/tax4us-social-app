#!/bin/bash

# Vercel & GitHub Secret Sync Script (Portable Version)
# Usage: ./scripts/sync-secrets.sh <VERCEL_TOKEN> <GITHUB_TOKEN>

VERCEL_TOKEN=$1
GITHUB_TOKEN=$2

if [ -z "$VERCEL_TOKEN" ] || [ -z "$GITHUB_TOKEN" ]; then
    echo "Usage: ./scripts/sync-secrets.sh <VERCEL_TOKEN> <GITHUB_TOKEN>"
    exit 1
fi

set_vercel_env() {
    local name=$1
    local value=$2
    echo "Setting Vercel ENV: $name"
    printf "%s" "$value" | vercel env add "$name" production --token "$VERCEL_TOKEN" --force
}

set_gh_secret() {
    local name=$1
    local value=$2
    echo "Setting GitHub Secret: $name"
    printf "%s" "$value" | gh secret set "$name" --token "$GITHUB_TOKEN"
}

# List of secrets: "NAME|VALUE"
SECRETS=(
    "CAPTIVATE_API_KEY|cJ3zT4tcdgdRAhTf1tkJXOeS1O2LIyx2h01K8ag0"
    "CAPTIVATE_USER_ID|655c0354-dec7-4e77-ade1-c79898c596cb"
    "FACEBOOK_PAGE_ID|61571773396514"
    "SLACK_CLIENT_ID|9407355401399.9424472737604"
    "SLACK_CLIENT_SECRET|52c49fa5b86d5c5eebfba5e97c04a42a"
    "SLACK_BOT_TOKEN|xoxb-9407355401399-9718939790838-HfWjBdYtPGqRaZ9uzaCJGBGg"
    "ELEVENLABS_API_KEY|sk_1eff0dd075e1dc6aaf130a51854406efa9a23c7e5b15fd0c"
    "ELEVENLABS_VOICE_ID|ZT9u07TYPVl83ejeLakq"
    "ELEVENLABS_RESOURCE_ID|ZT9u07TYPVl83ejeLakq"
    "AIRTABLE_TOKEN|patnvGcDyEXcN6zbu.0b74fc30e34492277f22550676f963444f240ec58009a26c62d5ad8af8920c03"
    "OPENROUTER_API_KEY|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"
    "TAVILY_API_KEY|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"
    "SERPAPI_KEY|23a725585c44b67fc5fe617514538b7f22639179d5e7e10bf7b397ebf6d45ba3"
    "APIFY_TOKEN|apify_api_heheH5Ab20bvPlr6yj4AXtOGEWDQqE1EDs0m"
    "APIFY_USER_ID|JpAAvL7UM4NtVh4QP"
    "WP_APP_PASSWORD|tvFc 8gY1 1zMf Mg9X YrCc xrCL"
    "WP_APPLICATION_PASSWORD|tvFc 8gY1 1zMf Mg9X YrCc xrCL"
    "CLAUDE_API_KEY|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"
    "ANTHROPIC_API_KEY|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"
    "KIE_AI_API_KEY|3ca74c96d52beaef45650eb629876245"
    "GOOGLE_AI_STUDIO_API_KEY|AIzaSyCm2v8pWHD1ZK-7T0IIuxYeAlLM30887ME"
    "GOOGLE_AI_STUDIO_KEY|AIzaSyCm2v8pWHD1ZK-7T0IIuxYeAlLM30887ME"
    "STITCH_TOKEN|AQ.Ab8RN6KWSs42G9bA1ONrGRkRmvpVlNMhkV-p5MDEKQP7_wvfEA"
    "ASSEMBLYAI_API_KEY|6cfb6cea32c84d0c9c9fcca909059c29"
    "UPLOAD_POST_TOKEN|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFpQHRheDR1cy5jby5pbCIsImV4cCI6NDkxMDMxMzQyMywianRpIjoiNzNiNjRmMWEtNTUwZi00NTM2LTllYjAtYTg0ZTQyZGZiYjZiIn0.RIag1-h-_stB0EodyyG_DC6D25to335AWyQgQmY2aKs"
    "UPLOAD_POST_JWT|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFpQHRheDR1cy5jby5pbCIsImV4cCI6NDkxMDMxMzQyMywianRpIjoiNzNiNjRmMWEtNTUwZi00NTM2LTllYjAtYTg0ZTQyZGZiYjZiIn0.RIag1-h-_stB0EodyyG_DC6D25to335AWyQgQmY2aKs"
    "WORDPRESS_JWT_TOKEN|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFpQHRheDR1cy5jby5pbCIsImV4cCI6NDkxMDMxMzQyMywianRpIjoiNzNiNjRmMWEtNTUwZi00NTM2LTllYjAtYTg0ZTQyZGZiYjZiIn0.RIag1-h-_stB0EodyyG_DC6D25to335AWyQgQmY2aKs"
    "LINKEDIN_CLIENT_ID|867fvsh119usxe"
    "LINKEDIN_CLIENT_SECRET|WPL_AP1.Ga7TMFLKHV3xTwyM.DbkLfg=="
)

for pair in "${SECRETS[@]}"; do
    NAME="${pair%%|*}"
    VALUE="${pair#*|}"
    set_vercel_env "$NAME" "$VALUE"
    
    case "$NAME" in
        CAPTIVATE_API_KEY|AIRTABLE_TOKEN|OPENROUTER_API_KEY|TAVILY_API_KEY|CLAUDE_API_KEY|KIE_AI_API_KEY|GOOGLE_AI_STUDIO_KEY|SLACK_BOT_TOKEN)
            set_gh_secret "$NAME" "$VALUE"
            ;;
    esac
done

echo "Secret synchronization complete."
