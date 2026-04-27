import React from 'react';
import {
  Sparkles, Lightbulb, Cpu, Link as LinkIcon, Settings, Cable,
  Box, Wrench, Hammer, Truck, Shirt, ShoppingBag,
  Pill, Utensils, Beaker, Leaf, Gift, Monitor,
  Package, Archive, Briefcase, Wine, Baby, Book,
} from 'lucide-react';
import type { IconKey, DepartmentDef, Warehouse, AppSettings } from './types';

// =============================================================================
// Icon registry — every IconKey must be present here.
// =============================================================================
export const ICON_MAP: Record<IconKey, React.ElementType> = {
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  cpu: Cpu,
  link: LinkIcon,
  settings: Settings,
  cable: Cable,
  box: Box,
  wrench: Wrench,
  hammer: Hammer,
  truck: Truck,
  shirt: Shirt,
  shoppingBag: ShoppingBag,
  pill: Pill,
  utensils: Utensils,
  beaker: Beaker,
  leaf: Leaf,
  gift: Gift,
  monitor: Monitor,
  package: Package,
  archive: Archive,
  briefcase: Briefcase,
  wine: Wine,
  baby: Baby,
  book: Book,
};

export const ICON_OPTIONS: IconKey[] = Object.keys(ICON_MAP) as IconKey[];

