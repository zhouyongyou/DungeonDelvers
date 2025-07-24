#!/bin/bash

# Deploy V19 Subgraph

echo "🚀 Deploying V19 subgraph to The Graph Studio..."
echo ""
echo "Please make sure you have:"
echo "1. The Graph Studio access token set as GRAPH_ACCESS_TOKEN"
echo "2. The correct deployment label (e.g., v19.0.0)"
echo ""

# Check if GRAPH_ACCESS_TOKEN is set
if [ -z "$GRAPH_ACCESS_TOKEN" ]; then
    echo "❌ Error: GRAPH_ACCESS_TOKEN not set"
    echo "Please set your Graph Studio access token:"
    echo "export GRAPH_ACCESS_TOKEN=your_token_here"
    exit 1
fi

# Run the deployment
echo "📦 Building subgraph..."
npm run build

echo ""
echo "📤 Deploying to The Graph Studio..."
echo "You will be prompted for a version label (e.g., v19.0.0)"
echo ""

graph deploy dungeon-delvers --access-token $GRAPH_ACCESS_TOKEN --node https://api.studio.thegraph.com/deploy/

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Check your subgraph at:"
echo "https://thegraph.com/studio/subgraph/dungeon-delvers/"