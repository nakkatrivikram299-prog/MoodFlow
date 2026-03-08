// src/services/spotifyApi.ts
// All Spotify Web API calls. Uses PKCE token. No backend. No secret.

import { getAccessToken } from './spotifyAuth';

const BASE = 'https://api.spotify.com/v1';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { name: string; images: { url: string }[] };
  uri: string;
  preview_url: string | null;
  duration_ms: number;
  external_urls: { spotify: string };
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  images: { url: string }[];
  product: string;
}

// ── Core fetch ────────────────────────────────────────────────────────────────
async function spotifyFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not logged in to Spotify');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  if (res.status === 204) return {} as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `HTTP ${res.status}`);
  }
  return res.json() as T;
}

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getProfile(): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>('/me');
}

// ── Emotion → audio feature seeds ────────────────────────────────────────────
const EMOTION_SEEDS: Record<string, {
  seed_genres: string;
  target_valence: number;
  target_energy: number;
  target_danceability: number;
  target_tempo: number;
  min_popularity: number;
}> = {
  happy:     { seed_genres: 'pop,happy,dance',                  target_valence: 0.85, target_energy: 0.75, target_danceability: 0.80, target_tempo: 125, min_popularity: 50 },
  sad:       { seed_genres: 'sad,acoustic,singer-songwriter',   target_valence: 0.20, target_energy: 0.30, target_danceability: 0.30, target_tempo:  72, min_popularity: 40 },
  angry:     { seed_genres: 'metal,rock,punk',                  target_valence: 0.30, target_energy: 0.95, target_danceability: 0.40, target_tempo: 160, min_popularity: 45 },
  fearful:   { seed_genres: 'ambient,classical,study',          target_valence: 0.25, target_energy: 0.25, target_danceability: 0.20, target_tempo:  65, min_popularity: 30 },
  surprised: { seed_genres: 'indie,alternative,pop',            target_valence: 0.65, target_energy: 0.70, target_danceability: 0.60, target_tempo: 115, min_popularity: 45 },
  disgusted: { seed_genres: 'grunge,alternative,rock',          target_valence: 0.25, target_energy: 0.75, target_danceability: 0.35, target_tempo: 130, min_popularity: 40 },
  calm:      { seed_genres: 'chill,ambient,sleep',              target_valence: 0.55, target_energy: 0.20, target_danceability: 0.30, target_tempo:  78, min_popularity: 35 },
  energetic: { seed_genres: 'work-out,edm,hip-hop',             target_valence: 0.70, target_energy: 0.92, target_danceability: 0.85, target_tempo: 145, min_popularity: 55 },
};

// ── Recommendations — personalised when liked tracks exist ────────────────────
// likedTrackIds: up to 5 Spotify track IDs from the user's liked tracks.
// When provided, Spotify uses THOSE as seeds instead of genres — this is how
// the recommendations get personalised to what the user actually likes.
export async function getRecommendations(
  emotion: string,
  limit = 20,
  likedTrackIds: string[] = [],
  excludeIds: string[] = [],
): Promise<SpotifyTrack[]> {
  const seeds = EMOTION_SEEDS[emotion] || EMOTION_SEEDS.calm;

  // Build seed params:
  // If user has liked tracks → use up to 3 as seed_tracks + 1 genre seed
  // If no liked tracks yet  → use genre seeds only (cold start)
  const params = new URLSearchParams({
    limit: String(Math.min(limit + excludeIds.length, 100)), // fetch extra to cover excluded
    target_valence:      String(seeds.target_valence),
    target_energy:       String(seeds.target_energy),
    target_danceability: String(seeds.target_danceability),
    target_tempo:        String(seeds.target_tempo),
    min_popularity:      String(seeds.min_popularity),
  });

  if (likedTrackIds.length > 0) {
    // Personalised: use liked tracks as primary seeds
    const trackSeeds = likedTrackIds.slice(0, 3).join(',');
    params.set('seed_tracks', trackSeeds);
    // Add 1 genre seed alongside (Spotify allows 5 seeds total)
    const genreSeeds = seeds.seed_genres.split(',').slice(0, 5 - likedTrackIds.slice(0, 3).length);
    if (genreSeeds.length) params.set('seed_genres', genreSeeds.join(','));
  } else {
    // Cold start: genre seeds only
    params.set('seed_genres', seeds.seed_genres);
  }

  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(`/recommendations?${params}`);
  const all = data.tracks || [];

  // Filter out already-shown tracks, return requested count
  const fresh = all.filter(t => !excludeIds.includes(t.id));
  return fresh.slice(0, limit);
}

// ── Search ────────────────────────────────────────────────────────────────────
export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit) });
  const data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(`/search?${params}`);
  return data.tracks?.items || [];
}

// ── Playback ──────────────────────────────────────────────────────────────────
export async function playTrack(uri: string): Promise<void> {
  await spotifyFetch('/me/player/play', { method: 'PUT', body: JSON.stringify({ uris: [uri] }) });
}

export async function getDevices(): Promise<{ id: string; name: string; type: string; is_active: boolean }[]> {
  const data = await spotifyFetch<{ devices: any[] }>('/me/player/devices');
  return data.devices || [];
}
