import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, DIFFICULTY_COLORS, FONT, PLATFORM_COLORS, RADIUS, SPACING } from '../theme';
import { COVERS } from '../data/covers';

export default function HackCard({ hack, onPress }) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const platformColor = PLATFORM_COLORS[hack.platform] || COLORS.primary;
  const difficultyColor = DIFFICULTY_COLORS[hack.difficulty] || COLORS.textSub;
  const localCover = COVERS[hack.id];
  const useRemote = hack.coverUrl && !remoteFailed;
  const source = useRemote ? { uri: hack.coverUrl } : localCover;
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      {source ? (
        <Image
          source={source}
          style={s.cover}
          resizeMode="cover"
          onError={() => setRemoteFailed(true)}
        />
      ) : (
        <View style={[s.coverFallback, { backgroundColor: hack.accentColor || platformColor }]} />
      )}
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title} numberOfLines={1}>
            {hack.title}
          </Text>
          <Text style={hack.completed ? s.done : s.wip}>{hack.completed ? 'COMPLETE' : 'ACTIVE'}</Text>
        </View>
        <Text style={s.subtitle} numberOfLines={1}>
          {hack.subtitle}
        </Text>
        <View style={s.badges}>
          <Text style={[s.platform, { color: platformColor, borderColor: platformColor }]}>
            {hack.platform}
          </Text>
          <View style={s.difficulty}>
            <View style={[s.dot, { backgroundColor: difficultyColor }]} />
            <Text style={s.difficultyText}>{hack.difficulty}</Text>
          </View>
          <Text style={s.meta}>{hack.hours}</Text>
          <Text style={s.rating}>{hack.rating.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  cover: { width: 110, height: 96 },
  coverFallback: { width: 110, height: 96 },
  body: { flex: 1, padding: SPACING.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: COLORS.text, fontFamily: FONT.bodyBold, fontSize: 17, flex: 1, marginRight: SPACING.sm },
  done: { color: COLORS.success, fontFamily: FONT.pixel, fontSize: 7 },
  wip: { color: COLORS.warning, fontFamily: FONT.pixel, fontSize: 7 },
  subtitle: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 13, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  platform: {
    fontFamily: FONT.pixel,
    fontSize: 8,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  difficulty: { flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.md },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  difficultyText: { color: COLORS.textSub, fontFamily: FONT.bodySemi, fontSize: 12 },
  meta: { color: COLORS.textMuted, fontFamily: FONT.body, fontSize: 12, marginLeft: SPACING.md },
  rating: { color: COLORS.warning, fontFamily: FONT.pixel, fontSize: 8, marginLeft: SPACING.md },
});
