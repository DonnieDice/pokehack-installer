import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// Regression coverage for the CI packaging guard added in #23:
// scripts/verify-apk-packaging.py must (a) exist and be runnable in the
// plain node:20 image of the unit-tests job, (b) be wired into BOTH
// android jobs in .gitlab-ci.yml, and (c) behave as a guard: exit 0 on a
// conforming packaging shape, exit 1 on each known startup-failure class.
// It is validated against synthetic in-repo APK fixtures built by the test
// itself (zipfile/manifest strings only — no Android SDK, no secrets).

const repoRoot = path.join(__dirname, '..', '..', '..');
const ci = fs.readFileSync(path.join(repoRoot, '.gitlab-ci.yml'), 'utf8');
const guardPath = path.join(repoRoot, 'scripts', 'verify-apk-packaging.py');

function runGuard(mode, apkPath) {
  try {
    execFileSync('python3', [guardPath, '--mode', mode, apkPath], { encoding: 'utf8' });
    return { code: 0 };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || '' };
  }
}

describe('CI packaging guard wiring (issue #23)', () => {
  test('the guard script exists and is runnable', () => {
    expect(fs.existsSync(guardPath)).toBe(true);
    const out = execFileSync('python3', [guardPath, '--help'], { encoding: 'utf8' });
    expect(out).toContain('--mode');
  });

  test('android-debug-apk job runs the guard in debug mode after the build', () => {
    expect(ci).toContain(
      'python3 $CI_PROJECT_DIR/scripts/verify-apk-packaging.py --mode debug android/app/build/outputs/apk/debug/*.apk'
    );
  });

  test('android-release-apk job runs the guard in release mode after the build', () => {
    expect(ci).toContain(
      'python3 $CI_PROJECT_DIR/scripts/verify-apk-packaging.py --mode release android/app/build/outputs/apk/release/*.apk'
    );
  });
});

describe('CI packaging guard behavior against real fixture APKs (issue #23)', () => {
  const fixtures = path.join(repoRoot, 'src', 'utils', '__tests__', '__apk_fixtures__');
  const mk = (name) => path.join(fixtures, name);

  beforeAll(() => {
    fs.rmSync(fixtures, { recursive: true, force: true });
    fs.mkdirSync(fixtures, { recursive: true });
    // Build fixtures with python zipfile (same primitive the guard reads).
    const py = `
import zipfile, sys
def apk(path, manifest, bundle=None):
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('AndroidManifest.xml', manifest)
        if bundle is not None:
            z.writestr('assets/index.android.bundle', bundle)
APP_ID = 'cloud.dicematrix.pokehackinstaller'
mf = b'\\x03\\x00' + APP_ID.encode('utf-16-le') + APP_ID.encode('utf-16-le')
ok_bundle = b'x' + b'AppRegistry' * 20000
apk(${JSON.stringify(mk('ok-release.apk'))}, mf, ok_bundle)
apk(${JSON.stringify(mk('no-bundle-release.apk'))}, mf)
apk(${JSON.stringify(mk('wrong-id-release.apk'))}, 'other.app.id'.encode('utf-16-le'), ok_bundle)
apk(${JSON.stringify(mk('debug-suffix-release.apk'))}, (APP_ID + '.debug').encode('utf-16-le'), ok_bundle)
apk(${JSON.stringify(mk('ok-debug.apk'))}, (APP_ID + '.debug').encode('utf-16-le'))
apk(${JSON.stringify(mk('same-id-debug.apk'))}, APP_ID.encode('utf-16-le'))
`;
    execFileSync('python3', ['-c', py], { encoding: 'utf8' });
  });

  afterAll(() => {
    fs.rmSync(fixtures, { recursive: true, force: true });
  });

  test('release mode passes a conforming APK', () => {
    const r = runGuard('release', mk('ok-release.apk'));
    expect(r.code).toBe(0);
  });

  test('release mode fails an APK without the embedded bundle', () => {
    const r = runGuard('release', mk('no-bundle-release.apk'));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('no embedded JS bundle');
  });

  test('release mode fails an APK with a non-app bundle id', () => {
    const r = runGuard('release', mk('wrong-id-release.apk'));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('canonical application id');
  });

  test('release mode fails an APK carrying the .debug suffix', () => {
    const r = runGuard('release', mk('debug-suffix-release.apk'));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('.debug');
  });

  test('debug mode passes a suffixed debug APK', () => {
    const r = runGuard('debug', mk('ok-debug.apk'));
    expect(r.code).toBe(0);
  });

  test('debug mode fails the delivered-artifact shape (same id, no suffix)', () => {
    // This is exactly the job-53192 class that signature-conflicted with
    // the signed release install and showed "Unable to load script".
    const r = runGuard('debug', mk('same-id-debug.apk'));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("'.debug' application-id suffix");
  });
});
