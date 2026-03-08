// src/hooks/useAuth.ts
// Auth now covers both: local profile (name) + Spotify PKCE login
import React, { useState, useEffect, createContext, useContext } from 'react';
import { getUser, saveUser, clearUser, UserProfile } from '../services/localStorage';
import {
  isLoggedIn, getProfile, clearTokens, startSpotifyLogin,
  SPOTIFY_CLIENT_ID,
} from '../services/spotifyAuth';
import type { SpotifyUser } from '../services/spotifyApi';

export interface AppUser {
  name: string;
  createdAt: string;
  spotify: SpotifyUser | null;
  isPremium: boolean;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  spotifyLinked: boolean;
  saveName: (name: string) => Promise<void>;
  linkSpotify: () => Promise<void>;
  unlinkSpotify: () => Promise<void>;
  refreshSpotifyProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null, loading: true, spotifyLinked: false,
  saveName: async () => {}, linkSpotify: async () => {},
  unlinkSpotify: async () => {}, refreshSpotifyProfile: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [localUser, setLocalUser] = useState<UserProfile | null>(null);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const local = await getUser();
      setLocalUser(local);
      if (local && await isLoggedIn()) {
        try { setSpotifyUser(await getProfile()); } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const appUser: AppUser | null = localUser ? {
    name:       spotifyUser?.display_name || localUser.name,
    createdAt:  localUser.createdAt,
    spotify:    spotifyUser,
    isPremium:  spotifyUser?.product === 'premium',
  } : null;

  const saveName = async (name: string) => {
    const u = await saveUser(name);
    setLocalUser(u);
  };

  const linkSpotify = async () => {
    if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID_HERE') {
      throw new Error('Add your Spotify Client ID in src/services/spotifyAuth.ts first');
    }
    await startSpotifyLogin();
  };

  const unlinkSpotify = async () => {
    await clearTokens();
    setSpotifyUser(null);
  };

  const refreshSpotifyProfile = async () => {
    try { setSpotifyUser(await getProfile()); } catch {}
  };

  const logout = async () => {
    await clearUser();
    await clearTokens();
    setLocalUser(null);
    setSpotifyUser(null);
  };

  return React.createElement(
    AuthContext.Provider,
    { value: {
        user: appUser,
        loading,
        spotifyLinked: !!spotifyUser,
        saveName,
        linkSpotify,
        unlinkSpotify,
        refreshSpotifyProfile,
        logout,
    }},
    children,
  );
}

export const useAuth = () => useContext(AuthContext);
