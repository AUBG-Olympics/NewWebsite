import * as React from "react";

type CloudinaryImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  /** Cloudinary public ID or relative path like "SponsorsLogos/foo.png" or "/SponsorsLogos/foo.png" */
  src: string;
  /** Cloudinary cloud name (defaults to your cloud) */
  cloudName?: string;
  /** Base delivery path. Change if your assets live in a folder. */
  basePath?: string; // e.g. "" if public IDs are at root
  /** Target display width for the default src */
  width?: number;
  /** DPR (device pixel ratio) hint for default src */
  dpr?: number; // 1, 1.5, 2...
  /** Responsive widths used for srcSet */
  responsiveWidths?: number[];
  /** Override Cloudinary transforms if needed */
  transforms?: string; // e.g. "c_fill,g_auto"
};

const DEFAULT_WIDTHS = [160, 200, 240, 320, 400, 480, 640, 800];

export default function CloudinaryImg({
  src,
  alt,
  cloudName = "dq9gemegi",
  basePath = "",
  width = 400,
  dpr = 1,
  responsiveWidths = DEFAULT_WIDTHS,
  transforms,
  loading = "lazy",
  decoding = "async",
  ...imgProps
}: CloudinaryImgProps) {
  // If it's already an absolute URL (http/https), just pass it through.
  const isAbsolute = /^https?:\/\//i.test(src);

  // Normalize to Cloudinary public ID (strip leading slash)
  const publicId = src.replace(/^\//, "");

  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload/`;

  // Core transforms: auto format, auto quality, limit by width; allow custom extras
  const core = `f_auto,q_auto${transforms ? `,${transforms}` : ""}`;

  // Construct a URL for a given width (and optional DPR)
  const urlFor = (w: number, devicePR = 1) =>
    isAbsolute
      ? src // absolute URLs left untouched
      : `${baseUrl}${core},c_limit,w_${Math.round(w * devicePR)}/${
          basePath ? `${basePath.replace(/\/$/, "")}/` : ""
        }${publicId}`;

  // Default src (with DPR)
  const finalSrc = urlFor(width, dpr);

  // srcSet for responsive images (1x DPR)
  const srcSet = responsiveWidths
    .map((w) => `${urlFor(w, 1)} ${w}w`)
    .join(", ");

  return (
    <img
      src={finalSrc}
      srcSet={srcSet}
      sizes={imgProps.sizes ?? "(max-width: 768px) 40vw, (max-width: 1280px) 20vw, 200px"}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...imgProps}
    />
  );
}