// =============================================================================
// Industry presets — chosen during setup, fully editable afterwards.
// =============================================================================
export interface IndustryPreset {
  id: string;
  name: string;
  description: string;
  departments: DepartmentDef[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: 'general',
    name: 'General Storage',
    description: 'Flexible defaults that work for almost anything.',
    departments: [
      { id: 'cat-a', label: 'Category A', prefix: 'CTA', color: '#3b82f6', icon: 'box' },
      { id: 'cat-b', label: 'Category B', prefix: 'CTB', color: '#22c55e', icon: 'archive' },
      { id: 'cat-c', label: 'Category C', prefix: 'CTC', color: '#eab308', icon: 'package' },
      { id: 'cat-d', label: 'Category D', prefix: 'CTD', color: '#ef4444', icon: 'briefcase' },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment / AV',
    description: 'Stage lighting, audio, video — built for tour & event rental.',
    departments: [
      { id: 'moving-lights', label: 'Moving Lights', prefix: 'MOV', color: '#3b82f6', icon: 'sparkles' },
      { id: 'conventional', label: 'Conventional', prefix: 'CON', color: '#ef4444', icon: 'lightbulb' },
      { id: 'electronics', label: 'Electronics', prefix: 'ELE', color: '#22c55e', icon: 'cpu' },
      { id: 'rigging', label: 'Rigging', prefix: 'RIG', color: '#eab308', icon: 'link' },
      { id: 'motors', label: 'Motors', prefix: 'MOT', color: '#a855f7', icon: 'settings' },
      { id: 'cable', label: 'Cable', prefix: 'CAB', color: '#f97316', icon: 'cable' },
    ],
  },
  {
    id: 'retail',
    name: 'Retail / E-commerce',
    description: 'Apparel, accessories, gifts, consumer goods.',
    departments: [
      { id: 'apparel', label: 'Apparel', prefix: 'APP', color: '#ec4899', icon: 'shirt' },
      { id: 'accessories', label: 'Accessories', prefix: 'ACC', color: '#a855f7', icon: 'shoppingBag' },
      { id: 'electronics', label: 'Electronics', prefix: 'ELE', color: '#3b82f6', icon: 'monitor' },
      { id: 'gifts', label: 'Gifts & Seasonal', prefix: 'GFT', color: '#22c55e', icon: 'gift' },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Raw materials, components, finished goods, tools.',
    departments: [
      { id: 'raw', label: 'Raw Materials', prefix: 'RAW', color: '#64748b', icon: 'archive' },
      { id: 'components', label: 'Components', prefix: 'CMP', color: '#3b82f6', icon: 'cpu' },
      { id: 'finished', label: 'Finished Goods', prefix: 'FIN', color: '#22c55e', icon: 'box' },
      { id: 'tools', label: 'Tools & Equipment', prefix: 'TLS', color: '#eab308', icon: 'wrench' },
    ],
  },
  {
    id: 'tools-rental',
    name: 'Tools & Equipment Rental',
    description: 'Construction, contractor, party, equipment hire.',
    departments: [
      { id: 'power', label: 'Power Tools', prefix: 'PWR', color: '#ef4444', icon: 'wrench' },
      { id: 'hand', label: 'Hand Tools', prefix: 'HND', color: '#eab308', icon: 'hammer' },
      { id: 'heavy', label: 'Heavy Equipment', prefix: 'HVY', color: '#64748b', icon: 'truck' },
      { id: 'consumables', label: 'Consumables', prefix: 'CSM', color: '#22c55e', icon: 'package' },
    ],
  },
  {
    id: 'food-bev',
    name: 'Food & Beverage',
    description: 'Restaurant, catering, distribution.',
    departments: [
      { id: 'dry', label: 'Dry Goods', prefix: 'DRY', color: '#eab308', icon: 'package' },
      { id: 'cold', label: 'Cold Storage', prefix: 'CLD', color: '#3b82f6', icon: 'utensils' },
      { id: 'beverage', label: 'Beverage', prefix: 'BEV', color: '#a855f7', icon: 'wine' },
      { id: 'produce', label: 'Produce', prefix: 'PRD', color: '#22c55e', icon: 'leaf' },
    ],
  },
];

// =============================================================================
// Default rack templates — sizes are in pixel-grid units, scalable.
// =============================================================================
export interface RackTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  capacity: number;
}

export const RACK_TEMPLATES: RackTemplate[] = [
  { id: 'small',  name: 'Small Bay',     description: 'Single floor unit',    width: 800,  height: 600,  capacity: 24 },
  { id: 'std',    name: 'Standard Bay',  description: 'Most common shelving', width: 1200, height: 800,  capacity: 48 },
  { id: 'wide',   name: 'Wide Bay',      description: 'Double-width block',   width: 2400, height: 800,  capacity: 96 },
  { id: 'tall',   name: 'Tall Stack',    description: 'High-density vertical',width: 1200, height: 1600, capacity: 144 },
];

// =============================================================================
// Defaults
// =============================================================================
export const DEFAULT_WAREHOUSE: Warehouse = {
  id: 'wh-main',
  name: 'Main Warehouse',
  location: '',
  createdAt: Date.now(),
};

export const DEFAULT_SETTINGS: AppSettings = {
  warehouseId: DEFAULT_WAREHOUSE.id,
  sidebarPosition: 'LEFT',
  density: 'COMFORTABLE',
  enableAI: true,
  enableNotifications: true,
  enableAutosave: true,
  brandName: 'VWMS',
  departmentLabel: 'Department',
  itemLabel: 'Item',
  rackLabel: 'Rack',
};

// =============================================================================
// Helpers
// =============================================================================
export function getDepartmentMeta(
  departmentId: string,
  departments: DepartmentDef[]
): DepartmentDef {
  return (
    departments.find(d => d.id === departmentId) ||
    departments[0] || {
      id: 'unknown',
      label: 'Unknown',
      prefix: 'UNK',
      color: '#64748b',
      icon: 'box',
    }
  );
}

export function getIcon(key: IconKey): React.ElementType {
  return ICON_MAP[key] || Box;
}

// Tailwind-friendly background classes mapped from common hex.
// We use inline style for arbitrary colors; this is for fast tag chips.
export function colorToBgStyle(hex: string): React.CSSProperties {
  return { backgroundColor: hex };
}
export function colorToBorderStyle(hex: string): React.CSSProperties {
  return { borderColor: hex };
}
