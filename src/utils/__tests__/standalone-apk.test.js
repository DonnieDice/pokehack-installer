import fs from 'fs';
import path from 'path';

// Regression coverage for the standalone-APK startup failure saga
// (issues #21 / #23 / #24). The delivered release APK (job 53200,
// e441950) embedded a valid JS bundle, but the delivered debug APK
// (job 53192) had NO bundle and shared the release package id
// (cloud.dicematrix.pokehackinstaller) with a *different* signing
// certificate (Android Debug vs DiceMatrix upload key). Installing the
// debug artifact first made every later release install fail with
// INSTALL_FAILED_UPDATE_INCOMPATIBLE (signature mismatch), so the
// operator's device kept running the bundle-less debug app — which
// shows "Unable to load script" instead of the app. The fix landed on
// main (b74fee4/!14 + 7aece45/!16): the debug buildType gets an
// applicationIdSuffix so debug artifacts can never collide with or
// shadow the release app, and the two gradle jobs are serialized so
// concurrent builds stop OOM-killing the daemon.
//
// These tests pin the CI packaging invariants that keep standalone
// release installs launchable. They read .gitlab-ci.yml exactly as the
// runner does; no Android SDK is required, so they run in the plain
// `unit-tests` job on every MR pipeline.

const repoRoot = path.join(__dirname, '..', '..', '..');
const ciPath = path.join(repoRoot, '.gitlab-ci.yml');
const ci = fs.readFileSync(ciPath, 'utf8');

function jobBlock(name) {
  const start = ci.indexOf(`${name}:`);
  if (start === -1) {
    throw new Error(`job ${name} missing from .gitlab-ci.yml`);
  }
  // A job block runs until the next top-level key (column-0 line).
  const rest = ci.slice(start + name.length + 1);
  const lines = rest.split('\n');
  const block = [`${name}:`];
  for (const line of lines.slice(1)) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(line)) break;
    block.push(line);
  }
  return block.join('\n');
}

describe('standalone APK startup regression (issues #21/#23/#24)', () => {
  describe('android-release-apk job', () => {
    const job = jobBlock('android-release-apk');

    test('runs the gradle task that embeds the JS bundle in the APK', () => {
      // createBundleReleaseJsAndAssets is the task that writes
      // assets/index.android.bundle. assembleRelease depends on it, but
      // the standalone-launch guarantee is the bundle actually being
      // packaged — pin the assemble invocation and the artifacts path.
      expect(job).toContain('./gradlew assembleRelease --no-daemon');
    });

    test('publishes the release APK as a job artifact', () => {
      expect(job).toContain('android/app/build/outputs/apk/release/*.apk');
    });

    test('fails closed when the protected signing variables are absent', () => {
      // An unsigned release artifact would install nowhere over the
      // signed delivery — the fail-closed guard keeps the pipeline
      // from producing a trap artifact.
      expect(job).toContain('ANDROID_KEYSTORE_B64');
      expect(job).toMatch(/exit 1/);
    });

    test('signs the release buildType with the env-fed upload keystore', () => {
      // The release signingConfig must NOT fall back to the debug
      // keystore: a release signed with the Android Debug key can never
      // update over the delivered DiceMatrix-signed app.
      expect(job).toContain('signingConfig signingConfigs.release');
      expect(job).toContain('minifyEnabled false');
    });

    test('never references the invalid RN 0.73 bundleInDebug property', () => {
      // bundleInDebug is not a ReactExtension property in RN 0.73
      // (pipeline 4613 job 56269 failed on exactly this). It must not
      // come back.
      expect(ci).not.toContain('bundleInDebug');
    });
  });

  describe('android-debug-apk job', () => {
    const job = jobBlock('android-debug-apk');

    test('gives debug its own applicationId suffix', () => {
      // Core fix: a debug artifact must never share the release
      // package id, or it shadows/collides with the signed release
      // install (signature mismatch -> INSTALL_FAILED_UPDATE_INCOMPATIBLE
      // on every later release install).
      expect(job).toContain('applicationIdSuffix "debug"');
    });

    test('fails closed when the prebuild anchors are missing', () => {
      // The suffix is injected into the prebuild-generated
      // build.gradle; if Expo's template drifts, the patch must fail
      // loudly instead of silently shipping a colliding debug APK.
      expect(job).toContain("FATAL: expected debug buildType signingConfig line not found");
    });
  });

  describe('gradle build serialization', () => {
    test('both android jobs share one resource_group', () => {
      // Two concurrent gradle builds on the android runner repeatedly
      // OOM ("Gradle build daemon disappeared unexpectedly" — jobs
      // 53208 and 56333). Serializing debug and release builds keeps
      // the release artifact buildable at all.
      const debug = jobBlock('android-debug-apk');
      const release = jobBlock('android-release-apk');
      expect(debug).toMatch(/resource_group:\s*android-gradle/);
      expect(release).toMatch(/resource_group:\s*android-gradle/);
    });
  });

  describe('app packaging configuration', () => {
    test('app.json android.package stays the release package id', () => {
      const appJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
      expect(appJson.expo.android.package).toBe('cloud.dicematrix.pokehackinstaller');
    });

    test('the app entry stays the Expo AppEntry (prebuild generates the android entry)', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
      expect(pkg.main).toBe('node_modules/expo/AppEntry.js');
    });

    test('App.js gates on fonts but still renders a root while loading', () => {
      // The useFonts gate must render an ActivityIndicator fallback,
      // not return null — a null root renders nothing on standalone
      // installs while fonts resolve from the APK's res/ font files.
      const app = fs.readFileSync(path.join(repoRoot, 'App.js'), 'utf8');
      expect(app).toContain('useFonts');
      expect(app).toContain('ActivityIndicator');
      expect(app).not.toMatch(/return\s+null\s*;?\s*\}/);
    });
  });
});
