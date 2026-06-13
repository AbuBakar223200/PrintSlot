#!/usr/bin/env node
/**
 * check-ui-parity — design-system contract scanner.
 *
 * Encodes the machine-checkable rules from `docs/09-ui-ux-design-spec.md`, the
 * prototype (`prototype/styles.css` + `app.js`), and the React Native rules in
 * `CLAUDE.md` / `AGENTS.md`, then scans the mobile app for drift. This is the
 * repeatable "check" half of keeping the migrated UI consistent with the
 * prototype — the visual/structural half lives in the per-screen checklist in
 * `apps/mobile/UI-PARITY.md`.
 *
 *   node scripts/check-ui-parity.mjs        # report, exit 1 on any error
 *   npm run ui:parity                       # same, via package script
 *
 * Rules (errors fail the run):
 *   1. raw-hex      — hex colors in screens/feature/shared code. Color must come
 *                     from `useThemeTokens()` so light/dark + AA stay correct.
 *   2. rn-primitive — Text/Button/Switch/TextInput imported from 'react-native'
 *                     instead of the design-system barrel (@/components/ui).
 *   3. touchable    — Touchable* used instead of Pressable.
 *   4. emoji        — emoji glyphs (icons are lucide-only; ৳ + Bengala are allowed).
 *
 * Advisory (warns, never fails):
 *   5. falsy-and    — `{value && <JSX/>}` where `value` may be 0/'' → RN crash.
 *                     Heuristic; confirm each by hand.
 *
 * Color tokens / theme primitives are exempt (they DEFINE the palette):
 * src/theme/** and src/components/ui/**.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SCAN_DIRS = ['app', 'src'];
const CODE_EXT = /\.(ts|tsx)$/;
const SKIP_FILE = /\.(test|spec)\.(ts|tsx)$/;

/** Normalize to forward-slash for portable path matching on Windows. */
const norm = (p) => p.split(sep).join('/');

/** Files that are allowed to contain raw color literals (they define the palette). */
function isPaletteFile(rel) {
  const p = norm(rel);
  return p.includes('src/theme/') || p.includes('src/components/ui/');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue;
      walk(full, out);
    } else if (CODE_EXT.test(name) && !SKIP_FILE.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;
const RN_IMPORT = /from\s+['"]react-native['"]/;
const RN_PRIMITIVE = /\b(Text|Button|Switch|TextInput)\b/;
const TOUCHABLE = /\bTouchable(Opacity|Highlight|WithoutFeedback)\b/;
// Emoji blocks only — excludes Bengali (U+0980–09FF) and ৳ (U+09F3) and common punctuation.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}]/u;
// `{ ident && <` or `{ a.b && (` — left side not guarded by !! or a comparison.
const FALSY_AND = /\{\s*[A-Za-z_$][\w.$?]*\s*&&\s*[(<]/;
const SAFE_AND = /(!!|===|!==|>=|<=|>|<|\?\?|\.length\b|\.size\b|Boolean\()/;

const errors = [];
const warnings = [];

for (const dirName of SCAN_DIRS) {
  const base = join(MOBILE_ROOT, dirName);
  let files;
  try {
    files = walk(base);
  } catch {
    continue;
  }
  for (const file of files) {
    const rel = relative(MOBILE_ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    const palette = isPaletteFile(rel);

    lines.forEach((line, i) => {
      const ln = i + 1;
      const code = line.replace(/\/\/.*$/, '');

      if (!palette && HEX.test(code)) {
        errors.push(`${norm(rel)}:${ln}  raw-hex      use useThemeTokens() →  ${line.trim()}`);
      }
      if (RN_IMPORT.test(code) && RN_PRIMITIVE.test(code)) {
        errors.push(`${norm(rel)}:${ln}  rn-primitive import from @/components/ui →  ${line.trim()}`);
      }
      if (TOUCHABLE.test(code)) {
        errors.push(`${norm(rel)}:${ln}  touchable    use Pressable →  ${line.trim()}`);
      }
      if (EMOJI.test(code)) {
        errors.push(`${norm(rel)}:${ln}  emoji        icons are lucide-only →  ${line.trim()}`);
      }
      if (FALSY_AND.test(code) && !SAFE_AND.test(code)) {
        warnings.push(`${norm(rel)}:${ln}  falsy-and    guard with !! / > 0 →  ${line.trim()}`);
      }
      // Raw font sizes in screens/features bypass the type ramp (fonts.ts) → drift.
      // Primitives + the floating tab bars legitimately set sizes, so they're exempt.
      if (
        /\bfontSize:\s*\d/.test(code) &&
        !palette &&
        !norm(rel).includes('components/shared')
      ) {
        warnings.push(`${norm(rel)}:${ln}  font-size    use a <Text variant>, not raw fontSize →  ${line.trim()}`);
      }
    });
  }
}

if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} advisory (review by hand, not failing):`);
  for (const w of warnings) console.log('   ' + w);
}

if (errors.length) {
  console.error(`\n✗  ${errors.length} UI parity error(s):`);
  for (const e of errors) console.error('   ' + e);
  console.error('\nFix each or justify in the PR. See apps/mobile/UI-PARITY.md.\n');
  process.exit(1);
}

console.log(`\n✓  UI parity clean — no token/primitive/icon drift.${warnings.length ? ` (${warnings.length} advisory above)` : ''}\n`);
