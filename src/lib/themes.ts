import type { ThemeKey } from './types';

export interface Theme {
  name: string;
  bg: string; panel: string; text: string; muted: string; dim: string; acc: string; acc2: string;
  mem: string; memD: string; back: string; lipid: string; rec: string;
  nuc: [string, string, string]; nucS: string;
  er: [string, string, string]; gol: [string, string, string]; mito: [string, string, string];
  ribo: string; riboHi: string; ves: [string, string]; dust: [string, string]; halo: string;
  lyso: [string, string, string]; perox: [string, string, string]; centro: [string, string, string];
}

export const THEMES: Record<ThemeKey, Theme> = {
  green: {
    name: 'Fluorescence Green', bg: '#020806', panel: '#050d0a', text: '#e8fff4', muted: '#8fb3a5', dim: '#52705f', acc: '#d4ff4f', acc2: '#7df9c6',
    mem: '#7df9c6', memD: '#0b3d2c', back: '#3ee6b0', lipid: '#9dffd8', rec: '#f07a5c',
    nuc: ['#1a1245', '#a48cf5', '#d6c9ff'], nucS: '#cbb9ff', er: ['#06382c', '#2fbf98', '#5fd9b8'], gol: ['#2a4200', '#c8f540', '#e9ffa8'], mito: ['#4a1408', '#ff7a59', '#ffcab8'],
    ribo: '#a8d98f', riboHi: '#f4ffde', ves: ['#9dffd8', '#cbb9ff'], dust: ['#7df9c6', '#ff7a59'], halo: '#2fd39a',
    lyso: ['#3a0a1a', '#ff5f8f', '#ffc0d4'], perox: ['#062a3a', '#5fd4ff', '#c8f2ff'], centro: ['#3a3000', '#ffd84a', '#fff2b8'],
  },
  gold: {
    name: 'Golden Lab', bg: '#070502', panel: '#0c0905', text: '#fff7e8', muted: '#bba98c', dim: '#6e6150', acc: '#f5c542', acc2: '#ffd98a',
    mem: '#ffcf73', memD: '#3d2a08', back: '#e0a840', lipid: '#ffe2a8', rec: '#ff8f5a',
    nuc: ['#3a1a10', '#e8916a', '#ffd0b8'], nucS: '#ffc2a0', er: ['#3a2a06', '#c99a3a', '#e8c070'], gol: ['#4a3a00', '#ffe066', '#fff2b0'], mito: ['#4a1206', '#ff6b3d', '#ffc0a0'],
    ribo: '#e8cf96', riboHi: '#fff4d6', ves: ['#ffe2a8', '#ffc2a0'], dust: ['#ffcf73', '#ff8f5a'], halo: '#d9a23a',
    lyso: ['#3a0a12', '#ff6a6a', '#ffc8c0'], perox: ['#2a2a06', '#e8e070', '#fff8c0'], centro: ['#3a1a00', '#ffa040', '#ffe0b8'],
  },
  ocean: {
    name: 'Deep Ocean', bg: '#02050b', panel: '#040912', text: '#eaf4ff', muted: '#8ea6c2', dim: '#4f6680', acc: '#5fe0ff', acc2: '#8fb8ff',
    mem: '#6fd6ff', memD: '#082a44', back: '#3fa8e0', lipid: '#a8e6ff', rec: '#ff7f9f',
    nuc: ['#141a4a', '#8f8cff', '#d0ceff'], nucS: '#b8b5ff', er: ['#062a40', '#2f8fd0', '#6fc0ff'], gol: ['#003a44', '#5fe8ff', '#c0f6ff'], mito: ['#4a0a20', '#ff6f8f', '#ffc0d0'],
    ribo: '#9fd0f0', riboHi: '#e0f6ff', ves: ['#a8e6ff', '#b8b5ff'], dust: ['#6fd6ff', '#ff7f9f'], halo: '#2f8fd0',
    lyso: ['#3a0a2a', '#ff7ad0', '#ffd0f0'], perox: ['#063a2a', '#5fffc0', '#c8ffe8'], centro: ['#3a3000', '#ffe066', '#fff4c0'],
  },
  rose: {
    name: 'Rose Petri', bg: '#090307', panel: '#0e050b', text: '#fff0f8', muted: '#c39db2', dim: '#74566a', acc: '#ff7ac8', acc2: '#ffb0dc',
    mem: '#ff9fd2', memD: '#40102c', back: '#e0609f', lipid: '#ffd0ea', rec: '#ffcf6b',
    nuc: ['#24104a', '#b58cff', '#e2d0ff'], nucS: '#d0b8ff', er: ['#40102c', '#d0609a', '#ff9fd0'], gol: ['#40103a', '#ff8fe0', '#ffd6f4'], mito: ['#4a2206', '#ffb066', '#ffe0c0'],
    ribo: '#f0b0d0', riboHi: '#fff0f8', ves: ['#ffd0ea', '#d0b8ff'], dust: ['#ff9fd2', '#ffcf6b'], halo: '#d0609a',
    lyso: ['#3a0a0a', '#ff6a5a', '#ffc8c0'], perox: ['#0a2a3a', '#7ad8ff', '#d0f2ff'], centro: ['#3a3000', '#ffe07a', '#fff4c8'],
  },
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

/** Colour used for an organelle's dot in menus and charts. */
export function organelleColor(t: Theme, key: string): string {
  switch (key) {
    case 'home': return t.acc2;
    case 'nucleus': return t.nuc[1];
    case 'er': return t.er[1];
    case 'golgi': return t.gol[1];
    case 'mito': return t.mito[1];
    case 'ribosome': return t.riboHi;
    case 'vacuole': return t.acc2;
    case 'membrane': return t.mem;
    case 'lysosome': return t.lyso[1];
    case 'peroxisome': return t.perox[1];
    case 'centrosome': return t.centro[1];
    default: return t.acc;
  }
}
