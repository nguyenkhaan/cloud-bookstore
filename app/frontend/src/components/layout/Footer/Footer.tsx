import React from 'react';

export interface FooterProps {
  version?: string;
  note?: string;
}

export const Footer: React.FC<FooterProps> = ({
  version = 'v1.0.0-MVP',
  note = 'ComicPOS & OldBooks Hub • Dữ liệu minh họa • 18/10/2026',
}) => {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-slate-200/60 py-3 text-[11px] text-slate-400">
      <div>{note}</div>
      <div className="font-mono">{version}</div>
    </footer>
  );
};

