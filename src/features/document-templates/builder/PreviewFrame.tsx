'use client';

import { useElementSize } from '@mantine/hooks';

/** Rendered page width (paper plus the document's own margins), in CSS px. */
const PAPER_WIDTH = { A4: 840, Letter: 862 } as const;

export type PreviewZoom = 'fit' | 1;

export const paperWidthFor = (page: unknown) =>
  page === 'Letter' ? PAPER_WIDTH.Letter : PAPER_WIDTH.A4;

/**
 * Shows a rendered document at its real paper width, scaled down to fit the
 * pane (or at 100% with scrolling), so it looks the way it will print rather
 * than reflowing to whatever room is left on screen.
 */
export function PreviewFrame({
  html,
  paperWidth,
  zoom,
}: {
  html: string;
  paperWidth: number;
  zoom: PreviewZoom;
}) {
  const { ref, width, height } = useElementSize();
  const scale = zoom === 'fit' ? (width ? Math.min(1, width / paperWidth) : 1) : zoom;
  return (
    <div
      ref={ref}
      style={{
        height: '100%',
        minHeight: 0,
        overflow: zoom === 'fit' ? 'hidden' : 'auto',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: 6,
        background: '#525659',
      }}
    >
      <div
        style={{
          width: paperWidth * scale,
          height: height || '100%',
          margin: '0 auto',
          overflow: 'hidden',
        }}
      >
        <iframe
          title="Preview"
          sandbox=""
          srcDoc={html}
          style={{
            width: paperWidth,
            height: height ? height / scale : '100%',
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
