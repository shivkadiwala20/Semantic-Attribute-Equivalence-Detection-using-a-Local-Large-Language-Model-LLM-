#!/bin/bash

# Quick Demo Script for Presentation
# Run this to demonstrate the system end-to-end

echo "🚀 Semantic Attribute Equivalence Detection - Demo"
echo "=================================================="
echo ""

# Check if Ollama is running
echo "📋 Checking prerequisites..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Error: Ollama is not running!"
    echo "   Please start Ollama in another terminal: ollama serve"
    exit 1
fi

echo "✅ Ollama is running"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Step 1: Show sample dataset
echo "📊 Step 1: Sample Dataset"
echo "-------------------------"
echo "Dataset: datasets/sample.csv"
head -1 datasets/sample.csv
echo ""
echo "Attributes: $(head -1 datasets/sample.csv | tr ',' '\n' | wc -l | xargs)"
echo ""

# Step 2: Run evaluation
echo "🔍 Step 2: Running Evaluation..."
echo "---------------------------------"
echo "This may take 30-60 seconds..."
echo ""

node src/index.js datasets/sample.csv

# Step 3: Show results
echo ""
echo "📈 Step 3: Results Generated"
echo "----------------------------"
echo "Output files created in outputs/:"
ls -lh outputs/*.sample.json 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

# Step 4: Open UI
echo "🌐 Step 4: Opening Results Viewer..."
echo "-------------------------------------"
echo "Please load: outputs/metrics.sample.json"
echo ""

if command -v open > /dev/null; then
    open ui/index.html
elif command -v xdg-open > /dev/null; then
    xdg-open ui/index.html
else
    echo "Please open ui/index.html manually in your browser"
fi

echo ""
echo "✅ Demo complete!"
echo ""
echo "📝 Next steps:"
echo "   1. View results in the web UI"
echo "   2. Load outputs/metrics.sample.json"
echo "   3. Explore different methods using tabs"
echo ""
