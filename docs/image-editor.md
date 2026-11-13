# Simple image editor

`src/components/ImageEditor.tsx` is an inline, client-side crop editor. The submit project modal uses it for thumbnail selection; it is also reusable for later avatar upload integration.

In project submission, three thumbnail slots show existing images and clickable empty upload containers in one grid. Clicking any empty slot opens the multi-image picker; when all three slots are filled, no add controls remain. Removing an image restores an empty slot. Selected files are queued up to the remaining three-image limit and edited one at a time in a 16:9 crop. **Use image** compresses and adds the edited file through the existing project image pipeline, then opens the next selected image. **Cancel** skips the current image. Publishing stays disabled while images await editing or are processing. Compression failures keep the current image available for retry. Closing the submission discards the queue along with the rest of the draft.

It supports drag-to-position (mouse or touch), keyboard-accessible position and zoom sliders with synchronized percentage number inputs, 90-degree rotation, reset, cancel, and a matching crop preview. The preview fills its available width with no inset or padding. A rounded wrapper clips the image and a pointer-transparent border overlay outlines it without changing the canvas dimensions. Numeric edits are clamped to the slider bounds; empty numeric drafts are allowed while typing and restored on blur.

Input preparation is shared with the upload encoder in `src/utils/imageInput.ts`. JPEG, PNG, WebP, GIF, BMP, AVIF, SVG, and other browser-readable images use native decoding. HEIC/HEIF inputs (detected by MIME type or extension) are decoded to PNG on-device with a dynamically imported `heic-to/csp` decoder before editing. The decoder is only loaded for these inputs. All saved uploads still use the existing WebP pipeline with JPEG fallback; unsupported or corrupt formats report an error instead of silently changing the file extension. Animated inputs become still images. See the [decoder documentation](https://github.com/hoppergee/heic-to).

```tsx
import ImageEditor from "../components/ImageEditor";

// Keep the selected original File in state. Clear it to close the editor.
{
  selectedFile && (
    <ImageEditor
      file={selectedFile}
      aspectRatio={1}
      circular
      onCancel={() => setSelectedFile(null)}
      onSave={async (editedFile) => {
        const { fileToThumbnailDataUrl } = await import("../utils/images");
        const avatar = await fileToThumbnailDataUrl(editedFile, 256);
        // Pass avatar to the existing profile save flow.
        setAvatar(avatar);
        setSelectedFile(null);
      }}
    />
  );
}
```

For thumbnails, omit `circular` and set `aspectRatio={16 / 9}` (or your desired ratio). The default ratio is 1. Circular mode forces a square crop and masks only the preview; the exported image is square for use with existing rounded avatars.

`onSave` receives a PNG `File` capped at 1600 pixels on its longest edge, without upscaling. Transparency is preserved. Run this file through the existing image encoding helpers to apply the upload's WebP/JPEG and byte limits. Edits always render from the original image, avoiding repeated lossy encoding. Animated inputs export a still image.

The editor accepts images up to 8 MB, reports unsupported/invalid inputs, and releases its object URL on replacement or unmount. Changing the file or crop shape resets the editing session. Saving disables the controls and awaits `onSave`; failed saves keep the crop available for retry. If wrapping it in the shared `Modal`, coordinate the modal's `closeDisabled` state with your upload operation.
