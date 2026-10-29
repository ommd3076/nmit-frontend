---
name: driver-android-expo
description: Use for apps/driver-mobile (Expo, Android).
---
# Driver app (Expo, Android)

- If `apps/driver-mobile` doesn't exist: `npx create-expo-app@latest apps/driver-mobile --template blank-typescript`, pin the exact `expo` version, then install only with `npx expo install`.
- **"Android CLI" here means Expo's local tooling, no account:** `npx expo prebuild --platform android` generates `android/`; `npx expo run:android` builds and installs on an emulator or USB phone (needs Android Studio SDK + JDK 17). `eas build --local` also works but the EAS CLI asks you to log in; not needed. Expo Go can't run MapLibre, so use the dev build.
- Tabs: Today, Live route, Loads, Profile. Dock checklist lives under Loads.
- Driver endpoints don't exist today. Every driver screen uses fixtures and shows "Preview" unless the optional phase D (backend change, team approval) adds them.
- No permissions (location, camera, notifications) until a feature needs one.
- `npx expo export --platform android` proves bundling only.
