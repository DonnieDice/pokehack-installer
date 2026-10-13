#!/usr/bin/env python3
"""Packaging regression guard for standalone-APK startup (issues #21/#23/#24).

Root cause this guard locks in: the delivered debug APK (job 53192) shipped
Metro-only (no embedded JS bundle) under the SAME application id as the signed
release app, so a standalone install showed the RN "Unable to load script"
error surface instead of the app, and the same-id + different-cert combination
made later release installs fail with INSTALL_FAILED_UPDATE_INCOMPATIBLE.
The fixes (applicationIdSuffix ".debug" for debug builds, embedded release
bundle) landed on main; this guard makes CI fail if either property regresses.

Pure stdlib (zipfile + compiled-AXML string scan) so it runs in the same
mingc/android-build-box image the jobs already use. Exit 0 = packaging OK,
exit 1 = regression detected (with a named reason).

Usage:
  python3 scripts/verify-apk-packaging.py --mode debug  <apk>
  python3 scripts/verify-apk-packaging.py --mode release <apk>
"""
import argparse
import re
import sys
import zipfile

MIN_BUNDLE_BYTES = 100_000  # a Metro/Hermes release bundle for this app is ~1.2 MiB
APP_ID = "cloud.dicematrix.pokehackinstaller"
DEBUG_SUFFIX = APP_ID + ".debug"


def manifest_text(apk: zipfile.ZipFile) -> str:
    # Compiled binary AXML stores strings as UTF-16LE; an errors-tolerant
    # decode + regex is enough to read the application id / component names.
    raw = apk.read("AndroidManifest.xml")
    return raw.decode("utf-16-le", errors="ignore")


def check_debug(apk_path: str) -> int:
    with zipfile.ZipFile(apk_path) as apk:
        mf = manifest_text(apk)
        if DEBUG_SUFFIX not in mf:
            print(
                "FAIL: debug APK does not carry the '.debug' application-id "
                f"suffix ({DEBUG_SUFFIX} absent from AndroidManifest.xml). A "
                "same-id debug artifact signature-conflicts with the signed "
                "release app (INSTALL_FAILED_UPDATE_INCOMPATIBLE) and shadows "
                "the real launcher icon. See issues #21/#23/#24."
            )
            return 1
        print(f"OK: debug APK application id is distinct ({DEBUG_SUFFIX}).")
        return 0


def check_release(apk_path: str) -> int:
    with zipfile.ZipFile(apk_path) as apk:
        mf = manifest_text(apk)
        if DEBUG_SUFFIX in mf:
            print(
                "FAIL: release APK carries the '.debug' application-id suffix "
                f"({DEBUG_SUFFIX} present in AndroidManifest.xml). The release "
                "artifact must keep the canonical application id."
            )
            return 1
        if APP_ID not in mf:
            print(
                f"FAIL: canonical application id {APP_ID} missing from the "
                "release AndroidManifest.xml."
            )
            return 1
        names = apk.namelist()
        if "assets/index.android.bundle" not in names:
            print(
                "FAIL: release APK has no embedded JS bundle "
                "(assets/index.android.bundle). A Metro-less standalone "
                "install cannot start (RN 'Unable to load script' class). "
                "See issues #21/#23/#24."
            )
            return 1
        bundle = apk.read("assets/index.android.bundle")
        if len(bundle) < MIN_BUNDLE_BYTES:
            print(
                f"FAIL: embedded JS bundle is only {len(bundle)} bytes "
                f"(< {MIN_BUNDLE_BYTES}); a real app bundle is expected."
            )
            return 1
        if b"AppRegistry" not in bundle:
            print(
                "FAIL: embedded JS bundle does not contain the React Native "
                "AppRegistry entry point; it is not an app bundle."
            )
            return 1
        print(
            f"OK: release APK embeds a valid app bundle "
            f"({len(bundle)} bytes, AppRegistry entry point present) under "
            f"the canonical id {APP_ID}."
        )
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["debug", "release"], required=True)
    parser.add_argument("apk")
    args = parser.parse_args()
    if args.mode == "debug":
        return check_debug(args.apk)
    return check_release(args.apk)


if __name__ == "__main__":
    sys.exit(main())
