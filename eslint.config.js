// Expo's own flat config (OAT-92). Not hand-rolled: eslint-config-expo ships the
// parser, resolver and plugin set matched to this SDK, and already bundles
// eslint-plugin-react-hooks.
//
// WHY THIS TICKET EXISTS: react-hooks/rules-of-hooks catches, in milliseconds,
// the class of bug that shipped in PR #26 — a useState placed after an early
// return, which rendered Profile blank with 107/107 tests green and tsc clean.
const expoConfig = require("eslint-config-expo/flat");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*", "android/*", "ios/*"]
  },
  {
    rules: {
      // Expo already sets this to error. Stated explicitly anyway: it is the
      // single rule this ticket is justified by, and it must not silently
      // downgrade if the shared config changes.
      "react-hooks/rules-of-hooks": "error",

      // ---------------------------------------------------------------------
      // DOWNGRADED TO WARN, DELIBERATELY AND REVERSIBLY. Every violation is
      // listed in the OAT-92 PR. These are React-Compiler-era rules from
      // react-hooks v7; each failure below needs a real refactor of shipped,
      // working code, and the ticket says report before changing behaviour.
      // They stay visible as warnings rather than being switched off.
      //
      //   react-hooks/refs (26)  useRef(new Animated.Value()).current read
      //                          during render — the standard RN idiom, in the
      //                          animation helpers on index/quiz/results.
      //   react-hooks/immutability (6)  Reanimated shared-value writes in
      //                          discover's swipe deck.
      //   react-hooks/set-state-in-effect (3)  setState from the async
      //                          fetch effects and the store's cities floor.
      // ---------------------------------------------------------------------
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",

      // Apostrophes in copy. JSX renders entities fine, but escaping four
      // strings makes the source worse to read for no user-visible change.
      "react/no-unescaped-entities": "warn"
    }
  },
  {
    // jest.setup.js and the suite run under Jest globals.
    files: ["jest.setup.js", "__tests__/**/*.{ts,tsx}"],
    languageOptions: { globals: { jest: "readonly", ...require("globals").node } }
  }
]);
