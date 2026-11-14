import { useEffect, useRef, useState } from "react";
import { Images, PencilSimple } from "@phosphor-icons/react";
import Avatar from "./Avatar";
import { Button, ButtonLabel } from "./Button";
import ImageEditor from "./ImageEditor";
import Input, { FileInput } from "./Input";
import Modal from "./Modal";
import { IMAGE_FILE_ACCEPT } from "../utils/imageInput";
import { isSafeImageUrl } from "../utils/urls";
import { userFacingError } from "../utils/userFacingError";

type Props = {
  name: string;
  imageUrl?: string;
  onSave: (imageUrl: string) => Promise<void>;
  onClose: () => void;
};

export default function ProfilePhotoPicker({ name, imageUrl, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(imageUrl ?? "");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  useEffect(() => () => request.current?.abort(), []);

  const editPicture = async () => {
    if (!isSafeImageUrl(draft) || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(draft.trim(), { signal: controller.signal });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (!controller.signal.aborted) {
        setEditFile(new File([blob], "profile-photo", { type: blob.type }));
      }
    } catch {
      if (!controller.signal.aborted) {
        setError(
          "Could not load this picture for editing. Choose an image from your gallery instead.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saveLock.current || busy || editFile) return;
    saveLock.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (cause) {
      setError(userFacingError(cause instanceof Error ? cause.message : "Could not save profile."));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      id="profile-photo-editor"
      title="Edit profile picture"
      onClose={onClose}
      closeDisabled={saving}
    >
      {editFile ? (
        <ImageEditor
          file={editFile}
          aspectRatio={1}
          circular
          onCancel={() => setEditFile(null)}
          onSave={async (file) => {
            setBusy(true);
            try {
              const { fileToThumbnailDataUrl } = await import("../utils/images");
              setDraft(await fileToThumbnailDataUrl(file, 256));
              setEditFile(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <form
          aria-label="Choose profile picture"
          onSubmit={(event) => void save(event)}
          className="grid min-w-0 items-start gap-5 @min-[36rem]/content:grid-cols-[10rem_minmax(0,1fr)]"
        >
          <div className="flex justify-center" aria-label="Profile picture preview">
            <Avatar name={name} imageUrl={draft || undefined} size="xl" />
          </div>
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLabel variant="surface" size="small" className="cursor-pointer">
                <Images size={18} weight="duotone" /> Choose from gallery
                <FileInput
                  accept={IMAGE_FILE_ACCEPT}
                  disabled={busy || saving}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setError(null);
                    setEditFile(file);
                  }}
                />
              </ButtonLabel>
              <Button
                variant="surface"
                size="small"
                disabled={busy || saving}
                aria-pressed={!draft}
                onClick={() => {
                  setDraft("");
                  setError(null);
                }}
              >
                Use initials
              </Button>
              {draft && (
                <Button
                  variant="surface"
                  size="small"
                  disabled={busy || saving || !isSafeImageUrl(draft)}
                  onClick={() => void editPicture()}
                >
                  <PencilSimple size={18} weight="bold" /> Edit image
                </Button>
              )}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-black">Profile photo URL</span>
              <Input
                type="url"
                disabled={busy || saving}
                value={draft.startsWith("data:") ? "" : draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                placeholder="Or paste an https:// image link"
              />
            </label>
            {busy && (
              <p role="status" className="text-sm font-bold">
                Loading picture...
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm font-bold">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="surface"
                size="small"
                disabled={saving}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" size="small" disabled={busy || saving}>
                {saving ? "Saving..." : "Save picture"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
