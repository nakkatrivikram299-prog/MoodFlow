// src/screens/TracksScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Features:
//  ❤️  Like / unlike any track  →  stored in AsyncStorage on phone
//  🎵  Liked tracks feed back as Spotify seeds → future recs get personalised
//  ➕  Load More → fetches 20 fresh tracks, skips already-shown ones
//  ▶   Tap to play in Spotify app (or in-app for Premium)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Image, Linking, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Space, EMOTION_EMOJI, EMOTION_COLOR } from '../theme';
import { Empty } from '../components';
import { SpotifyTrack, getRecommendations, playTrack } from '../services/spotifyApi';
import {
  addHistoryEntry, likeTrack, unlikeTrack, getLikedTracks,
  getLikedSeedsForEmotion, LikedTrack,
} from '../services/localStorage';
import { useAuth } from '../hooks/useAuth';

interface Props {
  tracks: SpotifyTrack[];
  currentEmotion: string;
  onTracksUpdate: (tracks: SpotifyTrack[]) => void;
  onHistoryUpdate: () => void;
}

export default function TracksScreen({ tracks, currentEmotion, onTracksUpdate, onHistoryUpdate }: Props) {
  const { user } = useAuth();
  const isPremium = user?.isPremium ?? false;

  const [opening, setOpening]       = useState<string | null>(null);
  const [likedIds, setLikedIds]     = useState<Set<string>>(new Set());
  const [likingId, setLikingId]     = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likeCount, setLikeCount]   = useState(0);

  // Load liked state from storage on mount and whenever tracks change
  useEffect(() => {
    getLikedTracks().then(liked => {
      setLikedIds(new Set(liked.map(l => l.trackId)));
      setLikeCount(liked.length);
    });
  }, [tracks]);

  if (!tracks.length) return (
    <View style={s.center}>
      <Empty
        icon="🎵"
        title="No tracks yet"
        sub={'Type how you feel in the Mood tab\nSpotify picks tracks for your emotion'}
      />
    </View>
  );

  // ── Like / Unlike ─────────────────────────────────────────────────
  const handleLike = async (track: SpotifyTrack) => {
    if (likingId === track.id) return;
    setLikingId(track.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const alreadyLiked = likedIds.has(track.id);

    if (alreadyLiked) {
      await unlikeTrack(track.id);
      setLikedIds(prev => { const n = new Set(prev); n.delete(track.id); return n; });
      setLikeCount(c => c - 1);
    } else {
      await likeTrack({
        trackId:     track.id,
        trackUri:    track.uri,
        trackName:   track.name,
        trackArtist: track.artists[0]?.name || '',
        artistId:    track.artists[0]?.id || '',
        emotion:     currentEmotion,
      });
      setLikedIds(prev => new Set(prev).add(track.id));
      setLikeCount(c => c + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setLikingId(null);
  };

  // ── Play / Open ───────────────────────────────────────────────────
  const handlePlay = async (track: SpotifyTrack) => {
    if (opening === track.id) return;
    setOpening(track.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const liked = likedIds.has(track.id);
    await addHistoryEntry(
      track.id, track.name,
      track.artists[0]?.name || '—',
      track.uri, currentEmotion, liked,
    );
    onHistoryUpdate();

    if (isPremium) {
      try {
        await playTrack(track.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Linking.openURL(track.external_urls.spotify);
      }
    } else {
      Linking.openURL(track.external_urls.spotify);
    }

    setOpening(null);
  };

  // ── Load More ─────────────────────────────────────────────────────
  // Fetches 20 more tracks personalised to liked tracks, skipping already shown
  const handleLoadMore = async () => {
    setLoadingMore(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const alreadyShownIds = tracks.map(t => t.id);
      // Get liked track IDs to use as Spotify seeds
      const likedSeeds = await getLikedSeedsForEmotion(currentEmotion);
      // Fetch 20 more, skip already shown
      const more = await getRecommendations(currentEmotion, 20, likedSeeds, alreadyShownIds);
      if (!more.length) {
        Alert.alert('No more tracks', 'Spotify has no more recommendations right now. Try liking more tracks to improve suggestions.');
        return;
      }
      onTracksUpdate([...tracks, ...more]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const emoColor  = EMOTION_COLOR[currentEmotion] || Colors.cyan;
  const headerArt = tracks[0]?.album.images[0]?.url;

  // ── Personalisation info banner ───────────────────────────────────
  const personalisedMsg =
    likeCount === 0
      ? 'Like tracks below to personalise future recommendations'
      : likeCount < 3
      ? `${likeCount} liked — like a few more to improve recommendations`
      : `Personalised from ${likeCount} liked track${likeCount > 1 ? 's' : ''}`;

  return (
    <View style={s.wrap}>
      {/* ── Top banner ── */}
      <View style={[s.banner, { borderBottomColor: emoColor + '28' }]}>
        {headerArt && <Image source={{ uri: headerArt }} style={s.bannerArt} />}
        <View style={s.bannerInfo}>
          <Text style={s.bannerEmo}>
            {EMOTION_EMOJI[currentEmotion]}{'  '}
            <Text style={{ color: emoColor, fontWeight: '700' }}>{currentEmotion}</Text>
            {'  ·  '}
            <Text style={s.bannerCount}>{tracks.length} tracks</Text>
          </Text>
          <Text style={s.bannerPersonalised}>
            {likeCount > 0 ? '❤️' : '💡'}{'  '}{personalisedMsg}
          </Text>
        </View>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={t => t.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity
            style={[s.loadMoreBtn, loadingMore && s.loadMoreBusy]}
            onPress={handleLoadMore}
            disabled={loadingMore}
            activeOpacity={0.75}
          >
            {loadingMore
              ? <ActivityIndicator color={Colors.cyan} size="small" />
              : <>
                  <Text style={s.loadMoreIco}>➕</Text>
                  <View>
                    <Text style={s.loadMoreTxt}>Load 20 more tracks</Text>
                    <Text style={s.loadMoreSub}>
                      {likeCount > 0
                        ? `Personalised from your ${likeCount} liked track${likeCount > 1 ? 's' : ''}`
                        : 'Like tracks above to personalise these'}
                    </Text>
                  </View>
                </>
            }
          </TouchableOpacity>
        }
        renderItem={({ item: track, index }) => {
          const art       = track.album.images[2]?.url || track.album.images[0]?.url;
          const liked     = likedIds.has(track.id);
          const isOpening = opening === track.id;
          const isLiking  = likingId === track.id;

          return (
            <View style={[s.tk, liked && s.tkLiked]}>
              {/* Album art */}
              <TouchableOpacity onPress={() => handlePlay(track)} activeOpacity={0.8} style={s.artWrap}>
                {art
                  ? <Image source={{ uri: art }} style={s.art} />
                  : <View style={s.artFallback}><Text style={s.artNum}>{index + 1}</Text></View>
                }
                {/* Play overlay */}
                <View style={[s.playOverlay, isOpening && s.playOverlayVisible]}>
                  <Text style={s.playOverlayIco}>{isOpening ? '⏳' : '▶'}</Text>
                </View>
              </TouchableOpacity>

              {/* Track info */}
              <TouchableOpacity style={s.tkInfo} onPress={() => handlePlay(track)} activeOpacity={0.7}>
                <Text style={s.tkName} numberOfLines={1}>{track.name}</Text>
                <Text style={s.tkArt}  numberOfLines={1}>{track.artists.map(a => a.name).join(', ')}</Text>
                <Text style={s.tkAlbum} numberOfLines={1}>{track.album.name}</Text>
              </TouchableOpacity>

              {/* Like button */}
              <TouchableOpacity
                style={[s.likeBtn, liked && s.likeBtnActive]}
                onPress={() => handleLike(track)}
                disabled={!!isLiking}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {isLiking
                  ? <ActivityIndicator color={Colors.red} size="small" />
                  : <Text style={[s.likeIco, liked && s.likeIcoActive]}>
                      {liked ? '❤️' : '🤍'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Space.md, paddingVertical: 12,
    backgroundColor: Colors.surface1, borderBottomWidth: 1,
  },
  bannerArt:          { width: 44, height: 44, borderRadius: 6 },
  bannerInfo:         { flex: 1 },
  bannerEmo:          { fontSize: 14, color: Colors.text1, marginBottom: 3 },
  bannerCount:        { color: Colors.text3, fontFamily: 'Courier New', fontSize: 12 },
  bannerPersonalised: { fontSize: 11, color: Colors.text2, fontFamily: 'Courier New' },

  list: { padding: Space.md, paddingBottom: 16 },

  // Track row
  tk: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 10,
  },
  tkLiked: { borderColor: 'rgba(255,61,90,0.30)', backgroundColor: 'rgba(255,61,90,0.05)' },

  artWrap:     { position: 'relative' },
  art:         { width: 52, height: 52, borderRadius: 8 },
  artFallback: { width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  artNum:      { fontSize: 13, color: Colors.text3, fontFamily: 'Courier New' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', opacity: 0,
  },
  playOverlayVisible: { opacity: 1 },
  playOverlayIco:     { fontSize: 20, color: '#fff' },

  tkInfo:  { flex: 1, minWidth: 0, gap: 2 },
  tkName:  { fontSize: 14, fontWeight: '700', color: Colors.text1 },
  tkArt:   { fontSize: 12, color: Colors.text2 },
  tkAlbum: { fontSize: 10, color: Colors.text3, fontFamily: 'Courier New' },

  // Like button — big enough to tap easily
  likeBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  likeBtnActive: { backgroundColor: 'rgba(255,61,90,0.12)', borderColor: 'rgba(255,61,90,0.35)' },
  likeIco:       { fontSize: 20 },
  likeIcoActive: { },

  // Load more footer
  loadMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border2,
    borderRadius: Radius.lg, padding: 16, marginTop: 12, marginBottom: 60,
  },
  loadMoreBusy: { opacity: 0.6, justifyContent: 'center' },
  loadMoreIco:  { fontSize: 24 },
  loadMoreTxt:  { fontSize: 15, fontWeight: '700', color: Colors.text1, marginBottom: 2 },
  loadMoreSub:  { fontSize: 11, color: Colors.text2, fontFamily: 'Courier New' },
});
