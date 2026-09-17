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
