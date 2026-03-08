// src/screens/OnboardingScreen.tsx
// Step 1: enter name. Step 2: connect Spotify (required for music).
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Colors, Radius, Space } from '../theme';
import { Btn } from '../components';
import { useAuth } from '../hooks/useAuth';
import { saveUser } from '../services/localStorage';

export default function OnboardingScreen() {
  const { saveName, linkSpotify } = useAuth();
  const [step, setStep]     = useState<'hero' | 'name' | 'spotify'>('hero');
  const [name, setName]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');

  const goToName = () => setStep('name');

  const handleName = async () => {
    setBusy(true);
    await saveName(name.trim() || 'Flow User');
    setBusy(false);
    setStep('spotify');
  };

  const handleSpotify = async () => {
    setError('');
    setBusy(true);
    try {
      await linkSpotify();
      // linkSpotify opens the browser — callback handled in _layout.tsx
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const skipSpotify = () => {
    Alert.alert(
      'Spotify required',
      'VIKRAM Flow uses Spotify to fetch personalised track recommendations. ' +
      'You\'ll need to connect before you can get music.',
      [{ text: 'OK' }],
    );
  };

  // ── Hero ──────────────────────────────────────────────────────────
  if (step === 'hero') return (
    <View style={s.bg}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.glow} />
      <View style={s.heroWrap}>
        <View style={s.logoMark}><Text style={s.logoTxt}>VF</Text></View>
        <Text style={s.heroName}>VIKRAM{'\n'}<Text style={{ color: Colors.cyan }}>Flow</Text></Text>
        <Text style={s.heroSub}>Your mood. Your music.{'\n'}Detected on your phone.</Text>

        <View style={s.featureList}>
          {[
            { ico: '🎙️', t: 'Speak or type',        s: 'Tell VIKRAM how you feel'            },
            { ico: '🧠', t: 'On-device ML',           s: 'TFLite emotion model — works offline' },
            { ico: '🎵', t: 'Real Spotify tracks',    s: 'Personalised by your actual mood'    },
            { ico: '📜', t: 'History',                s: 'Saved locally on your phone'         },
          ].map(f => (
            <View key={f.t} style={s.fRow}>
              <Text style={s.fIco}>{f.ico}</Text>
              <View><Text style={s.fTitle}>{f.t}</Text><Text style={s.fSub}>{f.s}</Text></View>
            </View>
          ))}
        </View>

        <Btn label="Get Started →" onPress={goToName} style={s.heroCta} />
        <Text style={s.footNote}>Requires a Spotify account (free or premium)</Text>
      </View>
    </View>
  );

  // ── Name ──────────────────────────────────────────────────────────
  if (step === 'name') return (
    <View style={s.bg}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.stepScroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setStep('hero')} style={s.back}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.stepNum}>1 / 2</Text>
          <Text style={s.stepTitle}>What should{'\n'}we call you?</Text>
          <Text style={s.stepSub}>Only stored on your phone.</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name (optional)"
            placeholderTextColor={Colors.text3}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleName}
          />
          <Btn label={busy ? 'Saving…' : 'Next →'} onPress={handleName} loading={busy} style={{ marginTop: Space.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // ── Spotify ───────────────────────────────────────────────────────
  return (
    <View style={s.bg}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.stepScroll}>
        <Text style={s.stepNum}>2 / 2</Text>
        <Text style={s.stepTitle}>Connect{'\n'}<Text style={{ color: Colors.cyan }}>Spotify</Text></Text>
        <Text style={s.stepSub}>
          VIKRAM uses Spotify's recommendation engine to match real tracks to your emotion.{'\n\n'}
          This uses PKCE — no password is shared with the app, only with Spotify's official login page.
        </Text>

        {[
          '✓ No client secret — fully PKCE',
          '✓ Works on free and premium accounts',
          '✓ Playback control requires Spotify Premium',
          '✓ You can revoke access any time in Spotify settings',
        ].map(l => <Text key={l} style={s.checkLine}>{l}</Text>)}

        {error ? (
          <View style={s.errBox}>
            <Text style={s.errTxt}>⚠️  {error}</Text>
          </View>
        ) : null}

        <Btn
          label={busy ? 'Opening Spotify…' : '🎧  Connect with Spotify'}
          onPress={handleSpotify}
          loading={busy}
          style={{ marginTop: Space.xl }}
          variant="amber"
        />
        <TouchableOpacity onPress={skipSpotify} style={s.skipBtn}>
          <Text style={s.skipTxt}>Why is Spotify required?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.bg },
  glow: {
    position: 'absolute', top: -100, left: '10%', right: '10%',
    height: 300, backgroundColor: Colors.cyan, opacity: 0.04, borderRadius: 200,
  },
  heroWrap: { flex: 1, paddingHorizontal: 28, paddingTop: 70, paddingBottom: 40, justifyContent: 'center' },
  logoMark: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.cyan,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: Colors.cyan, shadowOpacity: 0.5, shadowRadius: 18, elevation: 10,
  },
  logoTxt:  { fontSize: 24, fontWeight: '800', color: Colors.bg },
  heroName: { fontSize: 52, fontWeight: '800', color: Colors.text1, lineHeight: 54, marginBottom: 10 },
  heroSub:  { fontSize: 17, color: Colors.text2, lineHeight: 26, marginBottom: 32 },
  featureList: { gap: 16, marginBottom: 36 },
  fRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fIco:    { fontSize: 28, width: 36, textAlign: 'center' },
  fTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text1, marginBottom: 2 },
  fSub:    { fontSize: 12, color: Colors.text3, fontFamily: 'Courier New' },
  heroCta: { marginBottom: 14 },
  footNote:{ fontSize: 12, color: Colors.text3, fontFamily: 'Courier New', textAlign: 'center' },
  stepScroll: { flex: 1, padding: 28, paddingTop: 60, justifyContent: 'center' },
  back:    { marginBottom: 24, alignSelf: 'flex-start', padding: 4 },
  backTxt: { fontSize: 15, color: Colors.cyan, fontWeight: '600' },
  stepNum: { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New', letterSpacing: 1.5, marginBottom: 10 },
  stepTitle:{ fontSize: 40, fontWeight: '800', color: Colors.text1, lineHeight: 44, marginBottom: 10 },
  stepSub: { fontSize: 14, color: Colors.text2, lineHeight: 22, marginBottom: 24 },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2,
    borderRadius: Radius.md, color: Colors.text1, fontSize: 18, fontWeight: '600',
    paddingVertical: 16, paddingHorizontal: 18,
  },
  checkLine: { fontSize: 13, color: Colors.text2, lineHeight: 26, fontFamily: 'Courier New' },
  errBox: {
    backgroundColor: Colors.red12, borderWidth: 1,
    borderColor: 'rgba(255,61,90,0.3)', borderRadius: Radius.sm,
    padding: 12, marginTop: 12,
  },
  errTxt: { fontSize: 13, color: Colors.red, lineHeight: 20 },
  skipBtn:{ alignSelf: 'center', marginTop: 20, padding: 8 },
  skipTxt:{ fontSize: 13, color: Colors.text3, textDecorationLine: 'underline' },
});
