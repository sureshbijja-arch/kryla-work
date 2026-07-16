# SDD Progress Ledger — Kryla PWA

Plan: docs/superpowers/plans/2026-07-15-kryla-pwa.md
Branch: feat/pwa-installable-apps
BASE commit (before Task 1): d2b007c47152681ed372890a1527c93e8efc3ed9

## Tasks

- [x] Task 1: Install packages + generate Kryla app icons (commits d2b007c..6103c2d, review clean)
- [x] Task 2: Service worker + next.config.js (commits 6103c2d..b4dca98, review clean)
- [x] Task 3: Dynamic manifest route handlers (commits b4dca98..a0a4c17, review clean after fix)
- [x] Task 4: Viewport meta + layout files (commits a0a4c17..939060e, review clean)
- [x] Task 5: Safe-area CSS + Tailwind utilities (commits 939060e..e428e57, review clean)
- [x] Task 6: Middleware bypass rules (commits e428e57..e838a31, review clean)
- [x] Task 7: Install page + useInstallPrompt hook (commits e838a31..215996b, review clean after fix)
- [x] Task 8: Install banner component (commits 215996b..1ecec2b, review clean)
- [x] Task 9: PwaActionBar (customer app) (commits 1ecec2b..dc98ae0, review clean)
- [x] Task 10: Install links in page-live notification (commits dc98ae0..b6728c7, review clean)
- [x] Task 11: ShareAppCard in My Chat Refer tab (commits b6728c7..dbb2e69, review clean)
- [x] Task 12: wa_auth_otps DB migration (commits dbb2e69..f6a5e00, infra complete)
- [x] Task 13: WhatsApp OTP API routes (commits f6a5e00..79ecdcb, review clean — minor: lockout fires on attempt 6 not 5; hashOtp/normalisePhone duplicated; failed WA send leaves 60s cooldown active)
- [x] Task 14: Login page WhatsApp option (commits 79ecdcb..9d7074b, review clean — minor: segment buttons missing type="button"; channel-switch doesn't reset otp/step; no autoFocus on OTP input)
- [x] Task 15: MyChatTabBar component (commits 9d7074b..b1c21dd, review clean)
- [x] Task 16: Wire mobile shell into SpaceClient (commits b1c21dd..a5aff02, review clean after fix — 8 child tab components needed isMobile prop for pwa-bottom-nav-clearance)
- [x] Task 17: Studio overlays full-screen on mobile (commits a5aff02..d8d08ff, review clean — both studios were already fixed inset-0; isMobile hook added but conditional is a no-op; cleanup Minor)

## Log

Task 1: complete (commits d2b007c..6103c2d, review clean)
Task 2: complete (commits 6103c2d..b4dca98, review clean)
Task 3: complete (commits b4dca98..a0a4c17, review clean after fix — error handling + fallback chain)
Task 4: complete (commits a0a4c17..939060e, review clean)
Task 5: complete (commits 939060e..e428e57, review clean)
Task 6: complete (commits e428e57..e838a31, review clean)
Task 7: complete (commits e838a31..215996b, review clean after fix — useCallback on installApp)
Task 8: complete (commits 215996b..1ecec2b, review clean)
Task 9: complete (commits 1ecec2b..dc98ae0, review clean)
Task 10: complete (commits dc98ae0..b6728c7, review clean)
Task 11: complete (commits b6728c7..dbb2e69, review clean)
Task 12: complete (commits dbb2e69..f6a5e00, table created in Supabase + OTP_SECRET added to .env.local — add to Vercel dashboard manually)
Task 13: complete (commits f6a5e00..79ecdcb, review clean — minor: lockout fires on attempt 6 not 5; hashOtp/normalisePhone duplicated; failed WA send leaves 60s cooldown active)
Task 14: complete (commits 79ecdcb..9d7074b, review clean — minor: segment buttons missing type="button"; channel-switch doesn't reset otp/step; no autoFocus on OTP input)
Task 15: complete (commits 9d7074b..b1c21dd, review clean)
Task 16: complete (commits b1c21dd..a5aff02, review clean after fix — 8 child tab components needed isMobile prop)
Task 17: complete (commits a5aff02..d8d08ff, review clean — studios already full-screen; isMobile hook added as spec required, dead conditional Minor cleanup)

Final-review fixes: complete (commit 2830f876 — MSStream TS cast, OTP lockout confirmed correct at > 5, failed-send cooldown rollback added; TSC clean zero errors)
