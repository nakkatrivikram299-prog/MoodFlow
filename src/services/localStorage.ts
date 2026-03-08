// src/services/localStorage.ts
// Stores everything on the phone — no backend needed.

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'vf_history_v2';
const USER_KEY    = 'vf_user_v1';
const LIKES_KEY   = 'vf_likes_v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  trackId: string;
  trackName: string;
  trackArtist: string;
  trackUri: string;
  emotion: string;
  liked: boolean;
  playedAt: string;
}

export interface LikedTrack {
  trackId: string;
  trackUri: string;
  trackName: string;
  trackArtist: string;
  artistId: string;
  emotion: string;            // which emotion this was liked under
  likedAt: string;
}

export interface UserProfile {
  name: string;
  createdAt: string;
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function getUser(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveUser(name: string): Promise<UserProfile> {
  const user: UserProfile = { name: name || 'Flow User', createdAt: new Date().toISOString() };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

// ── Likes ─────────────────────────────────────────────────────────────────────

export async function getLikedTracks(): Promise<LikedTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(LIKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function likeTrack(track: Omit<LikedTrack, 'likedAt'>): Promise<void> {
  const existing = await getLikedTracks();
  // Don't duplicate
  if (existing.find(t => t.trackId === track.trackId)) return;
  const updated = [{ ...track, likedAt: new Date().toISOString() }, ...existing].slice(0, 100);
  await AsyncStorage.setItem(LIKES_KEY, JSON.stringify(updated));
}

export async function unlikeTrack(trackId: string): Promise<void> {
  const existing = await getLikedTracks();
  const updated = existing.filter(t => t.trackId !== trackId);
  await AsyncStorage.setItem(LIKES_KEY, JSON.stringify(updated));
}

export async function isLiked(trackId: string): Promise<boolean> {
  const existing = await getLikedTracks();
  return existing.some(t => t.trackId === trackId);
}

// Returns liked track IDs for a given emotion (most recent first, max 5 for seeding)
export async function getLikedSeedsForEmotion(emotion: string): Promise<string[]> {
  const all = await getLikedTracks();
  // Prefer tracks liked under same emotion, then fall back to any liked tracks
  const sameEmo = all.filter(t => t.emotion === emotion).slice(0, 3).map(t => t.trackId);
  const others  = all.filter(t => t.emotion !== emotion).slice(0, 2).map(t => t.trackId);
  return [...sameEmo, ...others].slice(0, 5); // Spotify allows max 5 seeds total
}

export async function clearLikes(): Promise<void> {
  await AsyncStorage.removeItem(LIKES_KEY);
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function addHistoryEntry(
  trackId: string,
  trackName: string,
  trackArtist: string,
  trackUri: string,
  emotion: string,
  liked: boolean = false,
): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    trackId,
    trackName,
    trackArtist,
    trackUri,
    emotion,
    liked,
    playedAt: new Date().toISOString(),
  };
  const existing = await getHistory();
  const updated = [entry, ...existing].slice(0, 300);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return entry;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
