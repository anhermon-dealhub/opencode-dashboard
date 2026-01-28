#!/bin/sh

# Setup script for opencode-dashboard development environment

echo "🚀 Setting up opencode-dashboard development environment..."

# Install git hooks
echo "📋 Configuring git hooks..."
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit

echo "✅ Git hooks configured!"
echo "   - Pre-commit hook will run tests before each commit"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo "✅ Dependencies installed!"

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
bun test

if [ $? -ne 0 ]; then
  echo "⚠️  Tests failed! Check your setup."
  exit 1
fi

echo ""
echo "🎉 Setup complete! You're ready to develop!"
echo ""
echo "Available commands:"
echo "  task dev              - Run development server with hot reload"
echo "  task test             - Run tests"
echo "  task test:coverage    - Run tests with coverage"
echo "  task build            - Build production bundle"
echo "  task ci               - Run all CI checks"
echo ""
