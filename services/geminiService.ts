
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PostSize, DesignStyle, GroundingSource, TemplateSuggestion, FileAttachment } from "../types.ts";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Ensure API_KEY is available; the shim in index.html helps prevent crashes
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    this.ai = new GoogleGenAI({ apiKey: apiKey as string });
  }

  async correctText(text: string): Promise<string> {
    if (!text || text.trim().length < 3) return text;
    
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fix the spelling, grammar, and punctuation of the following text while keeping the original meaning and tone. Return ONLY the corrected text without any explanations or quotes: "${text}"`,
      config: {
        temperature: 0.1,
      }
    });

    return response.text?.trim() || text;
  }

  async researchTopic(topic: string, instructions?: string, attachments: FileAttachment[] = []): Promise<{ info: string; sources: GroundingSource[] }> {
    const parts: any[] = [
      { text: `Gather the latest information, key facts, and current trends about: ${topic}. 
      ${instructions ? `Keep these user instructions in mind for context: ${instructions}` : ''}
      I have also attached some reference documents/images. Please use their content to provide a highly relevant summary for a social media post.` }
    ];

    attachments.forEach(file => {
      if (file.type === 'image' || file.type === 'pdf') {
        parts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType
          }
        });
      } else {
        parts[0].text += `\nReference File Attached: ${file.name}`;
      }
    });

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const info = response.text || "No specific details found, but I will create a creative post based on the topic and attachments.";
    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Reference",
      uri: chunk.web?.uri || "#",
    })) || [];

    return { info, sources };
  }

  async suggestTemplates(topic: string, styles: DesignStyle[]): Promise<TemplateSuggestion[]> {
    const styleStr = styles.join(", ");
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find 6 specific types of Canva templates that would be perfect for a social media post about "${topic}" using styles like ${styleStr}. 
      For each suggestion, provide a name, a brief description, and a search query URL for Canva.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              searchUrl: { type: Type.STRING }
            },
            required: ["name", "description", "searchUrl"]
          }
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "[]");
      return data.map((item: any) => ({
        ...item,
        searchUrl: item.searchUrl.startsWith('http') 
          ? item.searchUrl 
          : `https://www.canva.com/templates/?query=${encodeURIComponent(item.name + " " + topic)}`
      }));
    } catch (e) {
      return [];
    }
  }

  async generateCaptions(topic: string, researchInfo: string, instructions?: string): Promise<{ caption: string; hashtags: string[] }> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create an engaging social media caption and hashtags for a post about "${topic}". 
      Context from research and attachments: ${researchInfo}.
      ${instructions ? `User instructions: ${instructions}` : ''}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["caption", "hashtags"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { caption: "Engaging content coming soon!", hashtags: ["#trending"] };
    }
  }

  async generateImage(topic: string, styles: DesignStyle[], size: PostSize, instructions?: string, attachments: FileAttachment[] = []): Promise<string> {
    const stylesString = styles.join(", ");
    const referenceImage = attachments.find(a => a.type === 'image');
    
    // Normalize aspect ratio for Gemini: it only accepts specific strings
    let geminiAspectRatio: "1:1" | "4:3" | "3:4" | "16:9" | "9:16" = "1:1";
    if (Object.values(PostSize).includes(size as any)) {
      geminiAspectRatio = size as any;
    }

    let promptText = `A premium quality social media poster or advertisement for "${topic}". 
    Style characteristics: ${stylesString}. 
    Additional context: ${instructions || ''} 
    The layout should be professional and suitable for ${size === PostSize.INSTAGRAM ? 'Instagram' : size === PostSize.A4_PORTRAIT ? 'A4 Portrait' : 'a social media feed'}.`;

    if (referenceImage) {
      promptText = `Using the attached reference image as a base, generate a high-end social media poster for "${topic}". 
      Maintain similar structure but apply these styles: ${stylesString}. ${instructions || ''}`;
    }

    const parts: any[] = [{ text: promptText }];
    if (referenceImage) {
      parts.unshift({
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType
        }
      });
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: geminiAspectRatio },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Failed to generate image");
    return imageUrl;
  }
}

export const geminiService = new GeminiService();
