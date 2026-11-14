# Recovery of uncommitted hosting changes

The hosting snapshot labelled August 20, 2026 contains a Vite build whose source changes were missing from GitHub. Recovery starts from `backend` commit `0365fdd89981b3a275ff5161a1da265d6f8eb570` (April 1, 2026). GitHub refs were fetched during recovery: `backend` still pointed to that commit; `main` pointed to the older `ebbe8e4` merge. This branch targets `backend` so it does not silently mix unrelated branch history into the frontend recovery.

## Evidence and method

The root `index.html` loads `assets/index-BEkv-JQO.js` and `assets/index-Bun7TUgb.css`. All three are byte-identical to their copies in the hosting `assets.zip`. Other bundles in `assets/` are historical leftovers, not additional entry points loaded by the root HTML. No source maps were present in the inspected snapshot.

Readable TSX was reconstructed by comparing the checked-in source build with the deployed JavaScript. The roster was extracted from the deployed JSON literal; static image additions and changes were copied from hosting. Original TSX text, comments, source filenames for new components and commit history cannot be recovered exactly from minified JavaScript.

[recovery/hosting-snapshot.json](recovery/hosting-snapshot.json) records SHA-256 checksums of the evidence and all 23 non-bundle hosting assets. Generated bundles and hosting ZIPs are not added to this recovery commit.

## Restored behavior

- `/dday/schedule`, the event-page schedule button and both schedule posters.
- The landing `background7.png`, the updated `background6.png`, plus `background0.png` and `dday-landing.png` preserved from hosting.
- The exact deployed 48-member roster, department-specific ordering, 260px thumbnail requests and portrait layout.
- Gender categories remain selectable and show FULL or Waitlist labels. Selecting a closed category displays an error and disables submission; the submit handler also guards against it. Existing capacity rechecks and backend enforcement remain in place. The previous source-only effect that automatically replaced a user's closed selection was removed to match deployment.
- Real sponsor logos fetched from `/api/sponsor-tiers/with-sponsors`, excluding the `volume 1` tier, delivered through `CloudinaryImg`, with the deployed lighter logo tiles and 45-second animation.
- The flame button's label override and configurable vertical flame offset.
- Public production API build configuration, so `npm run build` targets the same API without depending on an undocumented environment variable.
- Portable Apache SPA rewrites from hosting. The cPanel-generated PHP handler comment was omitted because it is host-managed metadata.

## Validation

- `npm run build`: TypeScript checks and Vite production build pass using the installed Vite 6.3.5 dependencies.
- `npm run test:recovery`: seven server-rendering regression checks pass, covering closed/open/waitlisted categories, schedule posters, the 48-member roster, flame button props and absence of placeholder sponsor logos.
- `node scripts/compare-deployment.mjs /path/to/hosting/root`: the reconstructed and deployed JavaScript have the same normalized syntax tree and identifier bindings. Local minified names and carriage returns inside literals are normalized; operators, property names, globals and other literal values are retained.
- All 23 non-bundle hosting assets match the rebuilt files byte for byte.
- All rebuilt CSS rule declarations match hosting. Hosting has 12 additional generated utility rules; their originating unused source cannot be established from the bundle. They are not needed by the recovered compiled JavaScript.
- Entry HTML matches after normalizing generated bundle names and whitespace.
- Whitespace check passes with `cr-at-eol` enabled for the existing CRLF router file.

The comparison script is a structural check, not a formal proof of runtime equivalence. The browser preview tool failed during recovery, so visual verification was unavailable. No live registration was submitted and no backend/database changes were made. Server-rendering tests do not exercise client effects, interactions, or API responses. The production hosting files and the original local checkout were left unchanged.
