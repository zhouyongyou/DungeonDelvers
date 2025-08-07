#\!/bin/bash

echo "🔧 Fixing all V25 addresses in subgraph.yaml..."

# Convert all addresses to lowercase and update
sed -i '' 's/0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468/0x539ac926c6dae898f2c843af8c59ff92b4b3b468/gI' subgraph.yaml
sed -i '' 's/0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a/0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a/gI' subgraph.yaml
sed -i '' 's/0x671d937b171e2ba2c4dc23c133b07e4449f283ef/0x671d937b171e2ba2c4dc23c133b07e4449f283ef/gI' subgraph.yaml
sed -i '' 's/address: "0x[^"]*"/address: "0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da"/g' subgraph.yaml | grep -A2 -B2 "Relic"
sed -i '' 's/0xa86749237d4631ad92ba859d0b0df4770f6147ba/0xa86749237d4631ad92ba859d0b0df4770f6147ba/gI' subgraph.yaml
sed -i '' 's/0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3/0x28a85d14e0f87d6ed04e21c30992df8b3e9434e3/gI' subgraph.yaml

echo "✅ All addresses fixed to lowercase"
