// app/tabs.tsx — same structure, updated types for SpotifyTrack
import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Space } from '../src/theme';
import { useAuth } from '../src/hooks/useAuth';
import VoiceScreen from '../src/screens/VoiceScreen';
import EmotionScreen from '../src/screens/EmotionScreen';
import TracksScreen from '../src/screens/TracksScreen';
import HistoryScreen, { HistoryHandle } from '../src/screens/HistoryScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import { EmotionResult } from '../src/services/emotionEngine';
import { SpotifyTrack } from '../src/services/spotifyApi';

type TabId = 'voice' | 'emotion' | 'tracks' | 'history' | 'settings';
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'voice',    icon: '✏️', label: 'Mood'     },
  { id: 'emotion',  icon: '🧠', label: 'Emotion'  },
  { id: 'tracks',   icon: '🎵', label: 'Tracks'   },
  { id: 'history',  icon: '📜', label: 'History'  },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export default function AppTabs() {
  const { user } = useAuth();
  const [tab, setTab]         = useState<TabId>('voice');
  const [emoResult, setEmo]   = useState<EmotionResult | null>(null);
  const [tracks, setTracks]   = useState<SpotifyTrack[]>([]);
  const [hasEmo, setHasEmo]   = useState(false);
  const [hasTrax, setHasTrax] = useState(false);
  const histRef = useRef<HistoryHandle>(null);

  const handleVoiceResult = useCallback((emo: EmotionResult, t: SpotifyTrack[]) => {
    setEmo(emo); setTracks(t);
    setHasEmo(true); setHasTrax(t.length > 0);
    setTab('emotion');
  }, []);

  const handleGetTracks = useCallback((t: SpotifyTrack[]) => {
    setTracks(t); setHasTrax(true);
    setTab('tracks');
  }, []);

  const switchTab = (t: TabId) => {
    if (t === 'emotion') setHasEmo(false);
    if (t === 'tracks')  setHasTrax(false);
    setTab(t);
  };

  const screen = () => {
    switch (tab) {
      case 'voice':    return <VoiceScreen onResult={handleVoiceResult} />;
      case 'emotion':  return <EmotionScreen emotion={emoResult} onGetTracks={handleGetTracks} />;
      case 'tracks':   return <TracksScreen tracks={tracks} currentEmotion={emoResult?.primary_emotion || ''} onTracksUpdate={setTracks} onHistoryUpdate={() => histRef.current?.reload()} />;
      case 'history':  return <HistoryScreen ref={histRef} />;
      case 'settings': return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.header}>
        <View style={s.hLeft}>
          <View style={s.lm}><Text style={s.lmTxt}>VF</Text></View>
          <View>
            <Text style={s.hTitle}>
              {TABS.find(t => t.id === tab)?.icon}{'  '}
              {TABS.find(t => t.id === tab)?.label}
            </Text>
            <Text style={s.hSub} numberOfLines={1}>{user?.name}</Text>
          </View>
        </View>
        <View style={s.badge}><Text style={s.badgeTxt}>🎧 Spotify</Text></View>
      </View>
      <View style={s.screen}>{screen()}</View>
      <SafeAreaView edges={['bottom']} style={s.navWrap}>
        <View style={s.nav}>
          {TABS.map(t => {
            const active = t.id === tab;
            const dot = (t.id === 'emotion' && hasEmo) || (t.id === 'tracks' && hasTrax);
            return (
              <TouchableOpacity key={t.id} style={s.navBtn} onPress={() => switchTab(t.id)} activeOpacity={0.65}>
                {active && <View style={s.navBar} />}
                <View>
                  <Text style={[s.navIco, active && s.navIcoActive]}>{t.icon}</Text>
                  {dot && <View style={s.navDot} />}
                </View>
                <Text style={[s.navLbl, active && s.navLblActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space.md, paddingVertical: 12,
    backgroundColor: 'rgba(5,8,15,0.98)', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lm: { width: 34, height: 34, borderRadius: 9, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  lmTxt: { color: Colors.bg, fontWeight: '800', fontSize: 13 },
  hTitle: { fontSize: 16, fontWeight: '700', color: Colors.text1 },
  hSub:   { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New', marginTop: 1 },
  badge:  { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, borderRadius: 100, paddingVertical: 5, paddingHorizontal: 11 },
  badgeTxt: { fontSize: 10, color: Colors.green, fontFamily: 'Courier New', letterSpacing: 0.6 },
  screen: { flex: 1 },
  navWrap: { backgroundColor: 'rgba(5,8,15,0.98)', borderTopWidth: 1, borderTopColor: Colors.border },
  nav: { flexDirection: 'row', paddingTop: 8, paddingBottom: Platform.OS === 'android' ? 8 : 2 },
  navBtn: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 4, minHeight: 52, position: 'relative' },
  navBar: { position: 'absolute', top: 0, left: '18%', right: '18%', height: 2, backgroundColor: Colors.cyan, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  navIco: { fontSize: 22, opacity: 0.38 },
  navIcoActive: { opacity: 1 },
  navLbl: { fontSize: 9, letterSpacing: 0.7, color: Colors.text3, fontFamily: 'Courier New' },
  navLblActive: { color: Colors.cyan },
  navDot: { position: 'absolute', top: -3, right: -5, width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.amber, borderWidth: 1.5, borderColor: Colors.bg },
});
