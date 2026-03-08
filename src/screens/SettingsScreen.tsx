// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Image,
} from 'react-native';
import { Colors, Radius, Space } from '../theme';
import { Card, SL, Btn } from '../components';
import { useAuth } from '../hooks/useAuth';
import { clearHistory } from '../services/localStorage';
import { SPOTIFY_CLIENT_ID } from '../services/spotifyAuth';

export default function SettingsScreen() {
  const { user, spotifyLinked, saveName, linkSpotify, unlinkSpotify, logout } = useAuth();
  const [name, setName]   = useState(user?.spotify?.display_name || user?.name || '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy]   = useState(false);

  const handleSaveName = async () => {
    await saveName(name.trim() || 'Flow User');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSpotify = async () => {
    setBusy(true);
    try {
      if (spotifyLinked) {
        Alert.alert('Disconnect Spotify?', 'You\'ll need to reconnect to get music recommendations.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disconnect', style: 'destructive', onPress: async () => { await unlinkSpotify(); setBusy(false); } },
          ]
        );
      } else {
        await linkSpotify();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClearHistory = () => Alert.alert('Clear history?', 'Cannot be undone.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearHistory }]
  );

  const handleLogout = () => Alert.alert('Reset everything?', 'Clears name, history and Spotify connection.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: logout }]
  );

  const avatar = user?.spotify?.images?.[0]?.url;
  const clientIdSet = SPOTIFY_CLIENT_ID !== 'YOUR_SPOTIFY_CLIENT_ID_HERE';

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Profile */}
      <Card>
        <SL text="Profile" />
        <View style={s.profileRow}>
          {avatar
            ? <Image source={{ uri: avatar }} style={s.avatar} />
            : <View style={s.avatarFallback}><Text style={s.avatarTxt}>{(name[0] || 'V').toUpperCase()}</Text></View>
          }
          <View>
            <Text style={s.profileName}>{user?.name || '—'}</Text>
            {user?.spotify && (
              <Text style={s.profileSub}>
                {user.isPremium ? '✓ Spotify Premium' : 'Spotify Free'} · @{user.spotify.id}
              </Text>
            )}
          </View>
        </View>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Your display name"
          placeholderTextColor={Colors.text3}
          autoCapitalize="words"
        />
        <Btn label={saved ? '✓ Saved' : 'Save name'} onPress={handleSaveName} variant={saved ? 'subtle' : 'ghost'} small style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </Card>

      {/* Spotify */}
      <Card>
        <SL text="Spotify" />
        {!clientIdSet && (
          <View style={s.warnBox}>
            <Text style={s.warnTxt}>⚠️  Set SPOTIFY_CLIENT_ID in src/services/spotifyAuth.ts before connecting</Text>
          </View>
        )}
        <View style={s.spotifyRow}>
          <View style={[s.spotifyDot, { backgroundColor: spotifyLinked ? Colors.green : Colors.text3 }]} />
          <Text style={s.spotifyStatus}>
            {spotifyLinked ? 'Connected' : 'Not connected'}
          </Text>
        </View>
        <Btn
          label={busy ? '…' : spotifyLinked ? 'Disconnect Spotify' : '🎧  Connect Spotify'}
          variant={spotifyLinked ? 'danger' : 'amber'}
          onPress={handleSpotify}
          loading={busy}
          style={{ marginTop: 12 }}
        />
        <Text style={s.pkceNote}>
          Uses PKCE — no client secret. Your credentials never leave your phone.
        </Text>
      </Card>

      {/* Tech stack */}
      <Card>
        <SL text="How it works" />
        {[
          ['Emotion',  'TFLite model (GoEmotions dataset, on-device)'],
          ['Music',    'Spotify Recommendations API (audio features)'],
          ['Auth',     'Spotify PKCE — secretless, mobile-safe'],
          ['History',  'AsyncStorage — stored locally on your phone'],
          ['Network',  'Only for Spotify API — emotion runs offline'],
        ].map(([k, v]) => (
          <View key={k} style={s.row}>
            <Text style={s.rowK}>{k}</Text>
            <Text style={s.rowV} numberOfLines={2}>{v}</Text>
          </View>
        ))}
      </Card>

      {/* Data */}
      <Card>
        <SL text="Data" />
        <TouchableOpacity style={s.dangerRow} onPress={handleClearHistory} activeOpacity={0.7}>
          <Text style={s.dangerIco}>🗑️</Text>
          <View>
            <Text style={s.dangerTxt}>Clear listening history</Text>
            <Text style={s.dangerSub}>Removes all logged plays</Text>
          </View>
        </TouchableOpacity>
      </Card>

      <Btn label="Reset app" variant="danger" onPress={handleLogout} style={{ marginBottom: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 22, fontWeight: '800', color: Colors.bg },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.text1, marginBottom: 3 },
  profileSub: { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New' },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, color: Colors.text1, fontSize: 15,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  warnBox: {
    backgroundColor: Colors.amber12, borderWidth: 1, borderColor: Colors.amber30,
    borderRadius: Radius.sm, padding: 10, marginBottom: 12,
  },
  warnTxt: { fontSize: 12, color: Colors.amber, fontFamily: 'Courier New', lineHeight: 18 },
  spotifyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spotifyDot: { width: 8, height: 8, borderRadius: 4 },
  spotifyStatus: { fontSize: 14, color: Colors.text1, fontWeight: '600' },
  pkceNote: { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New', marginTop: 8, lineHeight: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowK: { fontSize: 12, color: Colors.text3, fontFamily: 'Courier New', width: 70 },
  rowV: { flex: 1, fontSize: 12, color: Colors.text1, textAlign: 'right' },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dangerIco: { fontSize: 22 },
  dangerTxt: { fontSize: 14, fontWeight: '600', color: Colors.red },
  dangerSub: { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New', marginTop: 2 },
});
