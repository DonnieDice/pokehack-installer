import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMULATORS, playStoreSearchUrl } from '../data/emulators';
import { COLORS, FONT, PLATFORM_COLORS, RADIUS, SPACING } from '../theme';

function EmuIcon({ emu }) {
  const [failed, setFailed] = React.useState(false);
  if (!emu.iconUrl || failed) {
    return (
      <View style={[s.icon, { backgroundColor: COLORS.primaryDim, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.iconLetter}>{emu.name.charAt(0)}</Text>
      </View>
    );
  }
  return (
    <Image source={{ uri: emu.iconUrl }} style={s.icon} onError={() => setFailed(true)} />
  );
}

export default function EmulatorsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  function open(url) {
    Linking.openURL(url);
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{
        padding: SPACING.md,
        paddingTop: SPACING.md + insets.top,
        paddingBottom: SPACING.xxl + insets.bottom,
      }}
    >
      <Text style={s.heading}>EMULATORS</Text>
      <Text style={s.blurb}>
        Free and paid Android emulators for the platforms in this catalog. PLAY STORE links open a
        search for the app so they never go stale.
      </Text>

      {EMULATORS.map((emu) => (
        <View key={emu.id} style={s.card}>
          <View style={s.cardTop}>
            <EmuIcon emu={emu} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={s.name}>{emu.name}</Text>
              <Text style={s.price}>{emu.price}</Text>
            </View>
          </View>
          <Text style={s.note}>{emu.note}</Text>
          <View style={s.platformRow}>
            {emu.platforms.map((p) => (
              <Text key={p} style={[s.platform, { color: PLATFORM_COLORS[p] || COLORS.primary, borderColor: PLATFORM_COLORS[p] || COLORS.primary }]}>
                {p}
              </Text>
            ))}
          </View>
          <View style={s.buttonRow}>
            <TouchableOpacity style={s.playButton} onPress={() => open(playStoreSearchUrl(emu.playQuery))}>
              <Text style={s.playButtonText}>PLAY STORE</Text>
            </TouchableOpacity>
            {emu.siteUrl ? (
              <TouchableOpacity style={s.siteButton} onPress={() => open(emu.siteUrl)}>
                <Text style={s.siteButtonText}>WEBSITE</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  heading: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 20, marginBottom: SPACING.sm },
  blurb: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 13, lineHeight: 19, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 10 },
  iconLetter: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 16 },
  name: { color: COLORS.text, fontFamily: FONT.bodyBold, fontSize: 16 },
  price: { color: COLORS.warning, fontFamily: FONT.pixel, fontSize: 7 },
  note: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm },
  platform: {
    fontFamily: FONT.pixel,
    fontSize: 8,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  buttonRow: { flexDirection: 'row', marginTop: SPACING.md },
  playButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    marginRight: SPACING.sm,
  },
  playButtonText: { color: '#0a0a0f', fontFamily: FONT.pixel, fontSize: 8 },
  siteButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
  },
  siteButtonText: { color: COLORS.textSub, fontFamily: FONT.pixel, fontSize: 8 },
});
