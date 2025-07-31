// Emotion-driven UI generation types

export interface AssociationPath {
  trigger: string;
  chain: string[];
  final_concept: string;
  conceptual_depth: 'surface' | 'metaphorical' | 'abstract' | 'philosophical';
}

export interface SelectedConcept {
  chosen_path: number;
  core_metaphor: string;
  emotional_direction: string;
  interaction_essence: string;
}

export interface EmotionExtraction {
  version: '2.0';
  primary_triggers: string[];
  association_paths: AssociationPath[];
  selected_concept: SelectedConcept;
}

export interface UIComponent {
  name: string;
  description: string;
  emotional_purpose: string;
}

export interface UIGeneration {
  version: '1.0';
  screen_type: ScreenType;
  emotion_input: EmotionExtraction;
  layout_description: string;
  components: UIComponent[];
}

export type ScreenType = 
  | 'home' | 'browse' | 'detail' | 'input' | 'dashboard' | 'compare';

export const SCREEN_TYPES: Array<{id: ScreenType, name: string, description: string, icon: string}> = [
  { 
    id: 'home', 
    name: 'Home Screen', 
    description: 'Landing pages, hero sections, about pages - first impression screens',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>'
  },
  { 
    id: 'browse', 
    name: 'Browse Screen', 
    description: 'Lists, galleries, blogs, search results - content exploration screens',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
  },
  { 
    id: 'detail', 
    name: 'Detail Screen', 
    description: 'Product pages, article views, profile details - focused content screens',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
  },
  { 
    id: 'input', 
    name: 'Input Screen', 
    description: 'Forms, login, contact, settings - user input and configuration screens',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
  },
  { 
    id: 'dashboard', 
    name: 'Dashboard Screen', 
    description: 'Analytics, user profiles, admin panels - data overview and management screens',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 9h6v6H9z"/><path d="M9 3v6M21 9h-6M9 21v-6M3 9h6"/></svg>'
  },
  { 
    id: 'compare', 
    name: 'Compare Screen', 
    description: 'Pricing tables, feature comparisons - decision-making screens',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
  }
];