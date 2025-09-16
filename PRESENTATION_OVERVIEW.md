# Text-to-Video MVC Presentation Overview

## 1. Executive Summary
A Minimum Viable Candidate (MVC) system that converts domain‑specific text into narrated, scene‑based MP4 videos with optional subtitles. It demonstrates an end‑to‑end AI media pipeline: text parsing, optional speech synthesis (graceful fallback), image scene generation (diffusion), composition, and RESTful delivery.

## 2. Core Value Proposition
- Rapid repurposing of institutional or educational text into engaging video micro‑content.
- Parameter control (tone, domain, environment) for contextual relevance.
- Extensible modular design (swap models, add music, avatars, multilingual, analytics).

## 3. Architecture (High Level)
```
Client (HTML Demo / Future Portal)
        |
 Flask REST API
        |
  VideoGenerationAPI (Facade)
        |
  TextToVideoGenerator (Orchestrator)
  ├── TextProcessor (segmentation, keyword extraction)
  ├── AudioGenerator (TTS or silent fallback)
  ├── VisualGenerator (Diffusers text→image per segment)
  ├── SubtitleGenerator (SRT timing)
  └── VideoComposer (MoviePy assembly, metrics)
        |
   Outputs (MP4, SRT, JSON metrics)
```

## 4. Key Components & Models
| Component | Library / Model | Purpose |
|-----------|-----------------|---------|
| Text segmentation | HuggingFace Tokenizer (all-MiniLM-L6-v2) | Sentence/token utility |
| Concept extraction | Regex heuristic | Future: KeyBERT / NER |
| Image generation | `rupeshs/LCM-runwayml-stable-diffusion-v1-5` (Diffusers) | Fast low-step latent diffusion (LCM) |
| Audio narration | Coqui TTS (optional) | Natural speech; falls back to silent WAV |
| Subtitles | Custom SRT builder | Timed to narration duration |
| Video assembly | MoviePy + ffmpeg | Concatenate scenes, mix audio |
| Metrics | psutil + torch | Memory, GPU, timing |

## 5. Implemented Features
- Text → multi‑scene visual narrative (one image per segment)
- Adjustable: tone, domain, environment, duration, fps, subtitles, bg music flag
- REST API endpoints (generate, status, download, metrics, demos)
- Demo web UI (static) using relative resource paths
- Job queue via background threads with UUID tracking
- Silent audio fallback (robust on environments lacking TTS wheels)
- Basic cost estimation + performance metrics object

## 6. Current Limitations (Transparent Disclosure)
- One image per segment (no intra‑scene motion)
- Background music not yet implemented (stub)
- Subtitles not visually burned-in (SRT only)
- No persistence/database; jobs in-memory only
- No auth/rate limiting (prototype scope)
- First-request cold start: diffusion + model downloads
- English-focused; multilingual requires model swap & alignment

## 7. Performance & Latency (Observed / Expected)
| Stage | Description | Typical (Warm) | Notes |
|-------|-------------|----------------|-------|
| Cold model load | Diffusion pipeline + weights | 20–120s (once) | Cached after first run |
| Text segmentation | String ops | <50ms | Linear in sentence count |
| Audio generation (TTS) | Coqui medium model | 3–8s / 30s narration | Silent fallback ~5ms |
| Image generation (LCM 1 step) | 1920x1080 per segment | 0.8–1.5s each (GPU) | CPU slower (3–5s) |
| Video composition | Image → MP4 mux | 2–6s | Scales with segments & resolution |
| Total (warm, 30s text, 5 segments) | End-to-end | ~10–18s GPU | Without TTS ~6–10s |

(Replace with live benchmark numbers using `benchmark_script.py` before presentation.)

## 8. Benchmark Procedure
1. Warm-up: run one generation to cache models.
2. Run `python benchmark_script.py "<sample text>"`.
3. Capture: total wall time, per-stage logs, GPU memory (nvidia-smi) snapshot.
4. Repeat 3×; report mean & std dev.

## 9. API Surface (Primary Endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | UI or API index |
| GET | /health | Liveness probe |
| POST | /api/generate-video | Submit generation request |
| GET | /api/job-status/<job_id> | Poll job state |
| GET | /api/download-video/<job_id> | Download MP4 |
| GET | /api/available-options | Enumerate enums |
| GET | /api/jobs | List all jobs |
| DELETE | /api/job/<job_id> | Remove job & file |
| POST | /api/demo | Launch predefined example |
| GET | /api/metrics | System + job metrics |
| GET | /outputs/<file> | Direct asset serving |

