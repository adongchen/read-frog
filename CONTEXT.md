# Read Frog Custom Context

Downstream personal customization fork of Read Frog, introducing enhanced subtitle segmentation and fork decoupling patterns.

## Language

### Subtitle Segmentation

**OptimizerMode**:
The active subtitle segmentation and line-balancing strategy (`enhanced` vs `original`).
_Avoid_: algorithmMode, segmentationType

**Enhanced**:
The multi-tiered pipeline optimizer featuring semantic macro sentence construction, leading transition phrase protection, balanced multi-tier long sentence splitting, and ASR word-level timestamp alignment.
_Avoid_: custom, pipeline-v2, advanced

**Original**:
The upstream author's double-pass buffer and greedy sliding-window subtitle optimizer (`optimizeSubtitlesOriginal`).
_Avoid_: classic, upstream, default, legacy

### AI Subtitles & Transcription

**TranscriptionProvider**:
The backend service responsible for converting video speech into subtitle tracks (`official` vs `gladia`).
_Avoid_: asrEngine, speechService

**GladiaProvider**:
The decoupled personal transcription provider utilizing Gladia's Pre-recorded v2 API directly via YouTube URL, bypassing upstream account entitlement and quota gates.
_Avoid_: customAsr, thirdPartyTranscription

**SentenceSegment**:
A semantic sentence unit returned by Gladia with start and end millisecond timestamps, adapted directly into Read Frog's `SubtitlesFragment` pipeline for downstream optimization and translation.
_Avoid_: utteranceChunk, audioBlock
