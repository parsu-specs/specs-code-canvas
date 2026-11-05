import { useState, type ImgHTMLAttributes } from "react";
import { projectCoverSizes, projectImageSources } from "../utils/projectImages";

type Props = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "sizes" | "width" | "height"
> & { src: string; variant?: "thumbnail" | "cover" | "full" };

export default function ProjectImage({ src, variant = "thumbnail", onError, ...props }: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const image = projectImageSources(src);
  if (!image) return null;
  const fallback = failedSource === src;
  const thumbnail = variant === "thumbnail" && !fallback;
  return (
    <img
      {...props}
      src={thumbnail ? image.thumbnail : image.cover}
      srcSet={variant === "cover" && !fallback ? image.srcSet : undefined}
      sizes={
        variant === "cover" && !fallback && image.srcSet
          ? projectCoverSizes(image.width, image.height)
          : undefined
      }
      width={thumbnail ? image.thumbnailWidth : image.width}
      height={thumbnail ? image.thumbnailHeight : image.height}
      decoding={props.decoding ?? "async"}
      onError={(event) => {
        if (
          !fallback &&
          image.thumbnail !== image.cover &&
          (thumbnail || event.currentTarget.currentSrc === image.thumbnail)
        )
          setFailedSource(src);
        else onError?.(event);
      }}
    />
  );
}
