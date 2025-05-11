#!/bin/bash
echo "Cleaning dist directory..."
rm -rf dist
mkdir -p dist

echo "Building server..."
npm run build-server

echo "Build completed!" 