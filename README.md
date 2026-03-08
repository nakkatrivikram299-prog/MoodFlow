# VIKRAM Flow 🎵

> Type how you feel → AI detects your emotion → Spotify picks the perfect tracks

A fully offline-capable React Native mobile app built with Expo. No backend server. Everything runs on your phone — emotion detection uses a TensorFlow Lite model on-device, music comes from Spotify's recommendation API, and all your likes and history are saved in local storage.

---

## What It Does

```
You type how you feel
        ↓
TFLite model on your phone reads your words
        ↓
Detects emotion  (happy / sad / angry / calm / energetic / fearful / surprised / disgusted)
        ↓
Spotify API fetches 20 tracks that match the mood's audio profile
        ↓
Tap ❤️ to like tracks  →  future recommendations get personalised to your taste
        ↓
Tap "+ Load 20 more"  →  keeps fetching fresh tracks, skipping already-shown ones
```

---

## Features

| Feature | How it works |
|---|---|
| Emotion detection | TFLite LSTM model (GoEmotions dataset, ~10MB, runs on-device) |
| Music | Spotify Recommendations API — valence, energy, tempo, danceability |
| Personalisation | Liked tracks stored on phone → used as Spotify `seed_tracks` |
| Load More | Fetches 20 more tracks each time, skips already-shown, still personalised |
| Auth | Spotify PKCE — no backend, no client secret, fully mobile-safe |
| History | AsyncStorage — stored locally, never leaves your phone |
| Likes | AsyncStorage — survives app restarts, improves recommendations over time |

---

## Tech Stack

```
React Native 0.74  +  Expo 51  +  expo-router
TensorFlow.js  +  @tensorflow/tfjs-react-native  (on-device ML)
Spotify Web API  (Recommendations, Playback)
Spotify PKCE Auth  (expo-crypto  +  expo-secure-store  +  expo-linking)
@react-native-async-storage/async-storage  (likes, history, profile)
```

---

## Project Structure

```
vikram-flow-mobile/
├── app/
│   ├── _layout.tsx          ← Root layout + Spotify PKCE callback handler
│   └── tabs.tsx             ← 5-tab navigator, shared state between screens
│
├── src/
│   ├── screens/
│   │   ├── VoiceScreen.tsx        ← Text input → TFLite → Spotify fetch
│   │   ├── EmotionScreen.tsx      ← Animated confidence bars per emotion
│   │   ├── TracksScreen.tsx       ← Track list + ❤️ like + ➕ load more
│   │   ├── HistoryScreen.tsx      ← Full play history with liked indicators
│   │   ├── OnboardingScreen.tsx   ← Name entry + Spotify connect flow
│   │   └── SettingsScreen.tsx     ← Profile, Spotify status, clear data
│   │
│   ├── services/
│   │   ├── emotionEngine.ts       ← TFLite inference + keyword fallback
│   │   ├── spotifyAuth.ts         ← PKCE login, token refresh, SecureStore
│   │   ├── spotifyApi.ts          ← Recommendations, search, playback
│   │   └── localStorage.ts        ← Likes, history, user profile (AsyncStorage)
│   │
│   ├── hooks/
│   │   └── useAuth.ts             ← Combined auth context (local + Spotify)
│   │
│   ├── components/
│   │   └── index.tsx              ← Btn, Card, SL, Empty, Tag (shared UI)
│   │
│   └── theme/
│       └── index.ts               ← Colors, spacing, emotion color/emoji maps
│
├── assets/
│   └── models/                    ← TFLite model files (downloaded separately)
│
├── scripts/
│   └── downloadModel.js           ← One-time model downloader
│
├── app.json                       ← Expo config, deep link scheme
├── package.json
├── README.md                      ← This file
└── SETUP.md                       ← Legacy setup notes
```

---

## Setup — Step by Step

### Prerequisites

Before starting, make sure you have:

- A phone running **Android 8+** or **iPhone iOS 13+**
- A **computer** (Windows / Mac / Linux) with internet
- A **Spotify account** (free or premium — both work)

