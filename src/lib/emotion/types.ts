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

export const SCREEN_TYPES: Array<{id: ScreenType, name: string, description: string}> = [
  { id: 'profile', name: '👤 Profile Page', description: 'User profile with avatar, info, and content' },
  { id: 'list', name: '📋 List View', description: 'Data listing with filters and sorting' },
  { id: 'auth', name: '🔐 Login/Signup', description: 'Authentication forms and flows' },
  { id: 'form', name: '📝 Create/Edit Form', description: 'Data input and editing interface' },
  { id: 'detail', name: '📄 Detail View', description: 'Single item with full information' },
  { id: 'dashboard', name: '📊 Dashboard', description: 'Analytics and metrics overview' },
  { id: 'settings', name: '⚙️ Settings', description: 'Configuration and preferences' },
  { id: 'modal', name: '🪟 Modal/Dialog', description: 'Overlay content and interactions' },
  { id: 'landing', name: '🏠 Landing Page', description: 'Marketing homepage with hero and features' },
  { id: 'hero', name: '🎭 Hero Section', description: 'Large banner with key message and CTA' },
  { id: 'pricing', name: '💰 Pricing', description: 'Plans and pricing tiers comparison' },
  { id: 'gallery', name: '🖼️ Gallery', description: 'Visual content showcase and browsing' },
  { id: 'blog', name: '📝 Blog Post', description: 'Article layout with text and media' },
  { id: 'contact', name: '📞 Contact', description: 'Contact form and company information' },
  { id: 'about', name: '👥 About Us', description: 'Company story and team introduction' },
  { id: 'product', name: '📦 Product Page', description: 'Product details and purchase flow' }
];