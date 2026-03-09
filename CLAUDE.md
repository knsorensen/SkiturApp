# CLAUDE.md — SkiturApp

## Project Overview

SkiturApp is a React Native (Expo SDK 55) mobile app for organizing ski touring trips. Built with TypeScript, Firebase backend, and Zustand state management. Target: private friend group (20-100 users).

## Tech Stack

- **Framework:** React Native with Expo (managed workflow, SDK 55)
- **Language:** TypeScript (strict mode)
- **State:** Zustand stores (auth, trip, location, sync, theme)
- **Navigation:** React Navigation (bottom tabs + stack navigators)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Maps:** react-native-maps (terrain view, native) + web stub (maps unavailable on web)
- **Offline:** SQLite for GPS tracks, Firestore persistence, photo upload queue
- **Weather:** MET Norway API (api.met.no)
- **i18n:** Custom Zustand-based with Norwegian (bokmål) as primary, English secondary

## Project Structure

```
src/
├── app/                    # Screens
│   ├── auth/               # SignIn, SignUp
│   ├── tabs/               # Home, Map, Trips, Profile
│   └── trip/               # CreateTrip, TripDetail, TripChat, TripPhotos, ShoppingList, TripArchive
├── components/
│   ├── common/             # Button, Input, SyncStatusBar, UserAvatar
│   ├── map/                # TripMap, TrackingControls, LocationPicker
│   ├── photos/             # PhotoGallery, PhotoViewer, CaptureButton
│   ├── trip/               # TripCard, ElevationProfile
│   └── weather/            # WeatherWidget
├── hooks/                  # useTrips, useLocation, usePhotos, useShopping, useWeather, useTheme
├── i18n/                   # Translations (nb, en)
├── navigation/             # AuthNavigator, MainNavigator, TripsNavigator
├── services/               # Firebase services, tracking, photo queue, network monitor
├── stores/                 # Zustand stores (auth, trip, location, sync, theme)
├── types/                  # TypeScript interfaces
├── utils/                  # geoUtils, dateUtils
└── __tests__/              # Unit tests
```

## Key Commands

```bash
npx expo start              # Start dev server
npx expo start --web        # Start web version (maps show placeholder)
npx expo start --tunnel     # Start with tunnel (test on phone from VM/remote)
npx expo run:android        # Build and run on Android device
npx expo run:ios            # Build and run on iOS (Mac + Xcode required)
npm test                    # Run unit tests (Jest + ts-jest)
npx tsc --noEmit            # TypeScript type check
npm run lint                # ESLint
npm run format              # Prettier
npm run deploy              # Deploy dist/ to Cloudflare Pages
npm run build:deploy        # Build web + deploy in one step
```

## Firebase

- **Project:** skiturapp-94a50
- **Config:** `src/services/firebase.ts`
- **Rules:** `firebase/firestore.rules`, `firebase/storage.rules`
- **Storage paths:** `users/{uid}/` (profile photos), `trips/{id}/photos/`, `trips/{id}/chat/`
- **Firestore collections:** users, trips, trips/{id}/route, trips/{id}/photos, trips/{id}/messages, trips/{id}/shoppingList, trips/{id}/tripInvites, invites

## Development Guidelines

- UI text is in Norwegian bokmål by default. Use the i18n system (`useTranslation()` hook) for new user-facing strings.
- Use `COLORS` from constants for styling. For dark mode support, use `useTheme()` hook instead.
- Zustand for state management — no Redux, no Context API for global state.
- Background GPS tracking uses expo-location + expo-task-manager. Track points are buffered in SQLite and batch-synced to Firestore every 30 seconds.
- Photos are queued locally via `photoQueue.ts` for offline resilience.
- Weather API requires proper User-Agent header per MET Norway terms.
- **Web support:** `metro.config.js` aliases `react-native-maps` to `react-native-maps.web.js` (a stub) on web. Map screens show a placeholder. Other features work normally.

## Phase Status

- Phase 1-7: Complete (Foundation, Trips, Maps, Photos, Chat, Weather, Shopping/History)
- Phase 8: Mostly done (offline sync, dark mode, i18n). Missing: Mapbox offline tiles, animations.
- Phase 9: Started (Jest tests). Remaining: E2E tests, beta testing, app store submission.
