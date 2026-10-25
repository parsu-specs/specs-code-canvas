import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { CONTACT_EMAIL } from "../data/team";
import { normalizeSharePhotoUrl, shareTextColors, type SharePalette } from "../utils/shareImage";
import "./SharePhoto.css";
import { Link } from "@phosphor-icons/react";
import ProjectPlaceholder from "./ProjectPlaceholder";

export type SharePhotoData = {
  title: string;
  description: string;
  subtitle: string;
  url?: string;
  kind: "project" | "developer";
  placeholderColor?: string;
};

const SharePhoto = forwardRef<
  HTMLDivElement,
  {
    data: SharePhotoData;
    image?: string;
    palette: SharePalette;
  }
>(function SharePhoto({ data, image, palette }, ref) {
  const photoUrl = normalizeSharePhotoUrl(data.url);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const preserveTwoTone = !image || data.kind === "developer";
  const [textColors, setTextColors] = useState(() =>
    shareTextColors(palette.primary, palette.accent, preserveTwoTone),
  );
  useLayoutEffect(() => {
    const updateColors = () => {
      if (!headerRef.current || !footerRef.current) return;
      setTextColors(
        shareTextColors(
          getComputedStyle(headerRef.current).backgroundColor,
          getComputedStyle(footerRef.current).backgroundColor,
          preserveTwoTone,
        ),
      );
    };
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "data-palette", "class", "style"],
    });
    return () => observer.disconnect();
  }, [palette.primary, palette.accent, preserveTwoTone]);
  return (
    <div ref={ref} className="share-photo" style={{ color: palette.ink }}>
      <header
        ref={headerRef}
        className="share-photo-header"
        style={{ background: palette.primary, color: textColors.onPrimary }}
      >
        <div className="share-photo-org">
          <span className="share-photo-seal" style={{ borderColor: palette.accent }}>
            <img src="/specs-logo.png" alt="SPECS logo" />
          </span>
          <div>
            <div>Partido State University · Goa Campus</div>
            <strong style={{ color: textColors.headerAccent }}>
              Society of Programmers and Enthusiasts
              <br />
              in Computer Science
            </strong>
          </div>
        </div>
        <div className="share-photo-monogram">
          Code<span style={{ color: textColors.headerAccent }}>Canvas</span>
        </div>
      </header>
      <main className="share-photo-paper">
        <div className="share-photo-frame" style={{ borderColor: palette.ink }}>
          <span className="share-photo-tape" style={{ background: palette.accent }} />
          <div className="share-photo-image">
            {image ? (
              <img
                src={image}
                alt={data.kind === "project" ? `${data.title} thumbnail` : data.title}
              />
            ) : data.kind === "project" ? (
              <ProjectPlaceholder
                title={data.title}
                color={data.placeholderColor ?? "mint"}
                className="h-full w-full"
                artworkScale={535 / 192}
                textColor={textColors.onPrimary}
              />
            ) : (
              <div
                className="share-photo-placeholder"
                style={{ background: palette.primary, color: textColors.onPrimary }}
              >
                <span>{data.title.slice(0, 1).toUpperCase()}</span>
                <strong>{data.title}</strong>
              </div>
            )}
          </div>
          <span className="share-photo-frame-border" aria-hidden="true" />
        </div>
        {photoUrl && (
          <div className="share-photo-url">
            <Link size={32} weight="duotone" aria-hidden="true" />
            <span>{photoUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </div>
        )}
      </main>
      <footer
        ref={footerRef}
        className="share-photo-footer"
        style={{ background: palette.accent, borderColor: palette.ink, color: textColors.onAccent }}
      >
        <div className="share-photo-info">
          <div
            className="share-photo-name"
            style={{ borderColor: palette.ink, color: palette.ink }}
          >
            <span className="share-photo-tape" style={{ background: palette.primary }} />
            <small>{data.kind === "project" ? "PROJECT SPOTLIGHT" : "MEET THE DEVELOPER"}</small>
            <strong className={data.title.length > 40 ? "share-photo-long-title" : undefined}>
              {data.title}
            </strong>
            <span>{data.subtitle}</span>
          </div>
          <p className="share-photo-description">
            {data.description ||
              (data.kind === "project"
                ? "Discover this student-built project on CodeCanvas."
                : "Meet this builder and explore their projects on CodeCanvas.")}
          </p>
        </div>
        <div className="share-photo-credits">
          <strong>specs-code-canvas.vercel.app</strong>
          <strong>·</strong>
          <strong>facebook.com/parsu.specs</strong>
          <strong>·</strong>
          <strong>{CONTACT_EMAIL}</strong>
        </div>
      </footer>
    </div>
  );
});

export default SharePhoto;
