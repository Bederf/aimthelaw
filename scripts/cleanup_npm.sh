#!/bin/bash
# Script to safely clean up npm dependencies

echo "==== NPM Dependencies Cleanup ===="
echo "This script will help clean up unused dependencies from your frontend project."
echo ""

# Create a backup of the current package.json
echo "Creating package.json backup..."
cp package.json package.json.backup

# First, let's address the missing dependencies reported by depcheck
echo "Adding missing dependencies reported by depcheck..."

# Install missing packages
npm install @radix-ui/react-icons --save
npm install @typescript-eslint/eslint-plugin @typescript-eslint/parser --save-dev
npm install dotenv --save-dev

# Now, let's identify potential duplicate toast libraries
if grep -q "\"react-hot-toast\"" package.json && grep -q "\"sonner\"" package.json; then
  echo ""
  echo "Duplicate toast libraries detected:"
  echo "1. react-hot-toast"
  echo "2. sonner"
  echo ""
  echo "Which one would you like to keep? (1/2/both)"
  read -r answer
  
  if [ "$answer" = "1" ]; then
    npm uninstall sonner --save
    echo "Removed sonner, keeping react-hot-toast"
  elif [ "$answer" = "2" ]; then
    npm uninstall react-hot-toast --save
    echo "Removed react-hot-toast, keeping sonner"
  else
    echo "Keeping both toast libraries"
  fi
fi

# Clean npm cache
echo ""
echo "Cleaning npm cache..."
npm cache clean --force

# Run npm dedupe to consolidate dependencies
echo ""
echo "Deduplicating dependencies..."
npm dedupe

# Optional: Run an audit and fix security issues
echo ""
echo "Running security audit..."
npm audit
echo ""
echo "Would you like to run 'npm audit fix' to address security issues? (y/n)"
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  npm audit fix
fi

echo ""
echo "==== Cleanup Complete ===="
echo "Next steps:"
echo "1. Run 'npm run build' to verify everything still works"
echo "2. Compare package.json with package.json.backup to verify changes"
echo "3. Consider running 'npm prune' to remove extraneous packages" 