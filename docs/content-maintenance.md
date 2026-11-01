# Content Maintenance

This guide describes the current source-based workflow. There is no content administration screen, automatic folder scan, or guitar-selection UI. Bundled changes require a new frontend build and an approved publication; adding files alone does not update the deployed app. Use only images and exercises you have permission to redistribute.

For the prepared 0.4.0 beta, the owner confirmed permission for the PWA artwork and separate Frankenstrat photograph, authored the retained two-notes PDF and removed the other bundled PDFs. This does not authorize adding unrelated third-party assets later; each new asset needs its own permission review.

## Featured Guitar

The current Home artwork is `src/assets/EVH_Frankenstrat.jpg`. `src/pages/Landing.tsx` imports it and renders the image, disclosure name, alt text, and two description paragraphs. The descriptions are translated through `src/lib/i18n.tsx` in English, Russian, Italian, and French.

To replace the current feature:

1. Add an optimized JPG/WebP/PNG under `src/assets/`, retaining the original until no source references it. Prefer a clear image of the instrument with sufficient space for the existing right-edge presentation.
2. Update the image import in Landing and its rendered source. Update the instrument name, alt text, and both description keys together. Do not describe an image as Frankenstrat if it shows another instrument.
3. Add the new name and descriptions to all four language dictionaries. Existing copy keys may remain if other code uses them; do not delete unrelated translations.
4. Check the actual instrument, disclosure, long translated descriptions, mobile/desktop layout, and tour anchor. The disclosure should remain operable and initially collapsed.
5. Run focused tour/translation tests and TypeScript validation before the normal approved release workflow.

Adding another file does not create a rotating catalog. Supporting several guitars requires a small stable-ID catalog containing each image, accessible name, and translated description keys, plus a selection policy. Login rotation is requested but not implemented in this package. Recommended policy: advance through the catalog in order on a genuine new sign-in, keep the selection across route changes/reloads/token refreshes, and handle the one-guitar case without change. Whether that cycle is device-local or synchronized across devices must be agreed before implementation. Do not add placeholder instruments or change authentication just to demonstrate rotation.

## Built-In Block References

The source registry is `src/lib/defaultMaterials.ts`; Practice calls `getDefaultMaterials(language, template.key)`. The stable catalog key, not the translated display label or folder name, connects references to a block. The source of built-in labels is `src/lib/catalogApi.ts`.

Only the owner-authored two-notes-per-string PDF is currently bundled. The owner removed nonredistributable Chromatic/Warmup and Learning PDFs; their former file links were removed while localized text guidance was retained. Do not restore those files or URLs without new permission.

Current selectable built-in keys:

```text
chromatic                 two_notes_per_string      technique
alternate_picking         legato                    rhythm
chord_changes             barre_chords              strumming_patterns
major_scales              minor_scales              pentatonic_scales
arpeggios                 notes_fretboard           notes
intervals                 chords                    repertoire
learn_song                evening                   harmony
jam_track                 songwriting               learning
```

`arpeggios` exists only after migration `20261101121000_arpeggios_block.sql` is applied. `warmup` is retired historical compatibility data, not a new selectable block. Attaching content must not change program memberships, session history, song links, or existing local materials.

### Add A PDF

1. Put the authorized PDF under `public/default-exercises/<folder>/`. Keep names simple, with exact case. The public URL omits `public/`.
2. Add a nonempty entry for its stable key to each `materials.en`, `materials.ru`, `materials.it`, and `materials.fr` registry. Use a localized `title` and `detail` in every language. Text-only guidance needs no file.
3. Add the key and exact root-relative PDF URL to `suppliedFiles` in the same source file.
4. Enable default exercises in Settings, open Practice, add/open that block, expand Details and use Open PDF. Check inline rendering and Open in new tab. The exercise does not automatically become part of any program.

The existing two-notes-per-string example is:

```text
Catalog key: two_notes_per_string
Disk path:   public/default-exercises/2-notes-per-string/2-notes-per-string.pdf
Public URL:  /default-exercises/2-notes-per-string/2-notes-per-string.pdf
```

For example, a future alternate-picking PDF can use this registry shape:

```ts
// Inside the relevant language's materials object:
alternate_picking: [
  { title: 'Alternate picking', detail: 'Reference exercises for alternate picking.' },
],

// Inside suppliedFiles:
alternate_picking: '/default-exercises/alternate-picking/exercises.pdf',
```

The English example must be accompanied by Russian, Italian, and French entries; it is not a fallback localization strategy. Create the actual file before registering its URL.

### Current Limits And Checks

- `getDefaultMaterials` attaches the one `suppliedFiles[blockKey]` PDF to material index zero only. Additional text entries are supported; multiple bundled files per block require a separately implemented registry/renderer change. Adding `filePath` to a later entry will not work with the current mapping.
- The bundled viewer treats `filePath` as a PDF and renders Open PDF plus an `application/pdf` object/new-tab fallback. Do not register videos, audio, YouTube URLs, or images there and expect the user-material players to appear.
- A key with no material entries returns an empty list, even if a matching PDF folder exists. English content can be a runtime fallback, but complete four-language entries are expected for supplied content.
- Settings controls default-reference visibility. Adding a reference never creates a session, starts a timer, or modifies a user's selected composition.
- Check that the URL returns the PDF bytes and an appropriate PDF content type, not the SPA HTML shell. A successful HTTP status or PDF header alone does not establish notation/page readability.
- Default-exercise files are excluded from service-worker precaching and navigation fallback; do not promise offline availability for bundled PDFs. Preserve these exclusions.
- Extend the existing default-material tests to check all four locales, exact key/URL, actual file existence and no cross-block association. Run focused `tests/defaultRoutineCopy.test.ts` and TypeScript checks; obtain the normal release approval rather than pushing automatically.

## User-Added Materials

For a personal reference rather than a built-in reference, open a block's Details in Practice and add a supported file or HTTP(S) link using the existing materials controls. Supported local files include PDF, images, plain text, audio and video; playback depends on browser codecs. YouTube uses its existing player; other websites may open externally. Direct audio URLs are not necessarily recognized as inline audio.

Files and saved-link metadata remain in browser-local storage on this device/origin, not in Supabase or a shared server library. New materials are scoped to the authenticated account: metadata is stored in an owned IndexedDB collection; uploaded file bytes use a separate owner-namespaced CacheStorage collection when available, otherwise IndexedDB. Changing accounts invalidates pending access and detaches old players. Legacy records without an owner remain preserved in their old storage but are temporarily hidden, not assigned to the first account that signs in. Do not manually move/claim them or clear browser data to recover them. This is application account isolation, not protection against OS users, DevTools or malicious same-origin scripts.

A remote link is not an offline download. Playback-position bookmarks are not PDF page bookmarks; they can be renamed (up to 60 characters, default is the timestamp) and stay on this device only. Song-scoped materials remain associated with that song and have different viewing controls from block-level materials. Browser eviction can still lose files; never clear site data as a shortcut for replacing content.

## Domain And Installed App Notes

A custom domain generally requires registering/owning a domain and configuring its Cloudflare DNS/Worker custom domain. A free `workers.dev` address may be renamed subject to availability, but is not an arbitrary purchased-domain name. No domain or authentication settings were changed by this work.

Changing the origin does not move local materials, authentication state, or installed PWAs automatically. Plan a supported export/import or other explicitly approved migration before changing domains; there is no automatic migration promised here. Existing installed shortcuts can retain cached icons. Check a fresh dedicated-device/profile installation without clearing the owner's local data. Install artwork comes from `public/favicon.svg`; the reproducible icon script and Apple/manifest references are maintained with the install assets.