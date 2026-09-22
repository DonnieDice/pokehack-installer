import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HackCard from '../components/HackCard';
import { HACKS, PLATFORMS } from '../data/hacks';
import { COLORS, FONT, RADIUS, SPACING } from '../theme';

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('All');

  const hacks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HACKS.filter((h) => {
      if (platform !== 'All' && h.platform !== platform) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        (h.subtitle || '').toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, platform]);

  return (
    <View style={s.root}>
      <Text style={s.heading}>POKEHACK</Text>
      <Text style={s.subheading}>INSTALLER</Text>
      <TextInput
        style={s.search}
        placeholder="Search hacks..."
        placeholderTextColor={COLORS.textMuted}
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.chips}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPlatform(p)}
            style={[s.chip, platform === p && s.chipActive]}
          >
            <Text style={[s.chipText, platform === p && s.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={hacks}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ paddingBottom: SPACING.lg }}
        renderItem={({ item }) => (
          <HackCard hack={item} onPress={() => navigation.navigate('HackDetail', { hack: item })} />
        )}
        ListEmptyComponent={<Text style={s.empty}>No hacks match your search.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.md },
  heading: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 20, marginTop: SPACING.lg },
  subheading: { color: COLORS.textSub, fontFamily: FONT.pixel, fontSize: 10, marginTop: SPACING.xs, marginBottom: SPACING.md },
  search: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    fontFamily: FONT.body,
    fontSize: 15,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: SPACING.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  chipActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSub, fontSize: 12, fontFamily: FONT.bodySemi },
  chipTextActive: { color: COLORS.primary },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xl, fontFamily: FONT.body, fontSize: 14 },
});