---

### Step 1 — Install Node.js

Node.js is needed to install packages and run the dev server.

**Check if you already have it:**
```bash
node --version
```
If you see `v18.0.0` or higher → skip to Step 2.

**Install it:**
1. Go to **nodejs.org**
2. Click the big green **LTS** button
3. Download and run the installer — keep all defaults
4. Reopen your terminal and run `node --version` to confirm

---

### Step 2 — Install packages

Open a terminal inside the `vikram-flow-mobile` folder:

```bash
# Windows: open the folder, click the address bar, type "cmd", press Enter
# Mac: open Terminal, type "cd " then drag the folder in, press Enter

npm install
```

This downloads all dependencies. Takes 2–5 minutes. Normal to see lots of text.

---

### Step 3 — Download the TFLite emotion model

```bash
npm run download-model
```

Downloads ~10MB of model files into `assets/models/`. Run once — never again.

> **If this fails:** The app still works using keyword-based fallback. You can try again later.

---

### Step 4 — Create a Spotify Developer App

This gives you a **Client ID** — the key that lets the app talk to Spotify's API.

1. Go to **developer.spotify.com**
2. Log in with your normal Spotify account
3. Click **Create App**
4. Fill in the form:

   | Field | What to enter |
   |---|---|
   | App name | `VIKRAM Flow` |
   | App description | `My emotion-based music app` |
   | Redirect URI | `vikramflow://callback` ← **must be exactly this** |
   | APIs used | Check **Web API** |

5. Tick the Terms of Service checkbox
6. Click **Save**

> ⚠️ The Redirect URI must be **exactly** `vikramflow://callback` — no capitals, no extra slash, no spaces. After typing it, click the **Add** button before saving.

---

### Step 5 — Copy your Client ID

1. After saving, click **Settings** on your app's page
2. Find **Client ID** — looks like: `a1b2c3d4e5f6789012345678abcdef01`
3. Copy it

> Do **not** copy the Client Secret. This app doesn't use it.

---

### Step 6 — Paste the Client ID into the app

Open this file in any text editor:

```
vikram-flow-mobile/src/services/spotifyAuth.ts
```

Find this line near the top:

```ts
export const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';
```

Replace it with your actual Client ID:

```ts
export const SPOTIFY_CLIENT_ID = 'a1b2c3d4e5f6789012345678abcdef01';
```

Save the file (`Ctrl+S` on Windows, `Cmd+S` on Mac).

---

### Step 7 — Install Expo Go on your phone

**Android:** Open Google Play Store → search **Expo Go** → install

**iPhone:** Open App Store → search **Expo Go** → install

> Your phone and computer must be on the **same WiFi network** for this to work.

---

### Step 8 — Run the app

```bash
npm start
```

A QR code appears in your terminal.

**Android:** Open Expo Go → tap **Scan QR Code** → point at the QR code

**iPhone:** Open your **Camera app** (not Expo Go) → point at the QR code → tap the notification

The app loads on your phone. First load takes ~30 seconds.

---

### Step 9 — First launch

When the app opens:

1. **Hero screen** → tap **Get Started →**
2. **Enter your name** → tap **Next →**
3. **Connect Spotify** → tap **Connect with Spotify**
   - Your browser opens Spotify's login page
   - Log in with your Spotify account
   - Tap **Agree** when Spotify asks for permissions
   - Browser closes and you're back in the app
4. **You're in.** Start using the app.

---

## All Commands — Quick Reference

```bash
# Install packages (once)
npm install

# Download TFLite model (once)
npm run download-model

# Start the app (every time)
npm start

# Start directly on Android (phone connected by USB)
npm run android

# Start directly on iOS (Mac + Xcode required)
npm run ios
```

---

## Using the App

### Mood Tab (✏️)
Type anything — how your day went, how you're feeling, what's on your mind. Tap **Analyse & Get Spotify Tracks**. Or tap one of the quick mood chips to pre-fill.

