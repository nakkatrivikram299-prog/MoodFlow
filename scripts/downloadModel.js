#!/usr/bin/env node
// scripts/downloadModel.js
// Run once: node scripts/downloadModel.js
// Downloads the pre-trained GoEmotions TFLite model + vocab into assets/models/
//
// Model: Bidirectional LSTM trained on GoEmotions (58k sentences)
//        Remapped to 8 emotions (happy/sad/angry/fearful/surprised/disgusted/calm/energetic)
//        Input: int32[1, 64]  (token IDs, pre-padded)
//        Output: float32[1, 8] (softmax probabilities)
//
// Hosted on Hugging Face — fully open source (Apache 2.0)

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE = 'https://huggingface.co/vikramflow/emotion-tflite/resolve/main';

const FILES = [
  { url: `${BASE}/emotion_model_js/model.json`,               dest: 'assets/models/emotion_model_js/model.json' },
  { url: `${BASE}/emotion_model_js/group1-shard1of1.bin`,     dest: 'assets/models/emotion_model_js/group1-shard1of1.bin' },
  { url: `${BASE}/vocab.json`,                                 dest: 'assets/models/vocab.json' },
];

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      res.on('data', chunk => {
        received += chunk.length;
        if (total) {
          const pct = Math.round(received / total * 100);
          process.stdout.write(`\r  ${path.basename(dest)}: ${pct}%`);
        }
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(); resolve(); });
    }).on('error', reject);
  });
}

(async () => {
  console.log('Downloading VIKRAM Flow emotion model...\n');
  for (const f of FILES) {
    process.stdout.write(`Downloading ${f.dest}...\n`);
    try {
      await download(f.url, f.dest);
      console.log(`  ✓ ${f.dest}`);
    } catch (e) {
      console.error(`  ✗ ${f.dest}: ${e.message}`);
      console.log('\nIf the model host is unavailable, you can:');
      console.log('  1. Train your own: python scripts/train_emotion_model.py');
      console.log('  2. The app will fall back to keyword-based detection automatically');
    }
  }
  console.log('\nDone. Run: npm start');
})();
