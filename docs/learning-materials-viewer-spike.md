# Learning Materials Viewer Spike

## First implementation slice

- Add a materials panel to the `Учебные материалы` practice block.
- Support trusted external URLs and device-local user files.
- Support PDF, image, and plain-text viewing.
- Support native browser video playback with play, pause, seek, playback speed, and A/B loop controls.
- Provide native A/B loop controls for local and direct video files; YouTube A/B control requires a separate IFrame API integration.
- Render the selected local file or external URL inline inside the practice block; opening a new browser tab is not required for the first slice.
- Treat ordinary external web pages as non-embeddable by default; show an explanatory fallback and an external browser link instead of a blank frame.
- For video audio, rely on the browser-supported codec and the source file's audio track; do not transcode locally in the first slice.
- Provide a separate audio element fallback for local video files when the browser can decode the audio track but has trouble with video playback.
- If both video and audio decoding fail, recommend converting to broadly supported H.264/AAC MP4 or WebM/Opus before upload; client-side transcoding is deferred.
- Probe `HTMLVideoElement.canPlayType()` before storing video and show a non-blocking compatibility warning; do not reject a file solely because the browser cannot identify its codec.
- Keep the viewer optional; the practice block remains usable without attached materials.

## Storage and ownership

- Store uploaded files in browser IndexedDB; do not upload them to Supabase Postgres or Supabase Storage.
- Store local metadata and the file Blob on the user’s device.
- Treat external URLs as links or embedded media only when the source explicitly permits embedding.
- Allow YouTube `/embed/VIDEO_ID` URLs as an explicit inline iframe provider; accept either the direct embed URL or a pasted iframe snippet and store only the extracted URL.
- Normalize YouTube embeds to `youtube-nocookie.com` with `playsinline`, `enablejsapi`, and the current app origin; retain an Open on YouTube fallback because video owners or embedded-browser policies can still reject playback.
- Show local storage usage and handle browser quota failures clearly.
- Show saving/saved/error states for local file writes; IndexedDB does not expose byte-level upload progress.
- Display the browser-provided storage usage/quota estimate in the materials panel when available.
- Do not promise cross-device synchronization for local files.
- Define upload limits before implementation: maximum file size, allowed MIME types, and browser quota behavior.
- No fixed application file-size cap; accept files up to the browser/device quota and show a clear quota error when storage rejects a file.

## Security boundaries

- Allowlist MIME types and file extensions; do not execute uploaded content.
- Render text as text, images as images, and PDFs through the browser viewer.
- Do not parse guitar tabs or notation in the first slice.
- Sanitize and validate external URLs; do not fetch arbitrary server-side URLs.
- Define retention and deletion behavior for removed materials.

## Deferred decisions

- GTP and other guitar-tab formats require a format-support and licensing review.
- Music-notation formats require a renderer/library review and are not part of the first slice.
- Device-local materials are available offline on the same browser until site data is cleared.
- Collaborative sharing is out of scope.

## Acceptance checks for the future implementation

- A user can attach and remove a trusted URL without affecting practice logging.
- A user can upload, view, and delete an allowed PDF, image, text, or video file locally.
- A second browser profile cannot access another profile’s local materials through the app.
- Disallowed file types and oversized uploads are rejected before storage.
