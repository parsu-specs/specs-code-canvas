import { useEffect, useId, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "./Button";
import Input from "./Input";
import { prepareImageInput } from "../utils/imageInput";
import {
  cropGeometry,
  drawImageCrop,
  exportImageCrop,
  initialImageEdits,
  type ImageEdits,
} from "../utils/imageEditor";

export type ImageEditorProps = {
  file: File;
  /** Fixed crop ratio: 1 for avatars, 16 / 9 for landscape thumbnails. */
  aspectRatio?: number;
  /** Circular preview only; the exported file remains rectangular. */
  circular?: boolean;
  onSave: (file: File) => void | Promise<void>;
  onCancel: () => void;
};

/** Inline editor; can also be placed inside the shared Modal. */
export default function ImageEditor(props: ImageEditorProps) {
  // Remount the editing session when the selected file or crop shape changes.
  const { file, aspectRatio = 1, circular = false } = props;
  const [session, setSession] = useState({ file, aspectRatio, circular, key: 0 });
  if (
    session.file !== file ||
    !Object.is(session.aspectRatio, aspectRatio) ||
    session.circular !== circular
  ) {
    setSession({ file, aspectRatio, circular, key: session.key + 1 });
  }
  return <EditingSession key={session.key} {...props} />;
}

function EditingSession({
  file,
  aspectRatio = 1,
  circular = false,
  onSave,
  onCancel,
}: ImageEditorProps) {
  const ratio = circular ? 1 : aspectRatio;
  const validRatio = Number.isFinite(ratio) && ratio > 0;
  const id = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [edits, setEdits] = useState<ImageEdits>(initialImageEdits);
  const [numberDrafts, setNumberDrafts] = useState<Partial<Record<"zoom" | "x" | "y", string>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; edits: ImageEdits } | null>(null);

  useEffect(() => {
    if (!validRatio) {
      setError("Choose a valid crop aspect ratio.");
      return;
    }
    let active = true;
    let url: string | undefined;
    const loaded = new Image();
    loaded.onload = () => {
      if (active) setImage(loaded);
    };
    loaded.onerror = () => {
      if (active)
        setError(
          "Your browser could not read this image. Try another file or export it as JPEG or PNG.",
        );
    };
    const showSource = (source: Blob) => {
      if (!active) return;
      url = URL.createObjectURL(source);
      loaded.src = url;
    };
    const failed = (cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not read this image.");
    };
    try {
      const source = prepareImageInput(file);
      if (source instanceof Blob) showSource(source);
      else void source.then(showSource).catch(failed);
    } catch (cause) {
      failed(cause);
    }
    return () => {
      active = false;
      loaded.onload = null;
      loaded.onerror = null;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, validRatio]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    try {
      drawImageCrop(canvasRef.current, image, edits);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not preview this image.");
      setImage(null);
    }
  }, [image, edits]);

  async function save() {
    if (!image || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(await exportImageCrop(image, file.name, edits, ratio));
    } catch {
      setError("Could not save this image. Please try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const previewWidth = validRatio ? Math.max(1, Math.round(Math.min(640, 480 * ratio))) : 480;
  return (
    <section aria-label="Image editor" aria-busy={saving} className="min-w-0 space-y-4">
      <p id={`${id}-help`} className="text-sm font-bold text-muted">
        Drag to position your image, or use the sliders below.
      </p>
      <div className={`relative overflow-hidden ${circular ? "rounded-full" : "rounded-2xl"}`}>
        {!image && <p role="status">{error ? "Preview unavailable" : "Loading image…"}</p>}
        <canvas
          ref={canvasRef}
          hidden={!image}
          width={previewWidth}
          height={validRatio ? Math.max(1, Math.round(previewWidth / ratio)) : 480}
          role="img"
          aria-label="Edited image preview"
          aria-describedby={`${id}-help`}
          className={`block w-full touch-none ${saving ? "cursor-wait" : "cursor-grab active:cursor-grabbing"}`}
          style={{ height: "auto" }}
          onPointerDown={(event) => {
            if (!image || saving || !event.isPrimary || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              edits,
            };
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start || start.pointerId !== event.pointerId || !image || saving) return;
            const canvas = event.currentTarget;
            const bounds = canvas.getBoundingClientRect();
            const crop = cropGeometry(
              image.naturalWidth,
              image.naturalHeight,
              canvas.width,
              canvas.height,
              start.edits,
            );
            setEdits({
              ...start.edits,
              x: crop.rangeX
                ? Math.max(
                    -1,
                    Math.min(
                      1,
                      start.edits.x +
                        ((event.clientX - start.x) * canvas.width) / bounds.width / crop.rangeX,
                    ),
                  )
                : 0,
              y: crop.rangeY
                ? Math.max(
                    -1,
                    Math.min(
                      1,
                      start.edits.y +
                        ((event.clientY - start.y) * canvas.height) / bounds.height / crop.rangeY,
                    ),
                  )
                : 0,
            });
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
        {image && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-outline"
          />
        )}
      </div>
      <fieldset disabled={!image || saving} className="min-w-0 space-y-3">
        <legend className="sr-only">Image adjustments</legend>
        {(
          [
            ["zoom", "Zoom", 1, 3],
            ["x", "Horizontal position", -1, 1],
            ["y", "Vertical position", -1, 1],
          ] as const
        ).map(([key, label, min, max]) => (
          <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold">
            <label htmlFor={`${id}-${key}`} className="w-full sm:w-36">
              {label}
            </label>
            <input
              id={`${id}-${key}`}
              type="range"
              className="min-w-24 flex-1 accent-primary"
              min={min}
              max={max}
              step="0.01"
              value={edits[key]}
              aria-valuetext={key === "zoom" ? `${Math.round(edits.zoom * 100)}%` : undefined}
              onChange={(event) => {
                setEdits((current) => ({ ...current, [key]: Number(event.target.value) }));
                setNumberDrafts((current) => ({ ...current, [key]: undefined }));
              }}
            />
            <span className="relative w-28 shrink-0">
              <Input
                type="number"
                variant="flat"
                className="py-1.5 pl-2 pr-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label={`${label} percentage`}
                min={min * 100}
                max={max * 100}
                step={1}
                value={numberDrafts[key] ?? Math.round(edits[key] * 100)}
                onChange={(event) => {
                  const { value, valueAsNumber } = event.target;
                  setNumberDrafts((current) => ({ ...current, [key]: value }));
                  if (value !== "" && Number.isFinite(valueAsNumber)) {
                    setEdits((current) => ({
                      ...current,
                      [key]: Math.max(min, Math.min(max, valueAsNumber / 100)),
                    }));
                  }
                }}
                onBlur={() => setNumberDrafts((current) => ({ ...current, [key]: undefined }))}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              >
                %
              </span>
            </span>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={() =>
              setEdits((current) => ({
                ...current,
                rotation: ((current.rotation + 90) % 360) as ImageEdits["rotation"],
                x: 0,
                y: 0,
              }))
            }
          >
            <ArrowClockwise size={18} aria-hidden="true" /> Rotate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={() => {
              setEdits(initialImageEdits);
              setNumberDrafts({});
            }}
          >
            <ArrowCounterClockwise size={18} aria-hidden="true" /> Reset
          </Button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="surface" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void save()} disabled={!image || saving}>
          {saving ? "Saving…" : "Use image"}
        </Button>
      </div>
    </section>
  );
}
