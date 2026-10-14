# Visual Assets

## Racing Portraits

- Identity reference: `/data_new/gongmingdao/code/web/一寸白底.jpg`, supplied by the user.
- Generated assets: `public/assets/gmd-race-face.png` and `public/assets/gmd-race-helmet.png`.
- Mode: reference-image edit, then a second edit of the generated face portrait to preserve the canvas and body placement. Transparent background requested for both. These are AI racing concepts, not photographs of team membership or an endorsement.
- Composition: straight-on standing pose, shoulders square, arms naturally down, Red Bull racing suit. No helmet held in either hand.
- Helmet reference: [Max Verstappen's 2025 helmet](https://news.verstappen.com/en/article/5708), white/red/blue with a closed blue mirrored visor.
- Interaction reference: [Lando Norris](https://landonorris.com/). Original code and generated imagery, with a cursor-driven reveal mask between aligned helmet and face layers.

Prompt brief for the face portrait: preserve the identity, facial features and hairstyle of the supplied photo; produce a photorealistic front-facing upright racing portrait in a Red Bull suit, head to mid-thigh, both arms down, square shoulders, no object in either hand, 1024 x 1536 transparent canvas, no background glow.

Prompt brief for the helmet edit: edit only the head of the face portrait to wear a front-facing Max Verstappen-inspired white/red/blue helmet with a closed blue mirrored visor; preserve the exact body, pose, clothing, placement and canvas dimensions. Keep the transparent background.

## Fonts and Icons

- Barlow Condensed 800: `@fontsource/barlow-condensed@5.1.0`, SIL Open Font License, `public/assets/LICENSE-BarlowCondensed.txt`.
- Noto Sans SC regular: Google Fonts, subset of the current Chinese UI text, SIL Open Font License, `public/assets/LICENSE-NotoSansSC.txt`.
- Lucide 0.468.0: local UMD bundle, ISC license with inherited Feather MIT notices, `public/assets/LICENSE-Lucide.txt`.

The application makes no external font, icon or image requests during normal use.
