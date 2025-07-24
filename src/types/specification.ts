// UI Design Specification JSON Schema Types (シンプル版)

export interface SpecificationResponse {
  title: string;
  summary: string;
  sections: SpecificationSection[];
}

export interface SpecificationSection {
  title: string;
  content: string;
}

// Gemini API Schema Definition (シンプル・確実)
export const SPECIFICATION_SCHEMA = {
  type: "object" as const,
  properties: {
    title: { 
      type: "string" as const,
      description: "タイトル（例: UIデザイン仕様書）"
    },
    summary: { 
      type: "string" as const,
      description: "デザインの概要説明"
    },
    sections: {
      type: "array" as const,
      description: "各セクションの配列",
      items: {
        type: "object" as const,
        properties: {
          title: { 
            type: "string" as const,
            description: "セクションタイトル（例: 全体構造、UIコンポーネント）"
          },
          content: { 
            type: "string" as const,
            description: "セクションの詳細内容（マークダウン形式可）"
          }
        },
        required: ["title", "content"]
      }
    }
  },
  required: ["title", "summary", "sections"],
  propertyOrdering: ["title", "summary", "sections"]
} as const;