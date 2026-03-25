#!/bin/bash
# TAX4US CLI Integration Setup
# Replaces unreliable MCPs with CLI tools

echo "🔧 Setting up CLI integrations for TAX4US..."

# 1. GitHub CLI setup
if ! command -v gh &> /dev/null; then
    echo "Installing GitHub CLI..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install gh
    else
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh
    fi
fi

# 2. Slack CLI alternative (using curl with tokens)
echo "Setting up Slack API curl wrapper..."
cat > scripts/slack-cli.sh << 'EOF'
#!/bin/bash
# Slack CLI wrapper using curl
SLACK_TOKEN="${SLACK_BOT_TOKEN}"
API_BASE="https://slack.com/api"

case "$1" in
    "post-message")
        curl -X POST "${API_BASE}/chat.postMessage" \
            -H "Authorization: Bearer ${SLACK_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"channel\":\"$2\",\"text\":\"$3\"}"
        ;;
    "list-channels")
        curl "${API_BASE}/conversations.list" \
            -H "Authorization: Bearer ${SLACK_TOKEN}"
        ;;
    *)
        echo "Usage: slack-cli.sh [post-message|list-channels] [args...]"
        ;;
esac
EOF

chmod +x scripts/slack-cli.sh

# 3. Airtable CLI alternative
echo "Setting up Airtable API wrapper..."
cat > scripts/airtable-cli.sh << 'EOF'
#!/bin/bash
# Airtable CLI wrapper using curl
AIRTABLE_TOKEN="${AIRTABLE_PERSONAL_ACCESS_TOKEN}"
API_BASE="https://api.airtable.com/v0"

case "$1" in
    "list-records")
        curl "${API_BASE}/$2/$3" \
            -H "Authorization: Bearer ${AIRTABLE_TOKEN}"
        ;;
    "create-record")
        curl -X POST "${API_BASE}/$2/$3" \
            -H "Authorization: Bearer ${AIRTABLE_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$4"
        ;;
    *)
        echo "Usage: airtable-cli.sh [list-records|create-record] [baseId] [tableId] [data?]"
        ;;
esac
EOF

chmod +x scripts/airtable-cli.sh

# 4. ElevenLabs CLI wrapper
echo "Setting up ElevenLabs API wrapper..."
cat > scripts/elevenlabs-cli.sh << 'EOF'
#!/bin/bash
# ElevenLabs CLI wrapper
ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY}"
API_BASE="https://api.elevenlabs.io/v1"

case "$1" in
    "generate-speech")
        voice_id="$2"
        text="$3"
        output_file="$4"
        
        curl -X POST "${API_BASE}/text-to-speech/${voice_id}" \
            -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"${text}\",\"model_id\":\"eleven_monolingual_v1\",\"voice_settings\":{\"stability\":0.75,\"similarity_boost\":0.75}}" \
            --output "${output_file}"
        ;;
    "list-voices")
        curl "${API_BASE}/voices" \
            -H "xi-api-key: ${ELEVENLABS_API_KEY}"
        ;;
    *)
        echo "Usage: elevenlabs-cli.sh [generate-speech|list-voices] [args...]"
        ;;
esac
EOF

chmod +x scripts/elevenlabs-cli.sh

echo "✅ CLI integrations setup complete!"
echo "📋 Next steps:"
echo "1. Run: gh auth login (for GitHub)"
echo "2. Update .env.local with proper API tokens"
echo "3. Test integrations: npm run test-cli-integrations"