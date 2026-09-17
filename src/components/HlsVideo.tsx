"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * A <video> that also plays HLS (.m3u8) streams.
 *
 * Safari and iOS webviews play HLS natively; Chrome and most Android webviews
 * do not, so there hls.js is loaded on demand. Anything else (mp4) goes
 * straight to the element. Live TV and the home popup both stream HLS.
 */
type Props = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
  /** Try to start playing once the source is attached. */
  autoPlayOnLoad?: boolean;
};

export const HlsVideo = forwardRef<HTMLVideoElement, Props>(function HlsVideo(
  { src, autoPlayOnLoad = true, ...rest },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    let destroyed = false;
    let hls: { destroy: () => void } | null = null;

    const play = () => {
      if (!autoPlayOnLoad) return;
      // Browsers block autoplay with sound until the user interacts; fall
      // back to muted so the stream still starts.
      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    };

    const isHls = /\.m3u8(\?|$)/i.test(src);

    if (!isHls || el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = src;
      play();
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (destroyed) return;
        if (!Hls.isSupported()) {
          el.src = src;
          play();
          return;
        }
        const instance = new Hls({ enableWorker: true, lowLatencyMode: true });
        instance.loadSource(src);
        instance.attachMedia(el);
        instance.on(Hls.Events.MANIFEST_PARSED, play);
        hls = instance;
      });
    }

    return () => {
      destroyed = true;
      hls?.destroy();
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        /* element already gone */
      }
    };
  }, [src, autoPlayOnLoad]);

  return <video ref={videoRef} {...rest} />;
});
