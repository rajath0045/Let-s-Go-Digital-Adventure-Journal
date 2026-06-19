import React from 'react';
import { Instagram, ExternalLink } from 'lucide-react';

interface EmbedPreviewProps {
  url: string | null;
}

export const EmbedPreview: React.FC<EmbedPreviewProps> = ({ url }) => {
  if (!url) return null;

  // 1. YouTube Parsing
  const getYoutubeId = (urlStr: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = urlStr.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    } catch {
      return null;
    }
  };

  // 2. Instagram Parsing
  const getInstagramShortcode = (urlStr: string) => {
    try {
      const match = urlStr.match(/instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9-_]+)/);
      return match ? match[2] : null;
    } catch {
      return null;
    }
  };

  const ytId = getYoutubeId(url);
  const igCode = getInstagramShortcode(url);

  if (ytId) {
    return (
      <div className="w-full mt-3 overflow-hidden rounded-lg border border-parchment-300 dark:border-rpg-border aspect-video shadow-md">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${ytId}`}
          title="YouTube Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  if (igCode) {
    return (
      <div className="w-full mt-3 overflow-hidden rounded-lg border border-parchment-300 dark:border-rpg-border bg-parchment-100 dark:bg-rpg-card p-4 shadow-md flex flex-col items-center">
        <div className="flex items-center gap-2 text-rose-500 mb-2">
          <Instagram size={20} />
          <span className="font-semibold text-sm font-serif">Instagram Reel/Post Preview</span>
        </div>
        
        {/* Responsive Instagram block fallback / Embed iframe */}
        <div className="relative w-full aspect-[4/5] bg-parchment-200 dark:bg-rpg-charcoal rounded flex flex-col justify-center items-center p-6 text-center">
          <Instagram size={48} className="text-parchment-400 mb-3 animate-pulse" />
          <p className="text-xs text-parchment-800 dark:text-gray-400 mb-4 px-4 font-sans">
            Instagram content requires authentication. Tap below to view this quest lore directly on Instagram.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-md"
          >
            Open in Instagram <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  // Fallback for general links
  return (
    <div className="w-full mt-3 p-3 rounded-lg border border-dashed border-parchment-300 dark:border-rpg-border bg-parchment-50 dark:bg-rpg-card/50 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 overflow-hidden">
        <ExternalLink size={16} className="text-parchment-500 shrink-0" />
        <span className="text-xs truncate text-parchment-800 dark:text-gray-400">{url}</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-serif text-parchment-500 hover:text-parchment-850 dark:hover:text-rpg-gold shrink-0 underline ml-2"
      >
        Visit Link
      </a>
    </div>
  );
};
