# VIKRAM Flow — Complete Setup Guide

## What this app does (end to end)

```
You speak  →  Phone STT  →  TFLite emotion model  →  Spotify Recommendations  →  Tracks
 (voice)       (on-device)   (on-device, ~10MB)       (Spotify Web API, PKCE)
```

---

## Technology stack

| What               | Technology                                  | Needs internet? |
|--------------------|---------------------------------------------|-----------------|
| Voice → Text       | @react-native-voice/voice (Google/Apple STT)| Yes (briefly)   |
| Emotion detection  | TensorFlow Lite (GoEmotions LSTM model)     | No — on device  |
| Music              | Spotify Web API — Recommendations           | Yes             |
| Spotify Auth       | PKCE — no backend, no client secret         | Yes (once)      |
| History            | AsyncStorage — local on phone               | No              |

---

## Step 1 — Install dependencies

```bash
cd vikram-flow-mobile
npm install
```

---

## Step 2 — Download the TFLite emotion model (~10MB, one time)

```bash
npm run download-model
```

If the download fails, the app will use keyword fallback automatically.
You can also train your own model — see `scripts/train_emotion_model.py`.

---

## Step 3 — Set up your Spotify App (5 minutes, one time)

### 3a. Create the app

1. Go to https://developer.spotify.com/dashboard
2. Click **Create app**
3. Fill in:
   - **App name:** VIKRAM Flow
   - **Redirect URI:** `vikramflow://callback`  ← must be exactly this
   - **APIs used:** check "Web API"
4. Click **Save**

### 3b. Copy your Client ID

1. Click **Settings**
2. Copy the **Client ID** (looks like: `a1b2c3d4e5f6...`)

### 3c. Paste it into the app

Open `src/services/spotifyAuth.ts` and replace:

```ts
// BEFORE:
export const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';

// AFTER:
export const SPOTIFY_CLIENT_ID = 'a1b2c3d4e5f6...';   // ← your actual ID
```

> **Why no client secret?**
> This app uses Spotify's PKCE flow — designed for mobile apps.
> The phone generates a cryptographic proof instead of a secret.
> Your users' Spotify passwords are entered only on Spotify's own login page.

---

## Step 4 — Run the app

```bash
npm start
```

**Important:** @react-native-voice/voice requires a **native build**.
Expo Go will NOT work for voice. You need to use:

```bash
# Option A — Development build (recommended, free)
npx expo run:android       # USB-connected Android phone
npx expo run:ios           # Mac + Xcode required for iOS

# Option B — EAS Build (builds in the cloud, no Mac needed for Android)
npm install -g eas-cli
eas login
eas build --platform android --profile development
# Scan QR → install the .apk → run `npm start` → scan QR again
```

---

## Why Expo Go doesn't work for voice

Expo Go is a pre-built shell that can't include native modules like
`@react-native-voice/voice`. A development build is essentially your own
version of Expo Go that includes the voice module. It's a one-time 5-10
minute step.

---

## How the full voice flow works

```
1. You tap the 🎙️ mic button

2. @react-native-voice/voice calls:
   Android → Google Speech Recognition (on-device or cloud, depends on phone)
   iOS     → Apple Speech framework (on-device since iOS 13)

3. As you speak, words appear on screen in real-time (partial results)

4. 5 seconds of silence → auto-stops (or tap ⏹ to stop manually)

5. Final transcript confirmed → TFLite model runs locally:
   text → tokenize → int32[1,64] tensor → LSTM → float32[1,8] softmax

6. Top emotion identified → Spotify Recommendations API called:
   emotion → audio features (valence, energy, tempo, danceability)
   → 20 personalised tracks returned

7. App auto-navigates to Emotion tab, then Tracks tab
```

---

## Permissions the app asks for

| Permission                | Platform | Why                                      |
|---------------------------|----------|------------------------------------------|
| Microphone                | Both     | To hear your voice                       |
| Speech Recognition        | iOS      | To convert speech to text                |
| Internet                  | Android  | For Spotify API (emotion runs offline)   |

---

## First launch walkthrough

1. **Enter your name** → stored only on your phone
2. **Connect Spotify** → browser opens Spotify's login page → you log in → browser redirects back to the app with `vikramflow://callback`
3. You're in. Tap the mic and speak.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Voice unavailable" | Ensure Google app is installed (Android) / iOS 13+ |
| Spotify callback doesn't return to app | Verify redirect URI is exactly `vikramflow://callback` in Spotify dashboard |
| Model not loading | Run `npm run download-model` again, or the app falls back to keyword detection |
| Build fails on Android | Run `cd android && ./gradlew clean` then rebuild |
| Build fails on iOS | Run `cd ios && pod install` then rebuild |

---

## Project structure

```
vikram-flow-mobile/
├── app/
│   ├── _layout.tsx          ← Root + Spotify PKCE callback handler
│   └── tabs.tsx             ← Bottom tab navigator (5 tabs)
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.tsx   ← Name + Spotify connect
│   │   ├── VoiceScreen.tsx        ← 🎙️ VOICE → TFLite → Spotify (THIS FILE)
│   │   ├── EmotionScreen.tsx      ← Animated breakdown + refresh tracks
│   │   ├── TracksScreen.tsx       ← Real Spotify tracks + playback
│   │   ├── HistoryScreen.tsx      ← Local play history
│   │   └── SettingsScreen.tsx     ← Profile, Spotify status, data
│   ├── services/
│   │   ├── emotionEngine.ts       ← TFLite inference + keyword fallback
│   │   ├── spotifyAuth.ts         ← PKCE auth (no backend needed)
│   │   ├── spotifyApi.ts          ← Recommendations, search, playback
│   │   └── localStorage.ts        ← AsyncStorage (history, profile)
│   ├── hooks/useAuth.ts           ← Combined auth context
│   ├── components/index.tsx       ← Shared UI components
│   └── theme/index.ts             ← Design tokens
├── assets/models/                 ← TFLite model files (after download)
├── scripts/
│   └── downloadModel.js           ← One-time model downloader
└── SETUP.md                       ← This file
```
