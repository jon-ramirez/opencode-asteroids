# AGENTS.md

## Commands

- No build/test/lint tooling exists — zero-dependency static site; verification is manual in the browser.
- Run: open `index.html` directly, or `npx serve .` → http://localhost:3000.

## Architecture

- Entire game is one file, `game.js` (~420 lines), loaded via `<script>` from `index.html`. No modules or imports.
- Canvas size is hardcoded in two places that must stay in sync: `width`/`height` attributes in `index.html` and `W`/`H` constants in `game.js`.
- Loop: `requestAnimationFrame` → `update(dt)` + `draw()`; `dt` is capped at 0.05 s in `loop()`.
- Game state lives in module-level `let` variables; `state` is `'playing' | 'dead' | 'gameover'`, and entity arrays are rebuilt by `initGame()` / `nextLevel()`.
- Space is toroidal: route all position updates through `wrap()`.

## Conventions

- User-facing strings and comments are in Spanish — keep new ones in Spanish.
- Rendering is white stroke outlines on black (`ctx.stroke()`, no fills).
- Input uses `justPressed` / `pressed(code)` edge detection; `pressed()` consumes the flag, so call it at most once per key per frame.

## Known discrepancy

- `README.md` advertises power-ups and a special "estrella fugaz" asteroid; neither is implemented in `game.js`. Trust the code over the README.
