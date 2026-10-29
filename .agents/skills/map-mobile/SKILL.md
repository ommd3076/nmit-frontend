---
name: map-mobile
description: Use for the Live route map in the Android app.
---
# Map (mobile)

**Pick: `@maplibre/maplibre-react-native`.**
Why: same style URL and data as web (OpenFreeMap positron), no API key. react-native-maps uses Google Maps on Android and needs a Google Maps API key, a Google Cloud project, and per its docs a billing account; that's an account and spend we don't want for a hackathon.
Costs of the pick: not in Expo Go; needs a development build (`npx expo prebuild` + `npx expo run:android`). v11 supports the New Architecture only and Android API ≥ 23. Install with `npx expo install @maplibre/maplibre-react-native` and add it to `plugins` in app.json.
Solomon x/y: draw with `react-native-svg` instead of the map.
No location permission: the map shows planned stops only. No "you are here" dot until a GPS feature exists and its permission flow is designed.
Tile failure: show the ordered stop list full-height with a banner.
