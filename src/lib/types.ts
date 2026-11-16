export type ThemeKey = 'green' | 'gold' | 'ocean' | 'rose';

/** Every section lives inside one organelle of the 3D cell. The key never changes; everything else is editable. */
export type OrganelleKey =
  | 'home' | 'nucleus' | 'er' | 'golgi' | 'mito' | 'ribosome' | 'vacuole' | 'membrane'
  | 'lysosome' | 'centrosome' | 'peroxisome';

export type SectionStatus = 'published' | 'draft';

export interface Entry { id: string; date: string; title: string; detail: string }
export interface ChartRow { label: string; value: number }
export interface SectionImage { mediaId: string; caption: string }

export interface Section {
  key: OrganelleKey;
  /** false = organelle is not used as a section (shown under "Unused organelles" in admin). */
  inUse: boolean;
  status: SectionStatus;
  order: number;
  organelle: string;   // e.g. "Golgi apparatus"
  short: string;       // e.g. "Golgi"
  label: string;       // menu label, e.g. "Research"
  title: string;       // notebook heading
  showTelemetry: boolean;
  mag: number;
  objective: string;
  channels: string[];
  size: string;
  fn: string;
  entries: Entry[];
  chart: { enabled: boolean; title: string; rows: ChartRow[] };
  tags: string[];
  images: SectionImage[];
  layout: 'strip' | 'grid';
  /** Only used by the section that should show the contact form. */
  showForm: boolean;
}

export interface SiteSettings {
  theme: ThemeKey;
  owner: string;
  initials: string;
  code: string;
  tagline: string;
  specimen: string;
  location: string;
  timezone: string;
  autoRotate: boolean;
  rotateSpeed: number;  // 0..1
  glow: number;         // 0..1
  particles: boolean;
  intro: boolean;
  calmMotion: boolean;
  siteTitle: string;
  description: string;
  seoImageId: string | null;   // share image for link previews (og:image)
  notifyEmail: string;
  links: { label: string; url: string }[];
  cvMediaId: string | null;
}

export interface Content { settings: SiteSettings; sections: Section[]; updatedAt: string }

export interface Media {
  id: string;
  kind: 'image' | 'document';
  name: string;        // original file name
  url: string;         // full-size public url
  thumb: string;       // small preview url (same as url for documents)
  mime: string;
  size: number;        // bytes (stored file)
  width: number;
  height: number;
  caption: string;
  alt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  topic: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface Stats { days: Record<string, number> }
