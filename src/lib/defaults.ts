import type { Content, Media, Section, SiteSettings, OrganelleKey } from './types';

let n = 0;
const eid = () => `e${Date.now().toString(36)}${(n++).toString(36)}`;

export const DEFAULT_SETTINGS: SiteSettings = {
  theme: 'green',
  owner: 'Delgerzaya',
  initials: 'DZ',
  code: 'DZ-03',
  tagline: 'Biotech × Nutrition',
  specimen: 'Eukaryotic cell',
  location: 'Taiwan',
  timezone: 'Asia/Taipei',
  autoRotate: true,
  rotateSpeed: 0.4,
  glow: 0.65,
  particles: true,
  intro: true,
  calmMotion: true,
  siteTitle: 'Delgerzaya — Biotechnology & Food Nutrition',
  description: 'Portfolio of Delgerzaya, a scholarship student in Taiwan studying biotechnology and food nutrition.',
  notifyEmail: '',
  links: [
    { label: 'LinkedIn', url: '' },
    { label: 'ResearchGate', url: '' },
    { label: 'Instagram', url: '' },
  ],
  cvMediaId: null,
};

type Partial2 = Partial<Section> & { key: OrganelleKey; organelle: string; short: string; label: string; title: string };
function section(p: Partial2, order: number): Section {
  return {
    inUse: true, status: 'published', order, showTelemetry: true, mag: 1000, objective: '100× · Oil', channels: ['GFP'], size: '', fn: '',
    entries: [], chart: { enabled: false, title: 'Results', rows: [] }, tags: [], images: [], layout: 'strip', showForm: false,
    ...p,
  };
}
const E = (date: string, title: string, detail = '') => ({ id: eid(), date, title, detail });

