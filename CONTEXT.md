# Read Frog Custom Context

Downstream personal customization fork of Read Frog, introducing enhanced subtitle segmentation and fork decoupling patterns.

## Language

### Translation Provider Selection

**PageTranslation**:
The bilingual translation of content in the current webpage. It excludes selection translation, input translation, and Translation Hub.
_Avoid_: webpage translation when referring to every translation feature available on a webpage

**TranslationProviderConfig**:
A selectable translation backend configuration with its own identity and connection or model settings. Multiple configurations may use the same provider type while remaining distinct choices.
_Avoid_: vendor, model, translation service

**FeatureProviderSelection**:
The globally selected translation provider configuration for one translation feature. Page translation and video subtitle translation have independent selections, and changing either selection has the same runtime meaning regardless of whether it originates from the Popup or a shortcut.
_Avoid_: global provider, active vendor

**ProviderCycle**:
The ordered, wrapping traversal of the translation provider configurations shown in a feature's Popup selector. The current item keeps its position even when disabled, while traversal skips disabled items as destinations; cycling changes the feature's global provider selection even when the feature is not currently running and does not maintain a separate shortcut-only list.
_Avoid_: provider playlist, shortcut provider list

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

### Subtitle Positioning

**ControlsAvoidance**:
The mechanism where subtitle overlays and control shells dynamically calculate vertical offsets based on host player controls visibility (`.ytp-chrome-bottom`, `ytp-autohide`).
_Avoid_: dynamicShift, controlsFloat

**StaticPositioning**:
The decoupled positioning policy where subtitle coordinates ignore host player controls visibility entirely, fixing subtitle coordinates strictly to user-configured percentage offsets.
_Avoid_: fixedSubtitles, nonMoving
