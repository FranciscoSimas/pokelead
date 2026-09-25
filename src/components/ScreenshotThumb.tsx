"use client";

import { useEffect, useState } from "react";
import { signedScreenshotUrl } from "@/lib/boxSync";

export function ScreenshotThumb({ path }: { path?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void signedScreenshotUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 overflow-hidden rounded-field border border-line"
      title="Imported screenshot"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Appraisal screenshot" className="h-12 w-9 object-cover" />
    </a>
  );
}
