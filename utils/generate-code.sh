#!/bin/bash
# Quick code generation using local LLM with project standards

# Ensure we're in the project directory
cd "$(dirname "$0")/.." || exit 1

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "⚠️  Starting Ollama service..."
    brew services start ollama
    sleep 2
fi

# Check if CodeLlama is installed
if ! ollama list | grep -q "codellama:70b"; then
    echo "📦 CodeLlama 70B not found. Installing..."
    echo "This will download ~38GB. Continue? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        ollama pull codellama:70b
    else
        echo "❌ CodeLlama required for code generation."
        exit 1
    fi
fi

# Run the TypeScript code generator
npx tsx utils/code-generator.ts "$@"