// src/theme/index.ts
export const Colors = {
  bg:       '#05080f',
  surface1: '#0a0e1a',
  surface2: '#0f1525',
  surface3: '#141d30',
  cyan:     '#00c8ff',
  cyan12:   'rgba(0,200,255,0.12)',
  cyan20:   'rgba(0,200,255,0.20)',
  amber:    '#ffb627',
  amber12:  'rgba(255,182,39,0.12)',
  amber30:  'rgba(255,182,39,0.30)',
  red:      '#ff3d5a',
  red12:    'rgba(255,61,90,0.12)',
  green:    '#00e676',
  violet:   '#b17bff',
  text1:    '#e8f4ff',
  text2:    '#7a9bbf',
  text3:    '#3d566e',
  border:   'rgba(0,200,255,0.09)',
  border2:  'rgba(0,200,255,0.20)',
} as const;

export const Radius = {
  sm:   10,
  md:   16,
  lg:   22,
  xl:   28,
  full: 999,
} as const;

export const Space = {
  xs:  6,
  sm:  10,
  md:  16,
  lg:  22,
  xl:  32,
  xxl: 48,
} as const;

export const EMOTION_EMOJI: Record<string, string> = {
  happy:     '😄',
  sad:       '😢',
  angry:     '😠',
  fearful:   '😨',
  surprised: '😲',
  disgusted: '🤢',
  calm:      '😌',
  energetic: '⚡',
};

export const EMOTION_COLOR: Record<string, string> = {
  happy:     '#ffb627',
  sad:       '#74b9ff',
  angry:     '#ff3d5a',
  fearful:   '#b17bff',
  surprised: '#00c8ff',
  disgusted: '#55efc4',
  calm:      '#81ecec',
  energetic: '#fdcb6e',
};

export const EMOTION_DESC: Record<string, string> = {
  happy:     'Uplifted & positive — amplify your joy',
  sad:       'Reflective & low — cathartic music to process feelings',
  angry:     'High tension — powerful music as a release valve',
  fearful:   'Anxious & tense — ambient calm to soothe the nerves',
  surprised: 'Electric & dynamic — unexpected music to match the spark',
  disgusted: 'Frustrated & raw — expressive music that validates',
  calm:      'Centred & peaceful — gentle sounds to maintain the flow',
  energetic: 'Driven & alive — upbeat rhythms to match your pace',
};
