import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HackCard from '../components/HackCard';
import { HACKS, PLATFORMS } from '../data/hacks';
import { COLORS, FONT, RADIUS, SPACING } from '../theme';

const DIFFICULTY_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 };

const SORTS = [
  { id: 'rating', label: 'TOP RATED' },
  { id: 'title', label: 'A-Z' },
  { id: 'difficulty', label: 'DIFFICULTY' },
  { id: 'platform', label: 'PLATFORM' },
];

function sortHacks(list, sort) {
  const out = [...list];
  if (sort === 'title') return out.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'difficulty')
    return out.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
  if (sort === 'platform') return out.sort((a, b) => a.platform.localeCompare(b.platform));
  return out.sort((a, b) => b.rating - a.rating); // default: rating
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('All');
  const [sort, setSort] = useState('rating');

  const hacks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = HACKS.filter((h) => {
      if (platform !== 'All' && h.platform !== platform) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        (h.subtitle || '').toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    return sortHacks(filtered, sort);
  }, [query, platform, sort]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>POKEHACK</Text>
          <Text style={s.subheading}>INSTALLER</Text>
        </View>
        <TouchableOpacity style={s.emuButton} onPress={() => navigation.navigate('Emulators')}>
          <Text style={s.emuButtonText}>EMULATORS</Text>
        </TouchableOpacity>
      </View>
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
      <View style={s.chips}>
        {SORTS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            onPress={() => setSort(opt.id)}
            style={[s.sortChip, sort === opt.id && s.sortChipActive]}
          >
            <Text style={[s.sortText, sort === opt.id && s.sortTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={hacks}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ paddingBottom: SPACING.lg + insets.bottom }}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg },
  heading: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 20 },
  subheading: { color: COLORS.textSub, fontFamily: FONT.pixel, fontSize: 10, marginTop: SPACING.xs },
  emuButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emuButtonText: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 7 },
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
    marginTop: SPACING.md,
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
  sortChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sortChipActive: { borderColor: COLORS.primary },
  sortText: { color: COLORS.textMuted, fontFamily: FONT.pixel, fontSize: 6 },
  sortTextActive: { color: COLORS.primary },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xl, fontFamily: FONT.body, fontSize: 14 },
});
