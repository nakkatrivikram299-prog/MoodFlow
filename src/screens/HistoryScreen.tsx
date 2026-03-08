// src/screens/HistoryScreen.tsx
import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { Colors, Radius, Space, EMOTION_EMOJI, EMOTION_COLOR } from '../theme';
import { Empty } from '../components';
import { getHistory, clearHistory, HistoryEntry, getLikedTracks } from '../services/localStorage';

export interface HistoryHandle { reload: () => void; }

const HistoryScreen = forwardRef<HistoryHandle>((_, ref) => {
  const [entries, setEntries]     = useState<HistoryEntry[]>([]);
  const [likedIds, setLikedIds]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    const [history, liked] = await Promise.all([getHistory(), getLikedTracks()]);
    setEntries(history);
    setLikedIds(new Set(liked.map(l => l.trackId)));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);
  useImperativeHandle(ref, () => ({ reload: () => load(true) }));
  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, []);

  const handleClear = () => {
    Alert.alert('Clear history?', 'This cannot be undone. Your liked tracks are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
          await clearHistory();
          setEntries([]);
        }},
      ]
    );
  };

  const fmt = (iso: string) => {
    try {
      const d   = new Date(iso);
      const now = new Date();
      return d.toDateString() === now.toDateString()
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
          ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  if (!loading && !entries.length) return (
    <View style={s.center}>
      <Empty icon="📜" title="No history yet"
        sub={'Tap a track in the Tracks tab to log it.\nLiked tracks improve your recommendations.'} />
    </View>
  );

  return (
    <View style={s.wrap}>
      {entries.length > 0 && (
        <View style={s.topBar}>
          <Text style={s.topCount}>{entries.length} plays · {likedIds.size} liked</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={s.clearBtn}>Clear history</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        style={s.list}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.cyan} colors={[Colors.cyan]} />
        }
        renderItem={({ item: e, index }) => {
          const c      = EMOTION_COLOR[e.emotion] || Colors.cyan;
          const prev   = entries[index - 1];
          const newDay = !prev ||
            new Date(e.playedAt).toDateString() !== new Date(prev.playedAt).toDateString();
          const isLiked = likedIds.has(e.trackId);

          return (
            <>
              {newDay && (
                <Text style={s.dateSep}>
                  {new Date(e.playedAt).toLocaleDateString([], {
                    weekday: 'long', month: 'long', day: 'numeric'
                  })}
                </Text>
              )}
              <View style={[s.item, isLiked && s.itemLiked]}>
                <View style={[s.colorBar, { backgroundColor: c }]} />
                <Text style={s.emoIco}>{EMOTION_EMOJI[e.emotion] || '🎵'}</Text>
                <View style={s.info}>
                  <View style={s.nameRow}>
                    <Text style={s.trackName} numberOfLines={1}>{e.trackName}</Text>
                    {isLiked && <Text style={s.heartBadge}>❤️</Text>}
                  </View>
                  <Text style={s.trackArt} numberOfLines={1}>{e.trackArtist}</Text>
                  <View style={s.meta}>
                    <View style={[s.badge, { borderColor: c + '55', backgroundColor: c + '18' }]}>
                      <Text style={[s.badgeTxt, { color: c }]}>{e.emotion}</Text>
                    </View>
                    <Text style={s.time}>{fmt(e.playedAt)}</Text>
                  </View>
                </View>
              </View>
            </>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
});

export default HistoryScreen;

const s = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Space.md, paddingVertical: 10,
    backgroundColor: Colors.surface1, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  topCount: { fontSize: 12, color: Colors.text3, fontFamily: 'Courier New' },
  clearBtn: { fontSize: 12, color: Colors.red, fontFamily: 'Courier New' },
  list:    { flex: 1 },
  content: { padding: Space.md, paddingBottom: 60 },
  dateSep: {
    fontSize: 10, color: Colors.text3, fontFamily: 'Courier New',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginTop: 16, marginBottom: 10,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 12, paddingRight: 14, overflow: 'hidden',
  },
  itemLiked: { borderColor: 'rgba(255,61,90,0.28)', backgroundColor: 'rgba(255,61,90,0.04)' },
  colorBar: { width: 3, alignSelf: 'stretch' },
  emoIco:   { fontSize: 26, paddingLeft: 8 },
  info:     { flex: 1, minWidth: 0, gap: 2 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackName:  { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text1 },
  heartBadge: { fontSize: 13 },
  trackArt:   { fontSize: 12, color: Colors.text2 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge:      { borderWidth: 1, borderRadius: Radius.full, paddingVertical: 2, paddingHorizontal: 9 },
  badgeTxt:   { fontSize: 10, fontFamily: 'Courier New', textTransform: 'capitalize', fontWeight: '700' },
  time:       { fontSize: 10, color: Colors.text3, fontFamily: 'Courier New' },
});
