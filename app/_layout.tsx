// app/_layout.tsx — handles Spotify deep-link callback
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import OnboardingScreen from '../src/screens/OnboardingScreen';
import AppTabs from './tabs';
import { Colors } from '../src/theme';
import { handleSpotifyCallback } from '../src/services/spotifyAuth';
import { getUser } from '../src/services/localStorage';

function Root() {
  const { user, loading, refreshSpotifyProfile } = useAuth();

  // Handle Spotify PKCE redirect: vikramflow://callback?code=...
  useEffect(() => {
    const handle = async (url: string) => {
      if (!url.includes('callback')) return;
      const ok = await handleSpotifyCallback(url);
      if (ok) await refreshSpotifyProfile();
    };

    // App already open when link fires
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));

    // App opened cold by the link
    Linking.getInitialURL().then(url => { if (url) handle(url); });

    return () => sub.remove();
  }, [refreshSpotifyProfile]);

  if (loading) return (
    <View style={s.splash}>
      <View style={s.mark}><Text style={s.markTxt}>VF</Text></View>
      <Text style={s.name}>VIKRAM <Text style={{ color: Colors.cyan }}>Flow</Text></Text>
    </View>
  );

  // Show onboarding if no local profile OR no Spotify link
  return (user && user.spotify) ? <AppTabs /> : <OnboardingScreen />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider><Root /></AuthProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  mark: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.cyan, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
  markTxt: { color: Colors.bg, fontWeight: '800', fontSize: 26 },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text1 },
});
