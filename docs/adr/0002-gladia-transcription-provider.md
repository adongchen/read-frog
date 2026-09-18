# Gladia Decoupled Transcription Provider

When a user configures a Gladia API Key, the extension routes YouTube AI subtitle requests directly to Gladia's Pre-recorded v2 API via video URL, bypassing upstream account login and subscription quota gates. To protect personal API quota and prevent merge conflicts with upstream's database migrations, transcription results are persistently cached in a dedicated, isolated Dexie database (`ReadFrogCustomDB`), with automatic fallback to upstream official transcription when no Gladia key is configured.
