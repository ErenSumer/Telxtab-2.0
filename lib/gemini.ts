import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getChatResponse(
  messages: ChatMessage[],
  topic: string,
  languageStyle: "formal" | "informal"
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });

  // Create the system prompt based on topic and style
  const systemPrompt = `You are a helpful English language tutor. The conversation topic is "${topic}". 
Use ${languageStyle} English in your responses. 
Your goal is to help the user practice and improve their English skills.
If you notice any language mistakes, politely correct them.
Keep responses concise and engaging.`;

  try {
    // Convert our messages to Gemini's format
    const convertedMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Start a new chat
    const chat = model.startChat({
      history: convertedMessages,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Send the system prompt as the first message if there are no messages yet
    if (messages.length === 0) {
      const result = await chat.sendMessage(systemPrompt);
      return result.response.text();
    }

    // For subsequent messages, send the last user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      const result = await chat.sendMessage(lastMessage.content);
      return result.response.text();
    }

    return "I'm ready to help you practice English!";
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw error;
  }
}
