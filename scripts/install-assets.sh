#!/usr/bin/env bash
# Installs UI asset and map packages. npm/expo installs only. Run on the dev laptop, not by agents on the box.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== web =="
( cd frontend && npm install \
    maplibre-gl \
    lucide-react \
    @fontsource-variable/inter \
    motion \
    @tanstack/react-query @tanstack/react-table react-router-dom \
    openapi-fetch && \
  npm install -D openapi-typescript vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test @axe-core/playwright )

echo "== mobile (versions resolved by expo) =="
( cd apps/driver-mobile && npx expo install \
    @maplibre/maplibre-react-native \
    react-native-svg \
    lucide-react-native \
    expo-blur \
    @expo-google-fonts/inter expo-font \
    @tanstack/react-query \
    expo-dev-client && \
  npm install openapi-fetch )

echo "Add \"@maplibre/maplibre-react-native\" to expo.plugins in apps/driver-mobile/app.json, then: make android"
echo "Illustration (optional): download one SVG by hand from https://undraw.co into frontend/src/assets/illustrations/ (licence forbids scripted downloads)."
