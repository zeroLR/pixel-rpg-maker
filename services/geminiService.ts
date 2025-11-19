
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { EntityType, Entity } from '../types';

// Helper to get AI client
const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generatePixelAsset = async (prompt: string, type: EntityType, tags: string[] = []): Promise<Entity> => {
    const ai = getAiClient();
    const tagContext = tags.length > 0 ? `Style/Theme tags: ${tags.join(', ')}.` : '';

    // 1. Generate Image
    // Using gemini-2.5-flash-image for generation as per guidelines
    const imagePrompt = `A high-quality 16-bit pixel art sprite of a ${prompt} for an RPG game. ${tagContext} White background, full body, centered, retro style.`;
    
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePrompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    let imageBase64 = '';
    const parts = imageResponse.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData) {
        imageBase64 = parts[0].inlineData.data;
    } else {
        throw new Error("Failed to generate image asset");
    }

    // 2. Generate Stats & Lore
    // Using gemini-2.5-flash for JSON structured data
    const statPrompt = `Generate RPG stats and details for a ${type} described as "${prompt}". 
    ${tagContext}
    Return ONLY JSON. 
    Rules:
    - HP between 50-200.
    - MP between 0-100.
    - ATK between 5-30.
    - DEF between 0-20.
    - Name should be creative.
    - Description should be short (under 20 words).
    - If NPC, include a 'dialoguePrompt' describing their personality for a roleplay chat.
    `;

    const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: statPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    stats: {
                        type: Type.OBJECT,
                        properties: {
                            maxHp: { type: Type.NUMBER },
                            maxMp: { type: Type.NUMBER },
                            atk: { type: Type.NUMBER },
                            def: { type: Type.NUMBER }
                        }
                    },
                    dialoguePrompt: { type: Type.STRING, nullable: true }
                }
            }
        }
    });

    // Sanitize the response text to remove Markdown code blocks if present
    let jsonStr = textResponse.text || '{}';
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data: any = {};
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON", e);
        // Fallback defaults handled below
    }

    return {
        id: crypto.randomUUID(),
        name: data.name || "Unknown Entity",
        description: data.description || "A mysterious entity.",
        type: type,
        imageBase64: imageBase64,
        stats: {
            hp: data.stats?.maxHp || 50,
            maxHp: data.stats?.maxHp || 50,
            mp: data.stats?.maxMp || 0,
            maxMp: data.stats?.maxMp || 0,
            atk: data.stats?.atk || 5,
            def: data.stats?.def || 0,
        },
        dialoguePrompt: data.dialoguePrompt,
        tags: tags
    };
};

export const generateChatResponse = async (npc: Entity, history: {sender: string, text: string}[], userMessage: string): Promise<string> => {
    const ai = getAiClient();
    
    const systemInstruction = `You are ${npc.name}, an RPG NPC. ${npc.description}. 
    Personality: ${npc.dialoguePrompt || 'Friendly and helpful'}. 
    Keep responses short (under 30 words) and in character for a retro RPG.`;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction }
    });

    // Reconstruct simple history if needed, or just send the latest for simplicity in this stateless call context
    const contextPrompt = `
    History:
    ${history.map(h => `${h.sender}: ${h.text}`).join('\n')}
    User: ${userMessage}
    `;

    const result = await chat.sendMessage({ message: contextPrompt });
    return result.text || "...";
};
