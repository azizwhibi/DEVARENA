export const PRESET_INSTITUTIONS = [
  '42',
  'EPITECH',
  'Telecom Paris',
  'Ecole Polytechnique',
  'CentraleSupelec',
  'INSA Lyon',
  'Sorbonne Universite',
  'Universite Paris-Saclay',
  'MIT',
  'Stanford University',
  'UC Berkeley',
  'Carnegie Mellon University',
  'ETH Zurich',
  'University of Oxford',
  'University of Cambridge',
] as const;

export type PresetInstitution = (typeof PRESET_INSTITUTIONS)[number];
