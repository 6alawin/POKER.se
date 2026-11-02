# In-game chat layout audit

## Before

- The expanded panel used a 728 × 818 px design with a separate viewport-width/height media-query scale, independent of the table dimensions.
- At 1366 × 768, the regular `.82` scale produced a panel about 597 × 671 px; the fixed bottom offset placed its top near −48 px, clipping the panel into the header. The available stage height above the action bar was about 525 px.
- `chatDemo` forced a separate scale of `1` and bottom offset of 156 px, so the demo preview did not exercise the regular responsive layout.
- The message list already had `min-height: 0` and scrolling, but the panel itself was not constrained to the stage/action-bar space. Own messages rendered inline with a gray 8-ball marker rather than a distinct cyan own-message bubble.

## After

`chat-layout-audit.mjs` measures the header, stage, table, keep-clear game controls/seats, chat panel and chat font sizes, and saves expanded/collapsed screenshots across the required viewport matrix. Expanded chat follows the reference's 728 × 818 design proportions, scales to fit between the stage top and action bar, and stays inside those bounds in all seven cases. The floating panel intentionally overlays parts of the play surface at standard desktop sizes; the action bar remains clear. Collapsed-chat sizing and styles are unchanged.

| Viewport | Expanded panel | Keep-clear intersections |
| --- | ---: | ---: |
| 1280 × 720 | 405 × 455 | 6* |
| 1366 × 768 | 446 × 501 | 6* |
| 1536 × 864 | 531 × 597 | 6* |
| 1707 × 960 | 617 × 693 | 6* |
| 1920 × 1080 | 724 × 813 | 6* |
| 2560 × 1440 | 728 × 818 | 0 |
| 3413 × 1920 | 728 × 818 | 0 |

\* The audit reports intersections with seat/card-area markers, which the floating expanded panel covers; it separately asserts the panel stays below the header and above the action bar.

`layout-audit-after.json` contains the element rectangles and computed font details. The paired `chat-layout-*` and `chat-collapsed-layout-*` PNGs are full-page review captures.
