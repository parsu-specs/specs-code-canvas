import { userFacingError } from "../utils/userFacingError";
import { CloseButton } from "./CloseButton";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenText, FileText, UploadSimple } from "@phosphor-icons/react";
import { Button, ButtonLabel } from "./Button";
import Markdown from "./Markdown";
import { FileInput } from "./Input";
import { readMarkdownFile } from "../utils/readMarkdownFile";

type MarkdownFileViewerProps = {
  initialDocument?: { name: string; text: string };
  buttonLabel?: string;
};

export default function MarkdownFileViewer({
  initialDocument,
  buttonLabel = "Open a Markdown file",
}: MarkdownFileViewerProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(initialDocument?.name ?? null);
  const [text, setText] = useState(initialDocument?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setFileName(initialDocument?.name ?? null);
    setText(initialDocument?.text ?? "");
    setError(null);
  }, [initialDocument?.name, initialDocument?.text]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const markdown = await readMarkdownFile(file);
      setFileName(markdown.name);
      setText(markdown.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="surface" type="button" onClick={() => setOpen(true)}>
        <BookOpenText size={20} weight="duotone" />
        {buttonLabel}
      </Button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-title`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-inverse/80 p-3 sm:p-6"
          >
            <section
              onClick={(event) => event.stopPropagation()}
              className="toon-card toon-paper my-auto flex max-h-[90vh] min-h-[min(28rem,80vh)] w-full max-w-4xl flex-col overflow-hidden bg-panel"
            >
              <header className="min-w-0 flex shrink-0 items-center justify-between gap-4 border-b-[3px] border-outline bg-primary text-primary-foreground px-4 py-3 sm:px-6 max-w-full">
                <div className="flex min-w-0 items-center gap-3 max-w-full">
                  <BookOpenText size={26} weight="duotone" aria-hidden="true" />
                  <div className="min-w-0">
                    <h2 id={`${inputId}-title`} className="text-lg font-black sm:text-xl">
                      Markdown file viewer
                    </h2>
                    {fileName && (
                      <p className="truncate text-sm font-bold text-primary-foreground/85" title={fileName}>
                        {fileName}
                      </p>
                    )}
                  </div>
                </div>
                <CloseButton
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Markdown file viewer"
                />
              </header>

              <div className="modal-grid min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
                <div className="min-w-0 mb-5 flex flex-wrap items-center gap-3 max-w-full">
                  <FileInput
                    id={inputId}
                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                    disabled={loading}
                    className="peer"
                    onChange={(event) => {
                      void loadFile(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <ButtonLabel
                    variant="secondary"
                    htmlFor={inputId}
                    className="cursor-pointer text-sm peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-secondary"
                  >
                    <UploadSimple size={19} weight="bold" aria-hidden="true" />
                    {loading ? "Opening…" : fileName ? "Open another file" : "Choose a file"}
                  </ButtonLabel>
                  <p className="text-sm font-bold text-muted">
                    Markdown, .txt, and plain-text README files up to 50,000 characters.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl border-2 border-outline bg-accent/30 p-3 font-bold"
                  >
                    {userFacingError(error)}
                  </p>
                )}

                {text ? (
                  <article className="rounded-xl border-2 border-outline bg-surface p-4 sm:p-6">
                    <div className="min-w-0 mb-4 flex items-center gap-2 border-b-2 border-dashed border-divider pb-3 text-sm font-black uppercase text-muted max-w-full">
                      <FileText size={19} weight="duotone" aria-hidden="true" />
                      Document
                    </div>
                    <Markdown text={text} fullWidth />
                  </article>
                ) : (
                  <div className="min-w-0 flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed border-divider bg-surface/70 px-5 py-10 text-center max-w-full">
                    <BookOpenText size={40} weight="duotone" aria-hidden="true" />
                    <h3 className="mt-3 text-xl font-black">
                      {loading ? "Reading your file…" : "Your document will appear here"}
                    </h3>
                    <p className="mt-1 max-w-md text-sm font-bold text-muted">
                      Choose a Markdown file to format headings, lists, links, code, tables, and
                      more.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
