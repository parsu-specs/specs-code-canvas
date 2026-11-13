import ProjectImage from "./ProjectImage";
import { useEffect, useState, type ReactNode } from "react";
import { DotsSixVertical, PencilSimple, X } from "@phosphor-icons/react";
import { Button } from "./Button";
import ImageEditor from "./ImageEditor";
import { projectImageSources } from "../utils/projectImages";

export type SortableThumbnailsProps = {
  /** Stored image URLs or pending upload previews, in order (first is the cover). */
  images: string[];
  /** Called with the full reordered array whenever the order changes. */
  onReorder: (next: string[]) => void;
  /** Called with the index of the thumbnail to remove. */
  onRemove: (index: number) => void;
  /** Optional empty upload slots rendered after the existing images. */
  children?: ReactNode;
};

/**
 * Thumbnail preview grid with drag-to-reorder using the native HTML5
 * drag-and-drop API (no library).
 */
export default function SortableThumbnails({
  images,
  onReorder,
  onRemove,
  children,
}: SortableThumbnailsProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ index: number; src: string } | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const source = projectImageSources(editing.src);
        if (!source) throw new Error("Could not load this thumbnail for editing.");
        const response = await fetch(source.cover, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load this thumbnail for editing.");
        const blob = await response.blob();
        if (!controller.signal.aborted) {
          setEditFile(new File([blob], "thumbnail", { type: blob.type }));
        }
      } catch {
        if (!controller.signal.aborted) {
          setEditError("Could not load this thumbnail for editing. Please try again.");
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [editing]);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    next.splice(to, 0, ...next.splice(from, 1));
    onReorder(next);
  };

  return (
    <>
      <div
        role="list"
        aria-label="Thumbnail previews, drag to reorder"
        className="mt-3 grid w-full min-w-0 max-w-[49.5rem] grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-3"
      >
        {images.map((src, i) => {
          const isDragging = dragging === i;
          const isDropTarget = dragging !== null && dragging !== i && dropTarget === i;
          return (
            <div
              key={src.slice(0, 32) + i}
              role="listitem"
              aria-roledescription="sortable"
              aria-label={`Thumbnail ${i + 1} of ${images.length}${i === 0 ? ", cover" : ""}`}
              draggable={!editing}
              onDragStart={(event) => {
                setDragging(i);
                // Firefox only starts a drag when data is set; we track the
                // source index in state instead of reading this back.
                event.dataTransfer.setData("text/plain", String(i));
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
              onDragOver={(event) => {
                if (dragging === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dropTarget !== i) setDropTarget(i);
              }}
              onDragLeave={(event) => {
                if (dropTarget !== i) return;
                const related = event.relatedTarget as Node | null;
                if (related && event.currentTarget.contains(related)) return;
                setDropTarget(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging !== null) move(dragging, i);
                setDragging(null);
                setDropTarget(null);
              }}
              className={`group relative aspect-video w-full max-w-64 cursor-grab select-none active:cursor-grabbing ${
                isDragging ? "opacity-40" : ""
              }`}
            >
              <ProjectImage
                src={src}
                alt={`Upload preview ${i + 1}`}
                className={`absolute inset-0 h-full w-full rounded-xl border-[3px] object-cover transition-transform ${
                  isDropTarget ? "scale-[1.04] border-foreground" : "border-outline"
                }`}
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full border-2 border-outline bg-secondary px-2 py-0.5 text-[10px] font-black">
                  COVER
                </span>
              )}
              <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full border-2 border-outline bg-secondary px-2 py-0.5 text-[10px] font-black">
                <DotsSixVertical size={12} weight="bold" aria-hidden />
                DRAG
              </span>
              <Button
                variant="plain"
                type="button"
                draggable={false}
                disabled={!!editing}
                onClick={() => {
                  setEditFile(null);
                  setEditError("");
                  setEditing({ index: i, src });
                }}
                aria-label={`Edit image ${i + 1}`}
                className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full border-2 border-outline bg-secondary px-2 py-0.5 text-[10px] font-black hover:bg-background"
              >
                <PencilSimple size={12} weight="bold" aria-hidden />
                EDIT
              </Button>
              <Button
                variant="icon"
                size="compact"
                type="button"
                draggable={false}
                disabled={!!editing}
                onClick={() => onRemove(i)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-2 top-2"
              >
                <X size={14} weight="bold" />
              </Button>
            </div>
          );
        })}
        {children}
      </div>
      {editing && (
        <div className="mt-4">
          <h3 className="mb-3 text-lg font-black">Edit thumbnail {editing.index + 1}</h3>
          {editFile ? (
            <ImageEditor
              file={editFile}
              aspectRatio={16 / 9}
              onCancel={() => setEditing(null)}
              onSave={async (file) => {
                const { fileToProjectImageDataUrl } = await import("../utils/images");
                const replacement = await fileToProjectImageDataUrl(file);
                if (images[editing.index] !== editing.src) {
                  throw new Error("This thumbnail has changed. Close the editor and try again.");
                }
                onReorder(images.map((src, i) => (i === editing.index ? replacement : src)));
                setEditing(null);
              }}
            />
          ) : (
            <>
              <p role={editError ? "alert" : "status"} className="mb-3 text-sm font-bold">
                {editError || "Loading thumbnail…"}
              </p>
              <Button variant="outline-flat" size="small" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
