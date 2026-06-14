import { useState } from 'react';

interface QuestionImageProps {
  url?: string;
  className?: string;
}

// Renders one or more question images. Multiple URLs may be space-separated.
// Clicking an image opens a full-size zoom overlay.
export function QuestionImage({ url, className = '' }: QuestionImageProps) {
  const [zoomed, setZoomed] = useState<string | null>(null);

  if (!url) return null;
  const urls = url.split(/\s+/).filter(Boolean);
  if (urls.length === 0) return null;

  return (
    <>
      <div className={`my-3 flex flex-wrap gap-3 ${className}`}>
        {urls.map((src, i) => (
          <img
            key={i}
            src={src}
            alt="question illustration"
            loading="lazy"
            referrerPolicy="no-referrer"
            onClick={() => setZoomed(src)}
            className="max-h-80 max-w-full rounded-md border border-border cursor-zoom-in"
          />
        ))}
      </div>

      {zoomed && (
        <div
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        >
          <img
            src={zoomed}
            alt="question illustration enlarged"
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full rounded-md"
          />
        </div>
      )}
    </>
  );
}
