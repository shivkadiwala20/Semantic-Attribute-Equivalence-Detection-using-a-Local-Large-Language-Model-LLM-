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
├─ ui/                       # Web UI for visualizing results
│  ├─ index.html             # Main UI page
│  ├─ app.js                 # UI logic
│  └─ README.md              # UI documentation
├─ EXPLANATION.md            # Detailed results explainer
├─ QUICK_REFERENCE.md        # Short presentation notes
├─ LARGE_DATASET_GUIDE.md    # Full large-dataset guide
├─ QUICK_START_LARGE_DATASETS.md
├─ LARGE_DATASET_INFO.md     # Info about the generated large dataset
├─ package.json
└─ package-lock.json
```

### Pipeline Diagram (Text)
<img width="8192" height="5759" alt="image" src="https://github.com/user-attachments/assets/d1fcec55-d491-455f-a657-fa7fddce33c3" />

```

### Prompt Configurations
- **Basic**: Minimal instructions (format fragile).
- **Structured**: Explicit JSON schema (best accuracy).
- **Context-aware**: Adds multilingual hints/examples.
- **Chunked variants** (for 50+ attributes): `llm-chunked.js` splits attributes into chunks, merges results.

### Prerequisites

**Required:**
- Node.js 18+ ([Download](https://nodejs.org/))
- Ollama installed ([Download](https://ollama.ai))
- Qwen 3 1.7B model

**Quick Setup:**
```bash
# 1. Install dependencies
npm install

# 2. Start Ollama (in separate terminal)
ollama serve

# 3. Pull Qwen model
ollama pull qwen3:1.7b
```

📖 **Detailed setup instructions**: See [`SETUP.md`](SETUP.md)

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

### Visualizing Results (Web UI) 🌐

For better understanding, especially with large datasets:

```bash
# Open the UI in your browser
open ui/index.html
# Or navigate to ui/ folder and double-click index.html
```

Then load your metrics JSON file (e.g., `outputs/metrics.large-dataset.json`)

**Features:**
- 📈 Interactive charts comparing all methods
- 🔍 Search and filter large attribute lists  
- ✅ Visual comparison of correct/incorrect pairs
- 📋 Side-by-side predicted vs ground truth
- 🎨 Color-coded results for easy understanding

See `ui/README.md` for details.

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

## 📚 Documentation

- **Setup Guide**: [`SETUP.md`](SETUP.md) - Installation & troubleshooting
- **Presentation Guide**: [`PRESENTATION_CHECKLIST.md`](PRESENTATION_CHECKLIST.md) - Pre-presentation checklist
- **Results Explanation**: [`EXPLANATION.md`](EXPLANATION.md) - Understanding evaluation results
- **Large Dataset Guide**: [`LARGE_DATASET_GUIDE.md`](LARGE_DATASET_GUIDE.md) - Working with large datasets
- **Analysis**: [`WHY_BASIC_BETTER.md`](WHY_BASIC_BETTER.md) - Understanding unexpected results

## 🚀 Quick Demo

Run the demo script for a complete demonstration:

```bash
./demo.sh
```

Or manually:
```bash
# 1. Run evaluation
node src/index.js datasets/sample.csv

# 2. Open UI
open ui/index.html
# Load outputs/metrics.sample.json
```

## 👤 Author

Shiv Kadiwala  
M.Sc. Web Engineering  
Technische Universität Chemnitz

**Supervisors:**
- Prof. Dr. Michael Martin
- Florian Hahn
- Sara Todorovikj
