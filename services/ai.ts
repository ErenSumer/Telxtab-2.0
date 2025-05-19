import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Generative AI API with your API key
const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
);

// Define the interface for the question generator response
export interface QuestionResponse {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/**
 * Generate multiple choice questions based on a lesson topic and content
 * @param topic The lesson topic
 * @param content Additional content or context for the question generation
 * @param count Number of questions to generate (default: 5)
 * @returns Array of generated questions with options, correct answers and explanations
 */
export async function generateMultipleChoiceQuestions(
  topic: string,
  content: string,
  count: number = 5
): Promise<QuestionResponse[]> {
  try {
    // Access the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Generate ${count} multiple choice questions about the following topic for a language learning platform:
    TOPIC: ${topic}
    CONTENT: ${content}
    
    Each question should:
    1. Be clear and directly related to the topic
    2. Have 4 options (labeled A, B, C, D)
    3. Have one correct answer
    4. Include a brief explanation for why the answer is correct
    
    Format the response as a valid JSON array with the following structure:
    [
      {
        "question": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "The correct option text (exact match to one of the options)",
        "explanation": "Brief explanation of why this is the correct answer"
      },
      // more questions...
    ]
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract the JSON array from the response
    // This is needed because sometimes the API returns markdown or other formatting
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (!jsonMatch) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to generate valid questions");
    }

    // Parse the JSON response
    const questions: QuestionResponse[] = JSON.parse(jsonMatch[0]);

    return questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    // Return sample questions in case of an error for better UX
    return generateSampleQuestions(count);
  }
}

/**
 * Generate sample questions in case the AI service fails
 * @param count Number of sample questions to generate
 * @returns Array of sample questions
 */
function generateSampleQuestions(count: number = 5): QuestionResponse[] {
  const samples: QuestionResponse[] = [
    {
      question: "What is the most common way to say 'hello' in English?",
      options: ["Hi", "Hola", "Bonjour", "Ciao"],
      correctAnswer: "Hi",
      explanation:
        "While all options are greetings, only 'Hi' is an English greeting. The others are from Spanish, French, and Italian respectively.",
    },
    {
      question: "Which of these is a correct sentence structure in English?",
      options: [
        "I yesterday went to the store",
        "Yesterday I went to the store",
        "I went yesterday to store the",
        "To the store yesterday I went",
      ],
      correctAnswer: "Yesterday I went to the store",
      explanation:
        "The correct sentence follows standard English subject-verb-object order, with the time adverb 'yesterday' at the beginning.",
    },
    {
      question: "Which word is a verb?",
      options: ["Happy", "Jump", "Beautiful", "Table"],
      correctAnswer: "Jump",
      explanation:
        "'Jump' is a verb (an action word). 'Happy' and 'Beautiful' are adjectives, and 'Table' is a noun.",
    },
    {
      question: "What is the past tense of 'eat'?",
      options: ["Eated", "Ate", "Eaten", "Eating"],
      correctAnswer: "Ate",
      explanation:
        "'Ate' is the simple past tense of 'eat'. 'Eaten' is the past participle, 'Eating' is the present participle, and 'Eated' is incorrect.",
    },
    {
      question: "Which of these is a question word in English?",
      options: ["Because", "Where", "Then", "And"],
      correctAnswer: "Where",
      explanation:
        "'Where' is a question word used to ask about location. The other options are conjunctions or adverbs, not question words.",
    },
  ];

  // Return the requested number of samples
  return samples.slice(0, count);
}
