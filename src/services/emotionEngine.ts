// src/services/emotionEngine.ts
// ─────────────────────────────────────────────────────────────────────────────
// ON-DEVICE EMOTION DETECTION via TensorFlow Lite
//
// Architecture:
//   Text input → TF-IDF-style token encoding → MobileNet-style LSTM model
//   → 8-class softmax output
//
// The model file (emotion_model.tflite, ~10MB) lives in assets/models/.
// It was trained on the GoEmotions dataset (58k Reddit sentences, 28→8 emotions).
//
// We use @tensorflow/tfjs + @tensorflow/tfjs-react-native for inference.
// The tokenizer vocabulary (vocab.json) maps words → int IDs (top 20k words).
//
// HOW TO GET THE MODEL FILES:
//   Option A — Use the pre-trained model we provide (download script below)
//   Option B — Train your own (see scripts/train_emotion_model.py in the repo)
//
// DOWNLOAD SCRIPT (run once from project root):
//   node scripts/downloadModel.js
//   This fetches emotion_model.tflite + vocab.json into assets/models/
// ─────────────────────────────────────────────────────────────────────────────

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmotionResult {
  primary_emotion: string;
  confidence: number;
  all_scores: Record<string, number>;
  text_used: string;
}

// 8 output classes — must match training label order
const EMOTION_LABELS = [
  'angry', 'calm', 'disgusted', 'energetic',
  'fearful', 'happy', 'sad', 'surprised',
];

// Sequence length the model expects
const MAX_SEQ_LEN = 64;
const VOCAB_CACHE_KEY = 'vf_vocab_v1';
const MODEL_READY_KEY = 'vf_model_ready_v1';

// ── Singleton state ───────────────────────────────────────────────────────────
let model: tf.GraphModel | tf.LayersModel | null = null;
let vocab: Record<string, number> = {};
let modelLoading = false;
let modelLoadError: string | null = null;

// ── Vocab helpers ─────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function encodeSequence(tokens: string[]): number[] {
  const ids = tokens.map(t => vocab[t] ?? 1); // 1 = <UNK>
  // Pad or truncate to MAX_SEQ_LEN
  if (ids.length >= MAX_SEQ_LEN) return ids.slice(0, MAX_SEQ_LEN);
  return [...Array(MAX_SEQ_LEN - ids.length).fill(0), ...ids]; // pre-pad
}

// ── Model loading ─────────────────────────────────────────────────────────────
export async function loadEmotionModel(): Promise<{ ok: boolean; error?: string }> {
  if (model) return { ok: true };
  if (modelLoading) {
    // Wait for concurrent load
    await new Promise(r => setTimeout(r, 200));
    return model ? { ok: true } : { ok: false, error: modelLoadError || 'Loading' };
  }

  modelLoading = true;
  try {
    // ── Step 1: initialise TF ──────────────────────────────────────────────
    await tf.ready();

    // ── Step 2: load vocab ────────────────────────────────────────────────
    // Try cache first
    const cached = await AsyncStorage.getItem(VOCAB_CACHE_KEY).catch(() => null);
    if (cached) {
      vocab = JSON.parse(cached);
    } else {
      // Load from bundled asset
      // vocab.json must be in assets/models/vocab.json
      const vocabAsset = require('../../assets/models/vocab.json');
      vocab = vocabAsset;
      await AsyncStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify(vocab)).catch(() => {});
    }

    // ── Step 3: load TFLite model ─────────────────────────────────────────
    // Model must be in assets/models/emotion_model.tflite
    // We use bundleResourceIO which works with Expo's asset system
    const modelJson   = require('../../assets/models/emotion_model_js/model.json');
    const modelWeight = require('../../assets/models/emotion_model_js/group1-shard1of1.bin');

    model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeight));
    await AsyncStorage.setItem(MODEL_READY_KEY, '1').catch(() => {});

    modelLoading = false;
    return { ok: true };
  } catch (e: any) {
    modelLoadError = e.message;
    modelLoading = false;
    return { ok: false, error: e.message };
  }
}

// ── Inference ─────────────────────────────────────────────────────────────────
export async function analyzeEmotion(text: string): Promise<EmotionResult> {
  const trimmed = text.trim();

  if (!model) {
    const result = await loadEmotionModel();
    if (!result.ok || !model) {
      // Graceful fallback to keyword scoring if model unavailable
      return fallbackAnalyze(trimmed);
    }
  }

  const tokens  = tokenize(trimmed);
  const encoded = encodeSequence(tokens);

  // Run inference inside tf.tidy to avoid memory leaks
  const scores = tf.tidy(() => {
    const inputTensor = tf.tensor2d([encoded], [1, MAX_SEQ_LEN], 'int32');
    const output = (model as tf.LayersModel).predict(inputTensor) as tf.Tensor;
    return Array.from(output.dataSync()) as number[];
  });

  // Build result
  const all_scores: Record<string, number> = {};
  EMOTION_LABELS.forEach((label, i) => { all_scores[label] = scores[i] ?? 0; });

  const primary_emotion = EMOTION_LABELS[scores.indexOf(Math.max(...scores))];
  const confidence = Math.max(...scores);

  return { primary_emotion, confidence, all_scores, text_used: trimmed };
}

// ── Fallback (runs if model hasn't loaded yet) ────────────────────────────────
// Simple keyword scoring — keeps the app usable while the model loads on first run
function fallbackAnalyze(text: string): EmotionResult {
  const lower = text.toLowerCase();
  const hits: Record<string, number> = {
    happy: 0, sad: 0, angry: 0, fearful: 0,
    surprised: 0, disgusted: 0, calm: 0, energetic: 0,
  };

  const keywords: Record<string, string[]> = {
    happy:     ['happy','joy','excited','great','love','good','amazing','fun','smile','laugh'],
    sad:       ['sad','cry','lonely','depressed','miss','hurt','loss','broken','tears','empty'],
    angry:     ['angry','mad','furious','hate','rage','frustrated','annoyed','pissed'],
    fearful:   ['scared','afraid','anxious','nervous','worried','fear','panic','stress'],
    surprised: ['surprised','shocked','wow','unexpected','amazing','unbelievable','sudden'],
    disgusted: ['disgusted','gross','sick','revolting','hate','awful','terrible','nasty'],
    calm:      ['calm','peaceful','relaxed','chill','serene','quiet','still','okay','fine'],
    energetic: ['energy','pumped','motivated','ready','strong','driven','gym','run','go'],
  };

  for (const [emo, words] of Object.entries(keywords)) {
    for (const w of words) if (lower.includes(w)) hits[emo]++;
  }

  // Softmax-style normalisation
  const total = Object.values(hits).reduce((a, b) => a + b, 0) || 1;
  const base  = 1 / EMOTION_LABELS.length;
  const all_scores: Record<string, number> = {};
  for (const e of EMOTION_LABELS) {
    all_scores[e] = (base + (hits[e] || 0) / total * 0.7);
  }
  const norm = Object.values(all_scores).reduce((a, b) => a + b, 0);
  for (const e of EMOTION_LABELS) all_scores[e] /= norm;

  const primary_emotion = Object.entries(all_scores).sort((a, b) => b[1] - a[1])[0][0];
  return { primary_emotion, confidence: all_scores[primary_emotion], all_scores, text_used: text };
}

export { EMOTION_LABELS };
