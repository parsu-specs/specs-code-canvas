import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowClockwise,
  Check,
  Copy,
  DownloadSimple,
  GithubLogo,
  ImageSquare,
  LinkSimple,
  ShareNetwork,
} from "@phosphor-icons/react";
import { Button, type ButtonVariant } from "./Button";
import Input from "./Input";
import Modal from "./Modal";
import SharePhoto from "./SharePhoto";
import { appDetailsPath, developerProfilePath } from "../pages/routes";
import type { AppItem, Profile } from "../data/types";
import { isSafeHttpUrl, isSafeImageUrl } from "../utils/urls";
import { DEFAULT_SHARE_PALETTE, prepareShareImage, shareImageFilename } from "../utils/shareImage";

type Props = ({ app: AppItem; profile?: never } | { profile: Profile; app?: never }) & {
  variant?: ButtonVariant;
  size?: "small" | "compact";
  className?: string;
};

export default function ShareButton({
  app,
  profile,
  variant = "outline-flat",
  size = "small",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const title = app?.title ?? profile!.name;
  return (
    <span
      className={`inline-flex min-w-0 max-w-full ${className ?? ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        variant={variant}
        size={size}
        className="max-sm:min-h-11 max-sm:min-w-11 max-sm:gap-0 max-sm:border-0 max-sm:bg-transparent max-sm:p-2 max-sm:hover:bg-transparent"
        onClick={() => setOpen(true)}
        aria-label={`Share ${title}`}
        title={`Share ${title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ShareNetwork size={size === "compact" ? 16 : 18} weight="bold" aria-hidden="true" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      {open && <ShareDialog id={id} app={app} profile={profile} onClose={() => setOpen(false)} />}
    </span>
  );
}

function ShareDialog({
  id,
  app,
  profile,
  onClose,
}: {
  id: string;
  app?: AppItem;
  profile?: Profile;
  onClose: () => void;
}) {
  const title = app?.title ?? profile!.name;
  const path = app ? appDetailsPath(app.id) : developerProfilePath(profile!.name);
  const url = new URL(path, window.location.origin).href;
  const sourceImage = (app ? app.screenshots?.[0] : profile?.imageUrl)?.trim() || undefined;
  const placeholderPalette =
    app && !sourceImage
      ? {
          primary: `var(--color-${app.color})`,
          accent: `color-mix(in srgb, var(--color-${app.color}) 65%, white)`,
          ink: DEFAULT_SHARE_PALETTE.ink,
          onPrimary: "var(--color-foreground)",
        }
      : DEFAULT_SHARE_PALETTE;
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareShareImage>> | null>(
    null,
  );
  const [imageLoading, setImageLoading] = useState(Boolean(sourceImage));
  const [imageError, setImageError] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [png, setPng] = useState<Blob | null>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);
  const [manualUrl, setManualUrl] = useState("");

  useEffect(() => {
    if (!sourceImage) return;
    let cancelled = false;
    if (!isSafeImageUrl(sourceImage)) {
      setImageError(true);
      setImageLoading(false);
      return;
    }
    void prepareShareImage(sourceImage)
      .then((result) => {
        if (!cancelled) setPrepared(result);
      })
      .catch(() => {
        if (!cancelled) setImageError(true);
      })
      .finally(() => {
        if (!cancelled) setImageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceImage]);

  useEffect(() => {
    if (manualUrl) {
      manualInput.current?.focus();
      manualInput.current?.select();
    }
  }, [manualUrl]);

  const links = [
    {
      label: app ? "Copy project link on CodeCanvas" : "Copy developer link on CodeCanvas",
      url,
      icon: LinkSimple,
    },
    ...(app && isSafeHttpUrl(app.repoUrl)
      ? [{ label: "Copy GitHub / repository link", url: app.repoUrl!.trim(), icon: GithubLogo }]
      : []),
    ...(app && isSafeHttpUrl(app.url)
      ? [{ label: "Copy app link", url: app.url!.trim(), icon: LinkSimple }]
      : []),
  ];

  const copy = async (value: string) => {
    setMessage("");
    setCopied("");
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setManualUrl("");
      setMessage("Link copied to clipboard.");
    } catch {
      setManualUrl(value);
      setMessage("Select and copy the link below.");
    }
  };

  const generatePng = async () => {
    if (!photoRef.current || imageLoading || imageError || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await document.fonts.ready;
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(photoRef.current, {
        width: 1080,
        height: 1080,
        pixelRatio: 2,
        preferredFontFormat: "woff2",
        style: { transform: "none", margin: "0" },
      });
      if (!blob) throw new Error("No image generated");
      setPng(blob);
      setMessage("Your PNG is ready to download or share.");
    } catch {
      setMessage("Could not create the PNG. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!png) return;
    const objectUrl = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = shareImageFilename(title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  };

  const sharePhoto = async () => {
    if (!png) return;
    const files = [new File([png], shareImageFilename(title), { type: "image/png" })];
    if (!navigator.canShare?.({ files })) {
      download();
      return;
    }
    try {
      await navigator.share({ files, title });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setMessage("Could not share the photo. You can download the PNG instead.");
    }
  };

  return (
    <Modal
      id={`share-${id}`}
      title={`Share ${title}`}
      description={
        app
          ? "Choose a link or create a share photo for your project."
          : "Share this developer's profile or create a share photo."
      }
      onClose={onClose}
    >
      <div className="grid gap-3">
        {links.map(({ label, url: linkUrl, icon: Icon }) => (
          <Button
            key={label}
            variant="outline-flat"
            className="justify-start gap-3 px-4 py-3 text-left"
            onClick={() => void copy(linkUrl)}
          >
            <Icon size={22} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block">{label}</span>
              <span className="mt-1 block truncate text-xs font-bold text-muted">{linkUrl}</span>
            </span>
            {copied === linkUrl ? (
              <Check size={20} aria-label="Copied" />
            ) : (
              <Copy size={20} aria-hidden="true" />
            )}
          </Button>
        ))}
        {manualUrl && (
          <Input
            ref={manualInput}
            readOnly
            value={manualUrl}
            aria-label="Link to copy"
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
        <Button
          variant="outline-flat"
          className="justify-start gap-3 px-4 py-3"
          onClick={() => setPhotoOpen((value) => !value)}
          aria-expanded={photoOpen}
          aria-controls={`share-photo-${id}`}
        >
          <ImageSquare size={22} aria-hidden="true" /> Share photo{" "}
          <span className="ml-auto text-xs text-muted">PNG</span>
        </Button>
        {photoOpen && (
          <div id={`share-photo-${id}`} className="mt-2 grid min-w-0 gap-4">
            <div className="share-photo-preview" aria-label="Share photo preview">
              <div className="share-photo-scale">
                <SharePhoto
                  ref={photoRef}
                  data={{
                    title,
                    description: app?.description ?? profile!.bio,
                    subtitle: app ? `By ${app.creator}` : profile!.role,
                    kind: app ? "project" : "developer",
                    placeholderColor: app?.color,
                    url: app ? (isSafeHttpUrl(app.url) ? app.url!.trim() : undefined) : url,
                  }}
                  image={prepared?.dataUrl}
                  palette={prepared?.palette ?? placeholderPalette}
                />
              </div>
            </div>
            {imageLoading && (
              <p role="status" className="text-sm font-bold text-muted">
                Preparing image and matching colors…
              </p>
            )}
            {imageError && (
              <p role="alert" className="text-sm font-bold text-danger">
                The image could not be prepared for export. Its host may block image sharing. You
                can still copy the links above.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {png ? (
                <>
                  <Button size="small" onClick={download} disabled={busy}>
                    <DownloadSimple size={18} /> Download PNG
                  </Button>
                  <Button
                    variant="surface"
                    size="small"
                    onClick={() => void sharePhoto()}
                    disabled={busy}
                  >
                    <ShareNetwork size={18} /> Share PNG
                  </Button>
                  <Button
                    variant="outline-flat"
                    size="small"
                    disabled={busy || imageLoading || imageError}
                    onClick={() => void generatePng()}
                  >
                    <ArrowClockwise size={18} /> {busy ? "Regenerating…" : "Regenerate PNG"}
                  </Button>
                </>
              ) : (
                <Button
                  size="small"
                  disabled={busy || imageLoading || imageError}
                  onClick={() => void generatePng()}
                >
                  <ImageSquare size={18} />
                  {busy ? "Creating PNG…" : "Create PNG"}
                </Button>
              )}
            </div>
          </div>
        )}
        <p role="status" aria-live="polite" className="text-sm font-bold text-muted">
          {message}
        </p>
      </div>
    </Modal>
  );
}
