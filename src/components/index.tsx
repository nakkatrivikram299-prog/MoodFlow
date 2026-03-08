// src/components/index.tsx — Phone-first shared primitives
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ViewStyle,
} from 'react-native';
import { Colors, Radius, Space } from '../theme';

// ─── Card ────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// ─── Section label (monospace caps) ──────────────────
export function SL({ text }: { text: string }) {
  return <Text style={s.sl}>{text.toUpperCase()}</Text>;
}

// ─── Button — big phone-friendly touch target ─────────
interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'cyan' | 'amber' | 'ghost' | 'danger' | 'subtle';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
  icon?: string;
}
export function Btn({ label, onPress, variant = 'cyan', loading, disabled, style, small, icon }: BtnProps) {
  const bg =
    variant === 'cyan'   ? Colors.cyan :
    variant === 'amber'  ? Colors.amber :
    variant === 'danger' ? Colors.red12 :
    variant === 'subtle' ? Colors.surface2 :
    'transparent';
  const fg =
    (variant === 'cyan' || variant === 'amber') ? Colors.bg : Colors.text1;
  const bc =
    variant === 'ghost'  ? Colors.border2 :
    variant === 'danger' ? 'rgba(255,61,90,0.25)' :
    variant === 'subtle' ? Colors.border :
    'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.72}
      style={[
        s.btn,
        small ? s.btnSm : s.btnLg,
        { backgroundColor: bg, borderColor: bc, borderWidth: bc === 'transparent' ? 0 : 1 },
        (disabled || loading) && { opacity: 0.38 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={fg} size="small" />
        : <Text style={[s.btnTxt, small && s.btnTxtSm, { color: fg }]}>
            {icon ? `${icon}  ${label}` : label}
          </Text>
      }
    </TouchableOpacity>
  );
}

// ─── Tag pill ─────────────────────────────────────────
export function Tag({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[s.tag, bg ? { backgroundColor: bg, borderColor: color + '44' } : {}]}>
      <Text style={[s.tagTxt, color ? { color } : {}]}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────
export function Empty({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIco}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {sub ? <Text style={s.emptySub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <View style={s.div}>
      <View style={s.divLine} />
      {label ? <Text style={s.divTxt}>{label}</Text> : null}
      {label ? <View style={s.divLine} /> : null}
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Space.md,
    marginBottom: Space.md,
  },
  sl: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
    color: Colors.text3,
    fontFamily: 'Courier New',
    marginBottom: Space.sm,
  },
  btn: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnLg: { minHeight: 54, paddingHorizontal: 22 },
  btnSm: { minHeight: 40, paddingHorizontal: 16 },
  btnTxt: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  btnTxtSm: { fontSize: 13 },
  tag: {
    backgroundColor: Colors.cyan12,
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  tagTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: Colors.cyan, fontFamily: 'Courier New' },
  empty: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32 },
  emptyIco: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text2, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.text3, fontFamily: 'Courier New', textAlign: 'center', lineHeight: 20 },
  div: { flexDirection: 'row', alignItems: 'center', marginVertical: Space.md, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  divTxt: { fontSize: 11, color: Colors.text3, fontFamily: 'Courier New' },
});
