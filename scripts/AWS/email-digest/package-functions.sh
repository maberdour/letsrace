#!/bin/bash
# Package Lambda functions for deployment
# Usage: ./package-functions.sh

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "📦 Packaging Lambda functions..."
echo ""

# Functions to package
FUNCTIONS=("subscribe" "unsubscribe" "preview-digest" "test-digest" "run-digest-now" "run-digest")

# Clean up old zip files
echo "🧹 Cleaning up old zip files..."
rm -f *.zip

# Package each function
for func in "${FUNCTIONS[@]}"; do
  echo "📦 Packaging $func..."
  
  if [ ! -f "${func}.js" ]; then
    echo "❌ Error: ${func}.js not found!"
    exit 1
  fi
  
  # Create zip file
  # Special case: run-digest-now requires run-digest.js
  if [ "$func" = "run-digest-now" ]; then
    if [ -f "run-digest.js" ]; then
      zip -r "${func}.zip" "${func}.js" run-digest.js shared/ node_modules/ \
        -x "*.DS_Store" "*.git*" "*__MACOSX*" "*.zip" "*.md" "*.sh"
    else
      echo "⚠️  Warning: run-digest.js not found, but required by run-digest-now"
      zip -r "${func}.zip" "${func}.js" shared/ node_modules/ \
        -x "*.DS_Store" "*.git*" "*__MACOSX*" "*.zip" "*.md" "*.sh"
    fi
  else
    zip -r "${func}.zip" "${func}.js" shared/ node_modules/ \
      -x "*.DS_Store" "*.git*" "*__MACOSX*" "*.zip" "*.md" "*.sh"
  fi
  
  # Check if zip was created successfully
  if [ -f "${func}.zip" ]; then
    SIZE=$(du -h "${func}.zip" | cut -f1)
    echo "✅ Created ${func}.zip (${SIZE})"
  else
    echo "❌ Error: Failed to create ${func}.zip"
    exit 1
  fi
  
  echo ""
done

echo "✅ All functions packaged successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Upload each .zip file to its corresponding Lambda function in AWS Console"
echo "2. Or use AWS CLI to update functions:"
echo ""
for func in "${FUNCTIONS[@]}"; do
  echo "   aws lambda update-function-code \\"
  echo "     --function-name letsrace-${func} \\"
  echo "     --zip-file fileb://${func}.zip"
  echo ""
done

