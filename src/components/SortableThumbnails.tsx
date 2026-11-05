import ProjectImage from "./ProjectImage";
import { useState } from "react";
import { CaretLeft, CaretRight, DotsSixVertical, X } from "@phosphor-icons/react";
import { Button } from "./Button";

export type SortableThumbnailsProps = {
  /** Stored image URLs or pending upload previews, in order (first is the cover). */
  images: string[];
  /** Called with the full reordered array whenever the order changes. */
  onReorder: (next: string[]) => void;
  /** Called with the index of the thumbnail to remove. */
  onRemove: (index: number) => void;
};

/**
 * Thumbnail preview grid with drag-to-reorder. Desktop uses the native HTML5
 * drag-and-drop API (no library); the per-tile arrow buttons keep reordering
 * available on touch and keyboard, where native DnD does not apply.
 */
export default function SortableThumbnails({
  images,
  onReorder,
  onRemove,
}: SortableThumbnailsProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    next.splice(to, 0, ...next.splice(from, 1));
    onReorder(next);
  };

  return (
    <div
      role="list"
      aria-label="Thumbnail previews, drag to reorder"
      className="min-w-0 mt-3 grid *:min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 max-w-full"
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
            draggable
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
            className={`group relative cursor-grab select-none active:cursor-grabbing ${
              isDragging ? "opacity-40" : ""
            }`}
          >
            <ProjectImage
              src={src}
              alt={`Upload preview ${i + 1}`}
              className={`h-24 w-full rounded-xl border-[3px] object-cover transition-transform ${
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
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button
                variant="icon"
                size="compact-icon"
                type="button"
                draggable={false}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                aria-label={`Move thumbnail ${i + 1} left`}
              >
                <CaretLeft size={14} weight="bold" />
              </Button>
              <Button
                variant="icon"
                size="compact-icon"
                type="button"
                draggable={false}
                disabled={i === images.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label={`Move thumbnail ${i + 1} right`}
              >
                <CaretRight size={14} weight="bold" />
              </Button>
            </div>
            <Button
              variant="icon"
              size="compact"
              type="button"
              draggable={false}
              onClick={() => onRemove(i)}
              aria-label={`Remove image ${i + 1}`}
              className="absolute right-2 top-2"
            >
              <X size={14} weight="bold" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
