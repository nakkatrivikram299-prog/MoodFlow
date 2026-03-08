// src/screens/MoodScreen.tsx (renamed logic — text only, no voice)
// ─────────────────────────────────────────────────────────────────
// Flow:
//   You type how you feel  →  TFLite detects emotion  →  Spotify fetches tracks
//   That's it. No voice, no mic, no extra permissions needed.
// ─────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Space, EMOTION_EMOJI, EMOTION_COLOR } from '../theme';
import { Btn, SL } from '../components';
import { analyzeEmotion, loadEmotionModel, EmotionResult } from '../services/emotionEngine';
import { getRecommendations, SpotifyTrack } from '../services/spotifyApi';
import { getLikedSeedsForEmotion } from '../services/localStorage';

interface Props {
  onResult: (emo: EmotionResult, tracks: SpotifyTrack[]) => void;
}

// Quick-tap mood prompts — tap one to pre-fill the box
const QUICK_MOODS = [
  "I'm feeling really happy today",
  "Feeling sad and a bit low",
  "I'm angry and frustrated",
  "Anxious and nervous",
  "Super energetic and pumped",
  "Calm and relaxed",
  "Shocked and surprised",
  "Disgusted and annoyed",
];

export default function VoiceScreen({ onResult }: Props) {
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [lastEmo, setLastEmo]   = useState<EmotionResult | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelNote, setModelNote]   = useState('');

  // Load TFLite on mount (runs in background)
  useEffect(() => {
    loadEmotionModel().then(r => {
      setModelReady(r.ok);
      setModelNote(r.ok
        ? '🧠 TFLite model ready'
        : '⚠️  Using keyword fallback (model not loaded)'
      );
    });
  }, []);

  // ── Main action: text → TFLite → Spotify ─────────────────────────
  const handleAnalyse = async () => {
    const src = text.trim();
    if (!src) {
      Alert.alert('Type something first', 'Write how you feel, then tap Analyse.');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Step 1: TFLite detects emotion from text (on-device, fast)
      const emo = await analyzeEmotion(src);
      setLastEmo(emo);

      // Step 2: Spotify fetches 20 tracks matching that emotion
      // Use liked tracks as seeds so first fetch is already personalised
      const likedSeeds = await getLikedSeedsForEmotion(emo.primary_emotion);
      const tracks = await getRecommendations(emo.primary_emotion, 20, likedSeeds);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onResult(emo, tracks);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMood = (mood: string) => {
    setText(mood);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const reset = () => {
    setText('');
    setLastEmo(null);
  };

  const emoColor = lastEmo
    ? (EMOTION_COLOR[lastEmo.primary_emotion] || Colors.cyan)
    : Colors.cyan;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Model status ── */}
        <View style={[
          s.statusBadge,
          modelReady
            ? { backgroundColor: Colors.green + '0D', borderColor: Colors.green + '40' }
            : { backgroundColor: Colors.amber12, borderColor: Colors.amber30 },
        ]}>
          <Text style={[s.statusTxt, { color: modelReady ? Colors.green : Colors.amber }]}>
            {modelNote || '…'}
          </Text>
        </View>

        {/* ── Result card (shows after analysis) ── */}
        {lastEmo && (
          <View style={[s.resultCard, { borderColor: emoColor + '44' }]}>
            <View style={[s.resultGlow, { backgroundColor: emoColor + '0C' }]} />
            <View style={s.resultRow}>
              <Text style={s.resultEmoji}>
                {EMOTION_EMOJI[lastEmo.primary_emotion] || '🎵'}
              </Text>
              <View style={s.resultInfo}>
                <Text style={[s.resultEmotion, { color: emoColor }]}>
                  {lastEmo.primary_emotion}
                </Text>
                <Text style={s.resultConf}>
                  {(lastEmo.confidence * 100).toFixed(1)}% confidence · TFLite
                </Text>
                <Text style={s.resultNote}>
                  Tracks loaded — tap Tracks tab to listen →
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.resetBtn} onPress={reset}>
              <Text style={s.resetTxt}>Try again with different text</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Text input ── */}
        <View style={s.inputCard}>
          <SL text="How are you feeling right now?" />
          <TextInput
            style={s.textArea}
            value={text}
            onChangeText={setText}
            placeholder={
              "Write anything — how your day went, what's\n" +
              "on your mind, how you feel right now.\n\n" +
              "e.g. 'I'm exhausted but happy, had a great day'\n" +
              "     'Feeling anxious about tomorrow'\n" +
              "     'Really energetic and ready to go'"
            }
            placeholderTextColor={Colors.text3}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!loading}
            autoCorrect
            autoCapitalize="sentences"
          />
          <Btn
            label={loading ? 'Detecting emotion…' : 'Analyse & Get Spotify Tracks →'}
            onPress={handleAnalyse}
            loading={loading}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* ── What happens explanation ── */}
        <View style={s.flowCard}>
          <SL text="What happens" />
          {[
            { step: '1', icon: '✏️', label: 'You type',        desc: 'Write how you feel in your own words' },
            { step: '2', icon: '🧠', label: 'TFLite detects',  desc: 'On-device ML model reads your text and identifies the emotion' },
            { step: '3', icon: '🎵', label: 'Spotify fetches', desc: 'Spotify picks 20 tracks that match the mood — you don\'t do anything in Spotify' },
            { step: '4', icon: '▶',  label: 'You play',        desc: 'Tap any track to open it in Spotify app' },
          ].map(f => (
            <View key={f.step} style={s.flowRow}>
              <View style={s.flowNum}><Text style={s.flowNumTxt}>{f.step}</Text></View>
              <Text style={s.flowIcon}>{f.icon}</Text>
              <View style={s.flowText}>
                <Text style={s.flowLabel}>{f.label}</Text>
                <Text style={s.flowDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Quick mood chips ── */}
        <View style={s.quickCard}>
          <SL text="Quick moods — tap to use" />
          <View style={s.chips}>
            {QUICK_MOODS.map(mood => (
              <TouchableOpacity
                key={mood}
                style={[s.chip, text === mood && s.chipActive]}
                onPress={() => handleQuickMood(mood)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipTxt, text === mood && s.chipTxtActive]}>
                  {mood}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.md, paddingBottom: 60 },

  statusBadge: {
    borderWidth: 1, borderRadius: Radius.sm,
    paddingVertical: 7, paddingHorizontal: 12,
    marginBottom: Space.md, alignSelf: 'flex-start',
  },
  statusTxt: { fontSize: 11, fontFamily: 'Courier New', letterSpacing: 0.4 },

  resultCard: {
    backgroundColor: Colors.surface1, borderWidth: 1,
    borderRadius: Radius.xl, padding: Space.md,
    marginBottom: Space.md, overflow: 'hidden',
  },
  resultGlow: {
    position: 'absolute', top: -40, left: '20%', right: '20%',
    height: 100, borderRadius: 50,
  },
  resultRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  resultEmoji:  { fontSize: 56 },
  resultInfo:   { flex: 1 },
  resultEmotion:{ fontSize: 28, fontWeight: '800', textTransform: 'capitalize', marginBottom: 3 },
  resultConf:   { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New' },
  resultNote:   { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New', marginTop: 5, fontStyle: 'italic' },
  resetBtn: {
    borderWidth: 1, borderColor: Colors.border2,
    borderRadius: Radius.full, paddingVertical: 10, alignItems: 'center',
  },
  resetTxt: { fontSize: 13, color: Colors.text2 },

  inputCard: {
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Space.md, marginBottom: Space.md,
  },
  textArea: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, color: Colors.text1, fontSize: 15, lineHeight: 24,
    padding: 14, minHeight: 130, marginBottom: 12,
  },

  flowCard: {
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Space.md, marginBottom: Space.md,
  },
  flowRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  flowNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  flowNumTxt: { fontSize: 11, fontWeight: '800', color: Colors.bg },
  flowIcon:   { fontSize: 18, width: 26, textAlign: 'center', marginTop: 1 },
  flowText:   { flex: 1 },
  flowLabel:  { fontSize: 14, fontWeight: '700', color: Colors.text1, marginBottom: 2 },
  flowDesc:   { fontSize: 12, color: Colors.text2, lineHeight: 18 },

  quickCard: {
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1, borderColor: Colors.border2,
    borderRadius: Radius.full, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: Colors.surface2,
  },
  chipActive:    { borderColor: Colors.cyan, backgroundColor: Colors.cyan12 },
  chipTxt:       { fontSize: 12, color: Colors.text2 },
  chipTxtActive: { color: Colors.cyan, fontWeight: '600' },
});
