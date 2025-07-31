import type { EmotionExtraction, UIGeneration } from './types';

// Simple validation without heavy dependencies
export function validateEmotionExtraction(data: unknown): data is EmotionExtraction {
  if (!data || typeof data !== 'object') return false;
  
  const dataObj = data as Record<string, unknown>;
  const required = ['version', 'inner_mood', 'visual_texture', 'tempo', 'distance_to_user'];
  
  for (const field of required) {
    if (!dataObj[field] || typeof dataObj[field] !== 'string') {
      console.error(`Missing or invalid field: ${field}`);
      return false;
    }
  }
  
  // Basic length checks
  const textFields = ['inner_mood', 'visual_texture', 'tempo', 'distance_to_user'];
  for (const field of textFields) {
    const fieldValue = dataObj[field] as string;
    if (fieldValue.length < 10 || fieldValue.length > 200) {
      console.error(`Field ${field} length out of range: ${fieldValue.length}`);
      return false;
    }
  }
  
  return dataObj.version === '1.0';
}

export function validateUIGeneration(data: unknown): data is UIGeneration {
  if (!data || typeof data !== 'object') return false;
  
  const dataObj = data as Record<string, unknown>;
  const required = ['version', 'screen_type', 'emotion_input', 'layout_description', 'components'];
  
  for (const field of required) {
    if (!dataObj[field]) {
      console.error(`Missing field: ${field}`);
      return false;
    }
  }
  
  // Validate emotion_input
  if (!validateEmotionExtraction(dataObj.emotion_input)) {
    console.error('Invalid emotion_input');
    return false;
  }
  
  // Validate components array
  if (!Array.isArray(dataObj.components) || dataObj.components.length < 2 || dataObj.components.length > 8) {
    console.error('Invalid components array');
    return false;
  }
  
  for (const component of dataObj.components) {
    const comp = component as Record<string, unknown>;
    if (!comp.name || !comp.description || !comp.emotional_purpose) {
      console.error('Invalid component structure');
      return false;
    }
  }
  
  return dataObj.version === '1.0';
}