## 10. Data Flow (Detailed)
1. Receive JSON: { text, tone, domain, environment, duration, ... }
2. Segment text -> segments list
3. (Optional) TTS → narration.wav (silent fallback ensures continuity)
4. For each segment: diffusion prompt assembly -> image_i.png
5. (Optional) Subtitles: segment timing -> captions.srt
6. Compose: sequence images + audio -> video.mp4 + metrics
7. Store: Move MP4 to outputs and update job record
8. Client polls until status == completed; downloads video & metrics.

## 11. Reliability & Resilience
- Try/except around each major stage logs failures
- Fallback image creation on diffusion error
- Silent audio fallback on TTS failure
- Threaded jobs isolate failures per request
- Metrics capture resource pressure (potential autoscale triggers)

## 12. Security & Privacy (Prototype Level)
- No user auth; recommend API key or JWT for production
- No PII stored; transient text kept in-memory only
- Add request size limits (MAX_CONTENT_LENGTH already enforced)
- Suggest logging sanitization & HTTPS (via ngrok or reverse proxy)

## 13. Scalability Path
Short term:
- Replace threads with task queue (Redis + RQ/Celery)
- Add caching of frequent prompts/images
Medium term:
- Horizontal scale API pods + shared object storage (S3/MinIO)
- Add streaming progress events (WebSocket/SSE)
Long term:
- Multi-stage generative refinement (storyboard → motion → avatar)
- Vector store for semantic retrieval augmentation

## 14. Roadmap (Next 6 Milestones)
1. Background music generator integration
2. Burn-in subtitles (FFmpeg filter or MoviePy composite)
3. Persistent metadata store (SQLite/Postgres)
4. Auth + simple usage quota
5. Multi-language TTS & prompt localization
6. Scene transition templates & lightweight motion (Ken Burns / panning)

## 15. Risk & Mitigation Snapshot
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cold start latency | User drop-off | Pre-warm models; persistent worker |
| GPU unavailability | Slow generation | Graceful warnings + lower resolution fallback |
| Diffusion failure | Broken video | Fallback solid-color frames |
| TTS model mismatch (Py 3.12) | No narration | Silent audio fallback (already) |
| Memory pressure | OOM kills | Monitor metrics + cap concurrency |

## 16. Demo Script (Suggested Flow)
1. Open root URL (UI loads) – explain modular pipeline.
2. Show /health JSON for readiness.
3. Trigger /api/demo (or load demo button) – show queued → processing.
4. While processing, explain architecture diagram.
5. On completion: play MP4, discuss metrics (inference_time, memory_usage).
6. (Optional) Show a forced failure by temporarily removing internet (illustrate fallback).
7. Conclude with roadmap + scalability plan.

## 17. Talking Points Cheat Sheet
- "End-to-end modular pipeline; each component swappable."
- "Latency optimized via low-step LCM diffusion; warm runs < ~15s for 30s narrative."
- "Resilience: multiple graceful fallbacks prevent hard failure paths."
- "Extensibility: clear insertion points for music, avatar, multilingual."
- "Production readiness path defined (queue, persistence, auth)."

## 18. Quick Metrics Extraction Code
```python
from text_to_video_system import TextToVideoGenerator, VideoConfig, Tone, Domain, Environment
import time
sample = "Your sample text for benchmarking." * 3
cfg = VideoConfig(tone=Tone.FORMAL, domain=Domain.EDUCATION, environment=Environment.STUDIO, duration=20)
start = time.time()
video, metrics = TextToVideoGenerator().generate_video(sample, cfg)
print("Wall time:", time.time()-start, metrics)
```

## 19. Licensing & Compliance (Placeholder)
- Ensure model licenses (Stable Diffusion variant, HuggingFace models) are compatible with intended use.
- Add explicit LICENSE file before public distribution.

## 20. Appendix: Improvement Ideas
- Semantic scene planning (LLM prompt decomposition)
- Reinforcement learning for scene selection quality
- Progressive rendering pipeline (low-res → upscale)
- Real-time preview frames streaming during generation

---
Prepared for Selection Committee – Version 1.0