export function defaultSections(): Section[] {
  return [
    section({ key: 'home', organelle: 'Whole cell', short: 'Whole cell', label: 'Introduction', title: 'Delgerzaya', mag: 400, objective: '40× · Dry', channels: ['3 channels'], size: '⌀ 20 µm', fn: 'Living eukaryotic cell',
      entries: [E('Specimen', 'Biotechnology × Food Nutrition', 'Scholarship student · Taiwan'), E('Origin', 'Ulaanbaatar → Taiwan', 'Since 2022'), E('How to explore', 'Click an organelle to zoom in', 'Drag to rotate · scroll to zoom')],
      tags: ['Biotech', 'Nutrition'] }, 0),
    section({ key: 'nucleus', organelle: 'Nucleus', short: 'Nucleus', label: 'About me', title: 'Written in my DNA', mag: 1200, objective: '60× · Oil', channels: ['DAPI'], size: '⌀ 6 µm', fn: 'Genetic information',
      entries: [E('Origin', 'Ulaanbaatar, Mongolia', 'Scholarship student in Taiwan'), E('Interests', 'Probiotics & fermentation', 'Mongolian foods, studied with science'), E('Languages', 'Mongolian · English · Mandarin', '')],
      tags: ['About'], images: [{ mediaId: 'seed-lab', caption: 'In the microbiology lab' }] }, 1),
    section({ key: 'er', organelle: 'Endoplasmic reticulum', short: 'ER', label: 'Journey', title: 'My path so far', mag: 2000, channels: ['GFP'], size: 'Network', fn: 'Transport routes',
      entries: [E('2022', 'Taiwan scholarship', 'Full tuition + stipend'), E('2022 — 2023', 'Mandarin program', ''), E('2023 — now', 'B.Sc. Biotech & Food Nutrition', 'University, Taiwan')],
      tags: ['Scholarship'], images: [{ mediaId: 'seed-ceremony', caption: 'Scholarship ceremony' }, { mediaId: 'seed-mountain', caption: 'Weekend hike' }] }, 2),
    section({ key: 'golgi', organelle: 'Golgi apparatus', short: 'Golgi', label: 'Research', title: 'Discoveries from the lab', mag: 2500, channels: ['GFP', 'RFP'], size: '⌀ 1–3 µm', fn: 'Processes & packages',
      entries: [E('2025.03 — now', 'Probiotic bacteria from airag', '32 LAB strains · 16S rRNA · PCR'), E('2024.09 — 2025.01', 'Sea buckthorn antioxidants', 'DPPH · FRAP · poster'), E('Ongoing', 'Student diet survey', '24-hour recall · SPSS')],
      chart: { enabled: true, title: 'Results · inhibition zone, mm', rows: [{ label: 'MV-07', value: 18 }, { label: 'MV-12', value: 15 }, { label: 'MV-03', value: 11 }, { label: 'Control', value: 0 }] },
      tags: ['PCR', 'HPLC', 'Fermentation'],
      images: [{ mediaId: 'seed-petri', caption: 'LAB colonies on MRS agar' }, { mediaId: 'seed-poster', caption: 'Poster session' }, { mediaId: 'seed-lab', caption: 'Fermentation bench' }] }, 3),
    section({ key: 'mito', organelle: 'Mitochondria', short: 'Mitochondria', label: 'Skills', title: 'My energy sources', mag: 3000, channels: ['RFP'], size: '⌀ 0.5–1 µm', fn: 'Produces energy',
      entries: [E('Molecular biology', 'PCR · ELISA · Gel electrophoresis', 'Microbial culture, microscopy'), E('Food analysis', 'HPLC · UV-Vis · Sensory', 'Proximate analysis · HACCP'), E('Data', 'SPSS · R · BioRender', 'Statistics & figures')],
      tags: ['Lab methods'] }, 4),
    section({ key: 'ribosome', organelle: 'Ribosome', short: 'Ribosome', label: 'Projects', title: 'Things I built', mag: 4000, channels: ['GFP'], size: '⌀ 25 nm', fn: 'Builds proteins',
      entries: [E('Project 01', 'Low-sodium buuz', 'Sensory panel'), E('Project 02', 'Kombucha fermentation', '14 days · pH & acidity'), E('Project 03', 'Nutrition infographics', '')],
      tags: ['Projects'] }, 5),
    section({ key: 'vacuole', organelle: 'Vacuole', short: 'Vacuole', label: 'Gallery', title: 'Moments in Taiwan', mag: 2000, channels: ['GFP'], size: '⌀ 1–2 µm', fn: 'Stores things', layout: 'grid',
      tags: [], images: [{ mediaId: 'seed-market', caption: 'Night market' }, { mediaId: 'seed-mountain', caption: 'Sunrise hike' }, { mediaId: 'seed-lab', caption: 'Lab coat days' }, { mediaId: 'seed-ceremony', caption: 'Scholarship ceremony' }, { mediaId: 'seed-petri', caption: 'My first colonies' }, { mediaId: 'seed-poster', caption: 'First poster' }] }, 6),
    section({ key: 'membrane', organelle: 'Cell membrane', short: 'Membrane', label: 'Contact', title: 'Send me a signal', mag: 1500, objective: '60× · Oil', channels: ['RFP'], size: '8 nm thick', fn: 'Receives signals', showForm: true,
      entries: [E('Open to', 'Internships · lab assistant roles', "Master's programs")], tags: [] }, 7),
    section({ key: 'lysosome', inUse: false, status: 'draft', organelle: 'Lysosome', short: 'Lysosome', label: 'Awards', title: 'Recognition', mag: 3000, channels: ['RFP'], size: '⌀ 0.5 µm', fn: 'Recycles materials' }, 8),
    section({ key: 'centrosome', inUse: false, status: 'draft', organelle: 'Centrosome', short: 'Centrosome', label: 'Teaching', title: 'Sharing what I know', mag: 3500, channels: ['GFP'], size: '⌀ 0.4 µm', fn: 'Organises division' }, 9),
    section({ key: 'peroxisome', inUse: false, status: 'draft', organelle: 'Peroxisome', short: 'Peroxisome', label: 'Blog', title: 'Notes from the lab', mag: 3500, channels: ['GFP'], size: '⌀ 0.5 µm', fn: 'Breaks down molecules' }, 10),
  ];
}

export function defaultContent(): Content {
  return { settings: { ...DEFAULT_SETTINGS }, sections: defaultSections(), updatedAt: new Date().toISOString() };
}

/** Sample illustrations so the image features can be seen before real photos are uploaded. */
export function seedMedia(): Media[] {
  const now = new Date().toISOString();
  return ['petri', 'poster', 'lab', 'market', 'mountain', 'ceremony'].map(k => ({
    id: `seed-${k}`, kind: 'image' as const, name: `sample-${k}.svg`, url: `/seed/${k}.svg`, thumb: `/seed/${k}.svg`,
    mime: 'image/svg+xml', size: 0, width: 800, height: 600, caption: '', alt: `Sample illustration (${k})`, createdAt: now,
  }));
}
