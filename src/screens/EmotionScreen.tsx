// src/screens/EmotionScreen.tsx — shows TFLite result + refresh Spotify recs
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Space, EMOTION_EMOJI, EMOTION_COLOR, EMOTION_DESC } from '../theme';
import { Empty, SL, Btn } from '../components';
import { EmotionResult } from '../services/emotionEngine';
import { getRecommendations, SpotifyTrack } from '../services/spotifyApi';

interface Props {
  emotion: EmotionResult | null;
  onGetTracks: (tracks: SpotifyTrack[]) => void;
}

export default function EmotionScreen({ emotion: emo, onGetTracks }: Props) {
  const barAnims = useRef<Animated.Value[]>([]).current;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!emo) return;
    const sorted = Object.entries(emo.all_scores).sort((a, b) => b[1] - a[1]);
    while (barAnims.length < sorted.length) barAnims.push(new Animated.Value(0));
    barAnims.forEach(a => a.setValue(0));
    Animated.stagger(55, sorted.map((_, i) =>
      Animated.spring(barAnims[i], { toValue: 1, friction: 7, tension: 90, useNativeDriver: false })
    )).start();
  }, [emo]);

  if (!emo) return (
    <View style={s.center}>
      <Empty icon="🧠" title="No emotion yet" sub={'Use the Voice tab to speak or type\nhow you feel first'} />
    </View>
  );

  const color  = EMOTION_COLOR[emo.primary_emotion] || Colors.cyan;
  const emoji  = EMOTION_EMOJI[emo.primary_emotion] || '🎵';
  const desc   = EMOTION_DESC[emo.primary_emotion]  || '';
  const sorted = Object.entries(emo.all_scores).sort((a, b) => b[1] - a[1]);

  const fetchTracks = async (emotion: string) => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const tracks = await getRecommendations(emotion, 20);
      onGetTracks(tracks);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Spotify error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={[s.heroCard, { borderColor: color + '38' }]}>
        <View style={[s.glow, { backgroundColor: color + '0C' }]} />
        <Text style={s.heroEmoji}>{emoji}</Text>
        <Text style={[s.heroName, { color }]}>{emo.primary_emotion}</Text>
        <Text style={s.heroConf}>{(emo.confidence * 100).toFixed(1)}% · TFLite on-device model</Text>
        <Text style={s.heroDesc}>{desc}</Text>
      </View>

      {/* Breakdown bars */}
      <View style={s.card}>
        <SL text="Full Breakdown" />
        <View style={s.bars}>
          {sorted.map(([label, score], i) => {
            const pct = score * 100;
            const top = i === 0;
            const anim = barAnims[i] || new Animated.Value(1);
            return (
              <TouchableOpacity key={label} style={s.barRow} onPress={() => fetchTracks(label)} activeOpacity={0.7}>
                <Text style={s.barEmo}>{EMOTION_EMOJI[label] || '•'}</Text>
                <Text style={[s.barLabel, top && { color: Colors.text1, fontWeight: '700' }]}>{label}</Text>
                <View style={s.barTrack}>
                  <Animated.View style={[s.barFill, {
                    backgroundColor: top ? color : Colors.cyan,
                    opacity: top ? 1 : 0.38,
                    width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(pct, 0.5)}%`] }),
                  }]} />
                </View>
                <Text style={[s.barVal, top && { color: Colors.text2 }]}>{pct.toFixed(0)}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.tapHint}>Tap any row to get Spotify tracks for that mood</Text>
      </View>

      {/* CTA */}
      <Btn
        label={loading ? 'Fetching from Spotify…' : `Get Spotify tracks for "${emo.primary_emotion}" →`}
        variant="amber"
        onPress={() => fetchTracks(emo.primary_emotion)}
        loading={loading}
        style={{ marginBottom: Space.md }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.md, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  heroCard: {
    backgroundColor: Colors.surface1, borderWidth: 1, borderRadius: Radius.xl,
    padding: 28, marginBottom: Space.md, alignItems: 'center', overflow: 'hidden',
  },
  glow: { position: 'absolute', top: -50, left: '15%', right: '15%', height: 140, borderRadius: 70 },
  heroEmoji: { fontSize: 72, marginBottom: 8 },
  heroName:  { fontSize: 32, fontWeight: '800', textTransform: 'capitalize', marginBottom: 4 },
  heroConf:  { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New', marginBottom: 12 },
  heroDesc:  { fontSize: 14, color: Colors.text2, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Space.md, marginBottom: Space.md,
  },
  bars: { gap: 9 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, minHeight: 36 },
  barEmo:   { fontSize: 16, width: 24, textAlign: 'center' },
  barLabel: { width: 72, fontSize: 11, color: Colors.text2, fontFamily: 'Courier New', textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 7, backgroundColor: Colors.surface3, borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 4 },
  barVal:   { width: 34, textAlign: 'right', fontSize: 10, color: Colors.text3, fontFamily: 'Courier New' },
  tapHint:  { fontSize: 10, color: Colors.text3, fontFamily: 'Courier New', marginTop: 10, fontStyle: 'italic', textAlign: 'right' },
});
