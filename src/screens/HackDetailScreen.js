import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { COLORS, DIFFICULTY_COLORS, FONT, PLATFORM_COLORS, RADIUS, SPACING } from '../theme';
import { COVERS } from '../data/covers';

function Info({ label, value, color }) {
  return (
    <View style={s.info}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function downloadSearchUrl(title) {
  // Open a web search for an active download instead of linking one directly.
  return 'https://www.google.com/search?q=' + encodeURIComponent(title + ' ROM hack download');
}

export default function HackDetailScreen({ route }) {
  const insets = useSafeAreaInsets();
  const [remoteFailed, setRemoteFailed] = React.useState(false);
  const hack = route.params.hack;
  const platformColor = PLATFORM_COLORS[hack.platform] || COLORS.primary;
  const difficultyColor = DIFFICULTY_COLORS[hack.difficulty] || COLORS.textSub;
  const accent = hack.accentColor || platformColor;
  const localCover = COVERS[hack.id];
  const heroSource = hack.coverUrl && !remoteFailed ? { uri: hack.coverUrl } : localCover;
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{
        padding: SPACING.md,
        paddingTop: SPACING.md + insets.top,
        paddingBottom: SPACING.xxl + insets.bottom,
      }}
    >
      {heroSource ? (
        <Image
          source={heroSource}
          style={s.heroCover}
          resizeMode="cover"
          onError={() => setRemoteFailed(true)}
        />
      ) : (
        <View style={[s.hero, { backgroundColor: accent }]} />
      )}
      <Text style={s.title}>{hack.title}</Text>
      <Text style={s.subtitle}>{hack.subtitle}</Text>
      <View style={s.tagRow}>
        {hack.tags.map((t) => (
          <Text key={t} style={s.tag}>
            {t}
          </Text>
        ))}
      </View>
      <View style={s.grid}>
        <Info label="PLATFORM" value={hack.platform} color={platformColor} />
        <Info label="BASE GAME" value={hack.baseGame} />
        <Info label="DIFFICULTY" value={hack.difficulty} color={difficultyColor} />
        <Info label="LENGTH" value={hack.hours} />
        <Info label="RATING" value={hack.rating.toFixed(1) + ' / 10'} />
        <Info label="STATUS" value={hack.completed ? 'Complete' : 'In progress'} color={hack.completed ? COLORS.success : COLORS.warning} />
      </View>

      <Text style={s.section}>THE HACK</Text>
      <Text style={s.body}>{hack.description}</Text>

      <Text style={s.section}>FEATURES</Text>
      {hack.features.map((f) => (
        <View key={f} style={s.featureRow}>
          <View style={[s.featureDot, { backgroundColor: accent }]} />
          <Text style={s.feature}>{f}</Text>
        </View>
      ))}

      <TouchableOpacity
        style={[s.findButton, { backgroundColor: accent }]}
        onPress={() => Linking.openURL(downloadSearchUrl(hack.title))}
      >
        <Text style={[s.findButtonText, { color: '#0a0a0f' }]}>FIND DOWNLOAD</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.linkButton} onPress={() => Linking.openURL(hack.projectUrl)}>
        <Text style={s.linkButtonText}>OPEN PROJECT PAGE</Text>
      </TouchableOpacity>

      <Text style={s.legal}>
        This app does not host or distribute any game files. Download links come from a web search
        you run yourself — only download content you have the legal right to own.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  heroCover: {
    width: '100%',
    aspectRatio: 480 / 270,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  hero: { height: 6, borderRadius: RADIUS.full, marginBottom: SPACING.md },
  title: { color: COLORS.text, fontFamily: FONT.pixel, fontSize: 15, lineHeight: 24 },
  subtitle: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 14, marginTop: SPACING.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm },
  tag: {
    color: COLORS.textSub,
    fontFamily: FONT.bodySemi,
    fontSize: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.md },
  info: { width: '50%', paddingVertical: SPACING.sm },
  infoLabel: { color: COLORS.textMuted, fontFamily: FONT.pixel, fontSize: 7 },
  infoValue: { color: COLORS.text, fontFamily: FONT.bodySemi, fontSize: 14, marginTop: 3 },
  section: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 10, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  body: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 14, lineHeight: 21 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  featureDot: { width: 6, height: 6, borderRadius: 3, marginRight: SPACING.sm },
  feature: { color: COLORS.text, fontFamily: FONT.body, fontSize: 14, flex: 1 },
  findButton: { alignItems: 'center', borderRadius: RADIUS.md, paddingVertical: 16, marginTop: SPACING.xl },
  findButtonText: { fontFamily: FONT.pixel, fontSize: 10 },
  linkButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginTop: SPACING.md,
  },
  linkButtonText: { color: COLORS.textSub, fontFamily: FONT.pixel, fontSize: 9 },
  legal: { color: COLORS.textMuted, fontFamily: FONT.body, fontSize: 11, textAlign: 'center', marginTop: SPACING.lg },
});
