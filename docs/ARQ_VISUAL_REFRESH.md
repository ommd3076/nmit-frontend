# arQ visual refresh

The refresh sharpens the existing light operations UI: a route-and-waypoint brand mark, a quieter sage canvas, clearer type and panel hierarchy, roomier route tables, and tighter small-screen spacing. The same visual language carries through the command/map shell.

The generated route illustration lives at `frontend/src/assets/brand/arq-route-editorial.png`. It appears in the no-catalog state and in the repository README. It is decorative editorial artwork, not a map or a dispatch result; its alt text says so. No generated values or labels are shown as operational data.

The Vite page now uses its bundled Inter font and forest-green route favicon. It no longer fetches display fonts from Google at runtime.

## Build evidence

`cd frontend && npm run build` passed on 2026-10-31. TypeScript and Vite completed; Vite reported that the main JavaScript chunk exceeds 500 kB. No frontend test suite or device build was run in this change.
