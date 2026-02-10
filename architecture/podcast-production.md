# Podcast Production SOP

**Goal:** Convert approved article text into a high-quality audio podcast episode.
**Tools:** ElevenLabs (Voice Synthesis), Captivate.fm (Hosting/Distribution).

## 1. Script Generation
- **Input:** Article Content (Text).
- **Process:**
  - Send to Claude with prompt: "Convert this article into a 3-5 minute solo podcast script. Host name: 'The Tax4Us Team'. Tone: Conversational, helpful, clear. Avoid complex jargon unless explained."
  - **Output:** Script string.

## 2. Voice Synthesis
- **Input:** Script string.
- **Tools:** ElevenLabs API.
- **Voice ID:** `ZT9u07TYPVl83ejeLakq` (or from env `ELEVENLABS_VOICE_ID`).
- **Model:** `eleven_monolingual_v1` (or `eleven_multilingual_v2`).
- **Process:**
  - Chunk script if > 5000 chars (though 150 words is usually short).
  - Call `text-to-speech` endpoint.
  - **Output:** Buffer (MP3 audio).

## 3. Deployment
- **Input:** Audio Buffer, Title, Show Notes (Summary).
- **Tools:** Captivate.fm API.
- **Process:**
  - Upload media file to Captivate (returns ID).
  - Create episode metadata (Title, Show ID, Media ID, Date).
  - Publish (Status: Active).
  - **Output:** Episode URL (Public Link).

## Error Handling
- logic: Retry ElevenLabs calls 3 times with exponential backoff on 429/500 errors.
- logic: If Captivate upload fails, log error and alert admin, but do not block social publishing.
