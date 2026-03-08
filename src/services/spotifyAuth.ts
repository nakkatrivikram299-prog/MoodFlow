// src/services/spotifyAuth.ts
// ─────────────────────────────────────────────────────────────────────────────
// SPOTIFY PKCE FLOW — no backend server required.
//
// PKCE (Proof Key for Code Exchange) is Spotify's official auth method for
// mobile apps. The client secret is NEVER used. Everything happens on device.
//
// Flow:
//   1. Generate cryptographic code_verifier + code_challenge on device
//   2. Open Spotify login in phone browser
//   3. Spotify redirects back to the app via deep link (vikramflow://callback)
//   4. Exchange auth code + verifier for access/refresh tokens
//   5. Store tokens in SecureStore (encrypted on-device)
//   6. Auto-refresh when expired
//
// SETUP (one-time):
//   1. Go to developer.spotify.com → create an app
//   2. Add redirect URI: vikramflow://callback
//   3. Copy your Client ID into SPOTIFY_CLIENT_ID below
//   4. No client secret needed — PKCE is secretless
// ─────────────────────────────────────────────────────────────────────────────

import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── ⚠️ SET YOUR SPOTIFY CLIENT ID HERE ──────────────────────────────────────
// Get it from developer.spotify.com → Your App → Settings
export const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';

const REDIRECT_URI     = 'vikramflow://callback';
const SCOPES           = [
  'user-read-private',
  'user-read-email',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
  'streaming',
].join(' ');

const AUTH_ENDPOINT  = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

const KEYS = {
  accessToken:  'sp_access_token',
  refreshToken: 'sp_refresh_token',
  expiresAt:    'sp_expires_at',
  codeVerifier: 'sp_code_verifier',
  profile:      'sp_profile',
};

// ── PKCE helpers ──────────────────────────────────────────────────────────────
async function generateCodeVerifier(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── Token storage ─────────────────────────────────────────────────────────────
async function saveTokens(access: string, refresh: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  await SecureStore.setItemAsync(KEYS.accessToken, access);
  await SecureStore.setItemAsync(KEYS.refreshToken, refresh);
  await AsyncStorage.setItem(KEYS.expiresAt, String(expiresAt));
}

async function getStoredTokens() {
  const [access, refresh, expiresAtStr] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken).catch(() => null),
    SecureStore.getItemAsync(KEYS.refreshToken).catch(() => null),
    AsyncStorage.getItem(KEYS.expiresAt).catch(() => null),
  ]);
  return {
    access: access || null,
    refresh: refresh || null,
    expiresAt: expiresAtStr ? Number(expiresAtStr) : 0,
  };
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken).catch(() => {}),
    SecureStore.deleteItemAsync(KEYS.refreshToken).catch(() => {}),
    AsyncStorage.removeItem(KEYS.expiresAt),
    AsyncStorage.removeItem(KEYS.profile),
  ]);
}

// ── Auth initiation ───────────────────────────────────────────────────────────
export async function startSpotifyLogin(): Promise<void> {
  const verifier   = await generateCodeVerifier();
  const challenge  = await generateCodeChallenge(verifier);
  // Store verifier to use during callback
  await SecureStore.setItemAsync(KEYS.codeVerifier, verifier);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             SPOTIFY_CLIENT_ID,
    scope:                 SCOPES,
    redirect_uri:          REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
    show_dialog:           'true',
  });

  await Linking.openURL(`${AUTH_ENDPOINT}?${params.toString()}`);
}

// ── Callback handler (call from app deep link handler) ───────────────────────
export async function handleSpotifyCallback(url: string): Promise<boolean> {
  const { queryParams } = Linking.parse(url);
  const code  = queryParams?.code as string | undefined;
  const error = queryParams?.error as string | undefined;

  if (error || !code) return false;

  const verifier = await SecureStore.getItemAsync(KEYS.codeVerifier).catch(() => null);
  if (!verifier) return false;

  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     SPOTIFY_CLIENT_ID,
      code_verifier: verifier,
    });

    const res = await fetch(TOKEN_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) return false;
    const data = await res.json();

    await saveTokens(data.access_token, data.refresh_token, data.expires_in);
    await SecureStore.deleteItemAsync(KEYS.codeVerifier).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// ── Get valid access token (auto-refreshes) ───────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
  const { access, refresh, expiresAt } = await getStoredTokens();

  // Still valid (with 60s buffer)
  if (access && expiresAt > Date.now() + 60_000) return access;

  // Refresh
  if (!refresh) return null;

  try {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refresh,
      client_id:     SPOTIFY_CLIENT_ID,
    });

    const res = await fetch(TOKEN_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) { await clearTokens(); return null; }
    const data = await res.json();

    await saveTokens(
      data.access_token,
      data.refresh_token || refresh,
      data.expires_in,
    );
    return data.access_token;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}
