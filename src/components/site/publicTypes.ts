import type { OrganelleKey, SiteSettings, Entry, ChartRow } from '@/lib/types';

export interface PublicImage { url: string; thumb: string; caption: string; alt: string }
export interface PublicSection {
  key: OrganelleKey; organelle: string; short: string; label: string; title: string; draft: boolean;
  showTelemetry: boolean; mag: number; objective: string; channels: string[]; size: string; fn: string;
  entries: Entry[]; chart: { enabled: boolean; title: string; rows: ChartRow[] }; tags: string[];
  images: PublicImage[]; layout: 'strip' | 'grid'; showForm: boolean;
}
export type PublicSettings = Pick<SiteSettings, 'theme' | 'owner' | 'initials' | 'code' | 'tagline' | 'specimen' | 'location' | 'timezone' | 'autoRotate' | 'rotateSpeed' | 'glow' | 'particles' | 'intro' | 'calmMotion'>;
export interface PublicData { settings: PublicSettings; sections: PublicSection[]; links: { label: string; url: string }[]; cvUrl: string | null; preview: boolean }

/** 2-D positions (cell coordinates) used by the little cell map in the left panel. */
export const MAP_POS: Record<OrganelleKey, [number, number]> = {
  home: [0, 0], nucleus: [-0.8, 0.35], er: [1.3, 1.1], golgi: [2.35, -0.75], mito: [2.6, 2.1], ribosome: [-0.2, -2.1],
  vacuole: [-2.7, -1.5], membrane: [-2.66, 3.48], lysosome: [3.0, -2.6], peroxisome: [-1.9, 3.0], centrosome: [1.2, 1.4],
};
