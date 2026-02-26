
import { GoogleGenAI, Type } from "@google/genai";
import { StockItem } from "../types";

/**
 * Generates business insights using Gemini 3 Pro for complex data analysis.
 */
export const getAIInsights = async (inventory: StockItem[]) => {
  // Always create a new instance before calling the API to ensure latest key/config
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const inventoryContext = JSON.stringify(inventory.map(item => ({
    name: item.name,
    qty: item.quantity,
    min: item.minStock,
    price: item.price,
    size: item.size
  })));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded to Pro for better business logic analysis
    contents: `Analyze this inventory data and provide actionable business insights in JSON format. 
    Focus on:
    1. Items that are dangerously low and need immediate reorder.
    2. Overstocked items that are tying up capital.
    3. Potential revenue insights.
    
    Inventory Data: ${inventoryContext}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING, description: 'One of: critical, warning, optimal' },
                message: { type: Type.STRING },
                recommendation: { type: Type.STRING }
              },
              required: ['status', 'message', 'recommendation']
            }
          }
        },
        required: ['insights']
      }
    }
  });

  try {
    // Access .text property directly (not a method)
    const jsonStr = response.text || '{}';
    const data = JSON.parse(jsonStr);
    return data.insights || [];
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return [];
  }
};

/**
 * Enhanced chat functionality for the AI Assistant component using Gemini 3 Pro.
 */
export const chatWithAssistant = async (message: string, history: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded to Pro for advanced reasoning
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
  });
  
  // Access .text property directly
  return response.text || "I'm sorry, I'm having trouble processing your request right now.";
};
