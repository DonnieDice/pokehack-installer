import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONT, RADIUS, SPACING } from '../theme';
import { patchRom } from '../utils/patcher';

function FileRow({ number, title, hint, file, onPick, disabled }) {
  return (
    <View style={s.step}>
      <Text style={s.stepNumber}>{number}</Text>
      <View style={s.stepBody}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepHint}>{hint}</Text>
        {file ? (
          <Text style={s.fileSelected} numberOfLines={1}>
            {file.name}
          </Text>
        ) : null}
        <TouchableOpacity style={[s.pickButton, disabled && s.pickDisabled]} onPress={onPick} disabled={disabled}>
          <Text style={s.pickButtonText}>{file ? 'RE-PICK FILE' : 'PICK FILE'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PatcherScreen({ route }) {
  const hack = route.params.hack;
  const [rom, setRom] = useState(null);
  const [patch, setPatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isWeb = Platform.OS === 'web';
  const fmt = (hack.patchFormat || 'ips').toLowerCase();
  const canApply = !isWeb && fmt === 'ips' && rom && patch && !busy;

  async function pick(onSet) {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
    if (res && res.type === 'success') {
      onSet({ uri: res.uri, name: res.name || 'unnamed' });
    }
  }

  async function run() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const out = await patchRom({ romUri: rom.uri, patchUri: patch.uri, hack });
      setResult(out);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: SPACING.md }}>
      <Text style={s.title}>PATCHING: {hack.title.toUpperCase()}</Text>
      <Text style={s.hint}>
        This hack applies a {fmt.toUpperCase()} patch. Expected base ROM: {hack.baseRomName}
      </Text>

      {isWeb ? (
        <View style={s.notice}>
          <Text style={s.noticeText}>
            Patching runs in the Android app only — the web preview is for browsing the catalog.
          </Text>
        </View>
      ) : null}

      {fmt !== 'ips' ? (
        <View style={s.warnBox}>
          <Text style={s.warnText}>
            {fmt.toUpperCase()} support is still in development. IPS hacks work today — this one is tracked as a work item.
          </Text>
        </View>
      ) : null}

      <FileRow
        number="1"
        title="Pick your base ROM"
        hint="A clean dump of the game this hack is built on"
        file={rom}
        onPick={() => pick(setRom)}
        disabled={isWeb}
      />
      <FileRow
        number="2"
        title={'Pick the ' + fmt.toUpperCase() + ' patch file'}
        hint="Downloaded from the hack's project page"
        file={patch}
        onPick={() => pick(setPatch)}
        disabled={isWeb}
      />

      <TouchableOpacity style={[s.applyButton, !canApply && s.applyDisabled]} onPress={run} disabled={!canApply}>
        <Text style={s.applyText}>{busy ? 'PATCHING...' : 'APPLY PATCH'}</Text>
      </TouchableOpacity>

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorTitle}>PATCH FAILED</Text>
          <Text style={s.errorBody}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={s.successBox}>
          <Text style={s.successTitle}>PATCH COMPLETE</Text>
          <Text style={s.successBody}>
            {result.records} patch records applied.{'\n'}Output ({(result.size / 1024 / 1024).toFixed(1)} MB):{'\n'}
            {result.path}
          </Text>
          <Text style={s.successHint}>
            Copy the patched ROM to your emulator's games folder. Never distribute patched ROMs — share the patch file instead.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  title: { color: COLORS.text, fontFamily: FONT.pixel, fontSize: 11, lineHeight: 20, marginTop: SPACING.sm },
  hint: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 13, marginTop: SPACING.xs, marginBottom: SPACING.md },
  notice: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  noticeText: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 13 },
  warnBox: { backgroundColor: COLORS.errorDim, borderColor: COLORS.error, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  warnText: { color: COLORS.warning, fontFamily: FONT.bodySemi, fontSize: 13 },
  step: { flexDirection: 'row', marginBottom: SPACING.lg },
  stepNumber: { color: COLORS.primary, fontFamily: FONT.pixel, fontSize: 14, width: 28 },
  stepBody: { flex: 1 },
  stepTitle: { color: COLORS.text, fontFamily: FONT.bodySemi, fontSize: 15 },
  stepHint: { color: COLORS.textMuted, fontFamily: FONT.body, fontSize: 12, marginTop: 2 },
  fileSelected: { color: COLORS.success, fontFamily: FONT.bodySemi, fontSize: 12, marginTop: SPACING.sm },
  pickButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: 10, marginTop: SPACING.sm },
  pickDisabled: { opacity: 0.4 },
  pickButtonText: { color: COLORS.textSub, fontFamily: FONT.pixel, fontSize: 8 },
  applyButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: 16, marginTop: SPACING.md },
  applyDisabled: { opacity: 0.35 },
  applyText: { color: '#0a0a0f', fontFamily: FONT.pixel, fontSize: 10 },
  errorBox: { backgroundColor: COLORS.errorDim, borderColor: COLORS.error, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  errorTitle: { color: COLORS.error, fontFamily: FONT.pixel, fontSize: 9 },
  errorBody: { color: COLORS.textSub, fontFamily: FONT.body, fontSize: 13, marginTop: SPACING.sm },
  successBox: { backgroundColor: COLORS.successDim, borderColor: COLORS.success, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  successTitle: { color: COLORS.success, fontFamily: FONT.pixel, fontSize: 9 },
  successBody: { color: COLORS.text, fontFamily: FONT.body, fontSize: 13, marginTop: SPACING.sm },
  successHint: { color: COLORS.textMuted, fontFamily: FONT.body, fontSize: 11, marginTop: SPACING.sm },
});
