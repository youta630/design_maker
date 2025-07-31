// Emotion-driven UI generation types

export interface EmotionExtraction {
  version: '1.0';
  inner_mood: string;
  visual_texture: string;
  tempo: string;
  distance_to_user: string;
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
  | 'profile' | 'list' | 'auth' | 'form' | 'detail' | 'dashboard'
  | 'settings' | 'modal' | 'landing' | 'hero' | 'pricing' 
  | 'gallery' | 'blog' | 'contact' | 'about' | 'product';

export const SCREEN_TYPES: Array<{id: ScreenType, name: string, description: string, icon: string}> = [
  { 
    id: 'profile', 
    name: 'Profile Page', 
    description: 'User profile with avatar, info, and content',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  { 
    id: 'list', 
    name: 'List View', 
    description: 'Data listing with filters and sorting',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
  },
  { 
    id: 'auth', 
    name: 'Login/Signup', 
    description: 'Authentication forms and flows',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
  },
  { 
    id: 'form', 
    name: 'Create/Edit Form', 
    description: 'Data input and editing interface',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
  },
  { 
    id: 'detail', 
    name: 'Detail View', 
    description: 'Single item with full information',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
  },
  { 
    id: 'dashboard', 
    name: 'Dashboard', 
    description: 'Analytics and metrics overview',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 9h6v6H9z"/><path d="M9 3v6M21 9h-6M9 21v-6M3 9h6"/></svg>'
  },
  { 
    id: 'settings', 
    name: 'Settings', 
    description: 'Configuration and preferences',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  },
  { 
    id: 'modal', 
    name: 'Modal/Dialog', 
    description: 'Overlay content and interactions',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></svg>'
  },
  { 
    id: 'landing', 
    name: 'Landing Page', 
    description: 'Marketing homepage with hero and features',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>'
  },
  { 
    id: 'hero', 
    name: 'Hero Section', 
    description: 'Large banner with key message and CTA',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M8 12l4 4 4-4"/><path d="M16 8l-4-4-4 4"/></svg>'
  },
  { 
    id: 'pricing', 
    name: 'Pricing', 
    description: 'Plans and pricing tiers comparison',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
  },
  { 
    id: 'gallery', 
    name: 'Gallery', 
    description: 'Visual content showcase and browsing',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
  },
  { 
    id: 'blog', 
    name: 'Blog Post', 
    description: 'Article layout with text and media',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
  },
  { 
    id: 'contact', 
    name: 'Contact', 
    description: 'Contact form and company information',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>'
  },
  { 
    id: 'about', 
    name: 'About Us', 
    description: 'Company story and team introduction',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  { 
    id: 'product', 
    name: 'Product Page', 
    description: 'Product details and purchase flow',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>'
  }
];