### Emotion Tab (🧠)
Shows the detected emotion with animated confidence bars for all 8 emotions. Tap any row to fetch tracks for that specific mood.

### Tracks Tab (🎵)
Your 20 Spotify tracks. Three actions per track:
- **Tap the track** → opens in Spotify app
- **Tap ❤️** → likes the track, saves to phone, improves future recommendations
- **Tap ➕ Load 20 more** → fetches 20 more personalised tracks, skips already-shown

### History Tab (📜)
Every track you've played. Liked tracks show a ❤️. Pull down to refresh.

### Settings Tab (⚙️)
Edit your name, check Spotify connection status, clear history, reset the app.

---

## How Personalisation Works

```
0 likes   →  Genre seeds only (general recommendations for the emotion)
1–2 likes →  Mix of liked track seeds + genre seeds
3+ likes  →  Strongly personalised — Spotify finds music similar to your actual taste
```

All likes are stored in `AsyncStorage` on your phone. They persist across sessions and improve every recommendation fetch — including the very first one when you type a new mood.

---

## Spotify Account — What Works on Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Get recommendations | ✅ | ✅ |
| Open track in Spotify app | ✅ | ✅ |
| In-app playback control | ❌ | ✅ |

---

## How Spotify PKCE Works (No Backend Needed)

```
Phone                                    Spotify
  │                                         │
  ├─ Generate code_verifier (random)         │
  ├─ Hash it → code_challenge                │
  ├─ Open browser with code_challenge ──────►│
  │                                   [User logs in]
  │◄── Redirect vikramflow://callback?code=XYZ ──┤
  ├─ Exchange code + original verifier ─────►│
  │◄── access_token + refresh_token ─────────┤
  │  (tokens saved in SecureStore on phone)  │
```

The `code_verifier` never leaves your phone. Spotify verifies the hash. No server, no client secret, completely secure.

---

## Troubleshooting

**"Not logged in to Spotify" or no tracks appear**
- Settings tab → tap Connect Spotify again
- Check your Client ID is correctly pasted in `spotifyAuth.ts`
- Check the Redirect URI in Spotify Dashboard is exactly `vikramflow://callback`

**QR code scan does nothing**
- Confirm phone and computer are on the same WiFi
- In terminal press `c` to clear cache
- Try: `npm start -- --tunnel`

**npm install fails**
- Check Node version: `node --version` (needs v18+)
- Delete `node_modules/` folder and run `npm install` again

**Spotify callback doesn't return to app**
- Redirect URI must be exactly `vikramflow://callback` in the Spotify Dashboard
- On Android, go back to the app manually — it may already be connected
- On iPhone, allow the browser to open the app when prompted

**No tracks after analysing mood**
- Spotify API needs internet — check mobile data or WiFi is on
- Token may have expired — Settings → disconnect and reconnect Spotify

---

## Data & Privacy

| Data | Where stored | Leaves device? |
|---|---|---|
| Your name | AsyncStorage (phone) | Never |
| Liked tracks | AsyncStorage (phone) | Never |
| Play history | AsyncStorage (phone) | Never |
| Spotify tokens | SecureStore (encrypted, phone) | Never |
| Your mood text | Not stored at all | Never |
| Emotion analysis | Runs on-device (TFLite) | Never |

The only data that leaves your phone is the Spotify API calls (to fetch recommendations and play tracks) and the one-time Spotify OAuth login.

---

## Dependencies

```json
{
  "expo": "~51.0.0",
  "expo-router": "~3.5.0",
  "expo-crypto": "~13.0.0",
  "expo-secure-store": "~13.0.0",
  "expo-linking": "~6.3.0",
  "expo-haptics": "~13.0.0",
  "@react-native-async-storage/async-storage": "1.23.1",
  "@tensorflow/tfjs": "^4.17.0",
  "@tensorflow/tfjs-react-native": "^0.8.0",
  "react-native": "0.74.0"
}
```
"# MoodFlow" 
