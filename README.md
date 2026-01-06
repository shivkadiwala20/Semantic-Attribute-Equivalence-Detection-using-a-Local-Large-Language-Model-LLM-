## Semantic Attribute Equivalence Detection (Local LLM)

Detects semantically equivalent attribute names across CSV/JSON datasets using a small, locally hosted LLM (Qwen 1.7B) and compares against a syntactic baseline (Levenshtein).

### Project Structure
```
.
├─ datasets/                 # Input CSVs (headers are attributes)
│  ├─ sample.csv
│  ├─ english.csv
│  ├─ mixed.csv
│  └─ large-dataset.csv
├─ ground_truth/             # Gold groups for evaluation
│  ├─ sample.truth.json
│  ├─ english.truth.json
│  ├─ mixed.truth.json
│  └─ large-dataset.truth.json
├─ outputs/                  # LLM, baseline, metrics, summaries
├─ src/
│  ├─ index.js               # Single-dataset evaluation pipeline
│  ├─ batch-evaluate.js      # Multi-dataset evaluation + summary
│  ├─ create-ground-truth.js # Ground truth template generator
│  ├─ llm.js                 # Basic / structured / context-aware prompts
│  ├─ llm-chunked.js         # Chunked processing for 50+ attributes
│  ├─ baseline.js            # Levenshtein baseline
│  ├─ extract.js             # CSV header extractor
│  ├─ normalize.js           # Lowercase + underscore removal
│  └─ evaluate.js            # Precision/Recall/F1 on grouped pairs
├─ EXPLANATION.md            # Detailed results explainer
├─ QUICK_REFERENCE.md        # Short presentation notes
├─ LARGE_DATASET_GUIDE.md    # Full large-dataset guide
├─ QUICK_START_LARGE_DATASETS.md
├─ LARGE_DATASET_INFO.md     # Info about the generated large dataset
├─ package.json
└─ package-lock.json
```

### Pipeline Diagram (Text)
```
CSV / JSON ──► Attribute Extractor ──► Prompt Builder ──► Local LLM (Qwen)
                                        │
                                        └──► Grouping Logic ──► JSON Groups ──► Evaluation (P/R/F1 vs ground truth)
Baseline (Levenshtein) ────────────────────────────────────────────────┘
```

### Prompt Configurations
- **Basic**: Minimal instructions (format fragile).
- **Structured**: Explicit JSON schema (best accuracy).
- **Context-aware**: Adds multilingual hints/examples.
- **Chunked variants** (for 50+ attributes): `llm-chunked.js` splits attributes into chunks, merges results.

### Prerequisites
- Node 18+
- Ollama running locally with `qwen3:1.7b` pulled
  - Start: `ollama serve`
  - Pull: `ollama pull qwen3:1.7b`

### Quick Start (small dataset)
```bash
node src/index.js datasets/sample.csv
```
Outputs go to `outputs/`:
- `llm.{mode}.{dataset}.json` (basic/structured/contextaware)
- `baseline.{dataset}.json`
- `metrics.{dataset}.json`

### Batch Mode (multi-dataset + summary)
```bash
# Process all CSVs in datasets/
node src/batch-evaluate.js

# Or specific files
node src/batch-evaluate.js datasets/english.csv datasets/mixed.csv
```
Generates `outputs/summary.json` with averages and timing.

### Large Datasets (50+ attributes)
1) Generate ground truth template:
```bash
node src/create-ground-truth.js datasets/large-dataset.csv
```
2) Edit `ground_truth/large-dataset.truth.json` to group equivalents.
3) Run evaluation (chunking handled automatically in `llm-chunked.js` when imported):
```bash
node src/batch-evaluate.js datasets/large-dataset.csv
```

### How Grouping Is Evaluated
- Groups are converted to pair sets.
- Precision/Recall/F1 are computed on pair overlap between prediction and ground truth.
- Baseline uses Levenshtein distance (threshold 3) on normalized attributes.

### Key Files to Read
- `src/index.js` — main evaluation flow.
- `src/llm.js` — prompts and JSON parsing safeguards.
- `src/llm-chunked.js` — chunking + merge strategy for big attribute lists.
- `LARGE_DATASET_GUIDE.md` — detailed large-scale instructions.

### Recommended Commands
- Single dataset: `node src/index.js datasets/sample.csv`
- Batch all: `node src/batch-evaluate.js`
- Create ground truth template: `node src/create-ground-truth.js datasets/your.csv`

### Notes
- All processing is local; no data leaves the machine.
- Normalization: lowercase, trims, removes `_` and `-` before grouping.
- If LLM returns invalid JSON, the run logs the raw output to help debug.

### Example Result (sample dataset)
```
Configuration              | Precision | Recall   | F1
------------------------------------------------------------
LLM (basic prompt)         | 0.00      | 0.00     | 0.00
LLM (structured prompt)    | 1.00      | 1.00     | 1.00
LLM (context-aware prompt) | 1.00      | 0.50     | 0.67
Baseline (edit distance)   | 1.00      | 0.50     | 0.67
```
