# Setup & Installation Guide

## 📋 Prerequisites

### 1. Node.js Installation
- **Required**: Node.js 18 or higher
- Check version: `node --version`
- Download: https://nodejs.org/

### 2. Ollama Installation & Setup
- **Required**: Ollama with Qwen 1.7B model

#### Install Ollama:
```bash
# macOS
brew install ollama

# Or download from: https://ollama.ai
```

#### Start Ollama Service:
```bash
ollama serve
```

#### Pull Qwen Model:
```bash
ollama pull qwen3:1.7b
```

#### Verify Installation:
```bash
ollama list  # Should show qwen3:1.7b
```

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
npm install
```

This installs:
- `axios` - HTTP client for LLM API
- `csv-parser` - CSV file parsing
- `fast-levenshtein` - Edit distance calculation

### Step 2: Verify Ollama is Running
```bash
# In a separate terminal, start Ollama
ollama serve

# Verify it's running (should show API available)
curl http://localhost:11434/api/tags
```

### Step 3: Test with Sample Dataset
```bash
node src/index.js datasets/sample.csv
```

Expected output:
- Metrics table showing Precision/Recall/F1
- JSON files in `outputs/` folder
- Detailed comparison with ground truth

## 📁 Project Structure

```
.
├── datasets/              # CSV files (one per dataset)
├── ground_truth/         # Ground truth groupings (JSON)
├── outputs/              # Results (auto-generated)
├── src/                  # Source code
│   ├── index.js         # Main evaluation script
│   ├── batch-evaluate.js # Batch processing
│   ├── llm.js           # LLM prompts
│   ├── baseline.js      # Baseline method
│   └── evaluate.js      # Evaluation metrics
├── ui/                   # Web UI for visualization
└── README.md            # Main documentation
```

## 🔧 Troubleshooting

### Issue: "Cannot connect to Ollama"
**Solution:**
1. Make sure Ollama is running: `ollama serve`
2. Check if port 11434 is available
3. Verify model is installed: `ollama list`

### Issue: "Model not found"
**Solution:**
```bash
ollama pull qwen3:1.7b
```

### Issue: "Ground truth file not found"
**Solution:**
```bash
# Create ground truth template first
node src/create-ground-truth.js datasets/your-dataset.csv
# Then edit ground_truth/your-dataset.truth.json
```

### Issue: "Invalid JSON returned by LLM"
**Solution:**
- This happens when LLM output format is unexpected
- Check `outputs/llm.*.json` files to see raw output
- Try running again (LLM responses can vary)

## ✅ Verification Checklist

Before presentation, verify:

- [ ] Ollama is installed and running
- [ ] Qwen 1.7B model is pulled
- [ ] Dependencies installed (`npm install`)
- [ ] Sample dataset runs successfully
- [ ] Output files are generated
- [ ] UI opens and loads results

## 🎯 Quick Demo Flow

1. **Start Ollama** (in background terminal):
   ```bash
   ollama serve
   ```

2. **Run evaluation**:
   ```bash
   node src/index.js datasets/sample.csv
   ```

3. **Open UI**:
   ```bash
   open ui/index.html
   # Load outputs/metrics.sample.json
   ```

4. **Show results**:
   - Metrics comparison
   - Detailed pair analysis
   - Ground truth comparison

## 📝 Notes

- All processing is **local** - no data leaves your machine
- Large datasets may take 1-2 minutes per method
- UI works offline after loading JSON file
- Results are reproducible (same input = same output for baseline)
