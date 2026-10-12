#!/usr/bin/env bash
# Stands in for `flutter` in end-to-end tests of the action.
# Prints FAKE_FLUTTER_OUTPUT as the machine output and exits with
# FAKE_FLUTTER_EXIT_CODE. With --coverage, copies FAKE_FLUTTER_LCOV to
# coverage/lcov.info.
set -euo pipefail

echo 'Resolving dependencies...'
cat "${FAKE_FLUTTER_OUTPUT:?}"
echo 'warning from the fake flutter command' >&2

for arg in "$@"; do
  if [ "$arg" = '--coverage' ] && [ -n "${FAKE_FLUTTER_LCOV:-}" ]; then
    mkdir -p coverage
    cp "$FAKE_FLUTTER_LCOV" coverage/lcov.info
  fi
done

exit "${FAKE_FLUTTER_EXIT_CODE:-0}"
