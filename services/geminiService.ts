import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Question, Message } from '../types';

// Get API key from environment variables (Vite prefixes client-side env vars with VITE_)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set");
    // Don't throw error in production to prevent app from crashing
    if (import.meta.env.DEV) {
        throw new Error("GEMINI_API_KEY environment variable not set. Please set it in your .env file");
    }
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const model = 'gemini-2.5-flash';

// Adaptive Tutoring
const getAdaptiveTutorPrompt = () => `
You are Examito, a friendly and vibrant AI tutor for students. Your personality is encouraging and a bit playful, like Duolingo's mascot.
Strictly follow these rules:

1.  **Conversation Modes:**
    - **Direct Answer Mode:** Use this ONLY for questions asking for definitions, summaries, or simple facts (e.g., "What is...", "Define..."). Give a clear, concise answer.
    - **Critical Thinking Mode:** This is your default. For questions involving "why," "how," or problem-solving, guide the student with Socratic questions. DO NOT give the answer directly. Help them think!

2.  **Proactive Timeline Management:** You have a tool to add study reminders to the user's timeline.
    - **Trigger:** When you discuss a key concept, a deadline, or a new topic that the user should review, add it to their timeline.
    - **Action:** To add an entry, include this exact block in your response. The main text of your response should also mention that you've added it.
    <TIMELINE_ENTRY>
    {
      "title": "A concise title for the timeline",
      "description": "A brief description of what to study or remember.",
      "date": "YYYY-MM-DD",
      "reminderFrequency": "weekly"
    }
    </TIMELINE_ENTRY>
    - **Example Usage:** After explaining photosynthesis, you might say: "That's the basics of it! I've added 'Review Photosynthesis' to your timeline for next week to help you remember. 🗓️" and include the TIMELINE_ENTRY block.

3.  **File Analysis:** If the user uploads a file (image or text from a PDF), analyze it in the context of their question. For example, if they upload a diagram and ask "What is this?", explain the diagram. If they upload text from a PDF and ask for a summary, provide it.
`;

export const getAdaptiveResponse = async (
    history: Message[],
    newMessage: string,
    file?: { mimeType: string, data: string }
): Promise<string> => {
    
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: msg.file && msg.file.base64Data
            ? [{ inlineData: { mimeType: msg.file.type, data: msg.file.base64Data }}, { text: msg.text }]
            : [{ text: msg.text }]
    }));

    const newParts: any[] = [{ text: newMessage }];
    if (file) {
        newParts.unshift({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
    contents.push({ role: 'user', parts: newParts });

    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction: getAdaptiveTutorPrompt(),
        }
    });
    return response.text;
};


// File Analysis (Now merged into Adaptive Tutor)
// The `getAdaptiveResponse` function now handles file uploads.
// Fix: Added back analyzeFileContent to fix an import error in the FileAnalyzer component.
export const analyzeFileContent = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };
    const textPart = {
      text: prompt,
    };
  
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
    });
  
    return response.text;
  };

// Test Generation
export const generateTestQuestions = async (subject: string, board: string, topic: string, numQuestions: number): Promise<Question[]> => {
    const prompt = `Generate a ${numQuestions}-question multiple-choice test on the topic of "${topic}" for a student studying under the "${board}" academic board. The subject is ${subject}.`;
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        correctAnswer: { type: Type.STRING }
                    },
                    required: ["questionText", "options", "correctAnswer"]
                }
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse questions JSON:", e);
        throw new Error("Could not generate test questions. The AI returned an invalid format.");
    }
};

// Daily 5 Questions
export const generateDailyQuestions = async (board: string): Promise<Question[]> => {
    const prompt = `Generate 5 diverse, high-quality multiple-choice questions suitable for a student studying under the "${board}" curriculum. The topics can be varied (e.g., Math, Science, History) to provide a good daily challenge.`;
     const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        correctAnswer: { type: Type.STRING }
                    },
                    required: ["questionText", "options", "correctAnswer"]
                }
            }
        }
    });

     try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse daily questions JSON:", e);
        throw new Error("Could not generate daily questions.");
    }
};

// Generate Progress Report
export const generateProgressReport = async (userProfile: UserProfile) => {
    const prompt = `
    Analyze the following student profile and generate a progress report.
    Profile:
    - Name: ${userProfile.name}
    - Board: ${userProfile.board}
    - Recent Test Scores: ${userProfile.tests.slice(-5).map(t => `${t.subject}: ${t.score}%`).join(', ')}
    - Recent activity summary can be inferred from the test subjects.

    Based on this data, provide:
    1. A list of 2-3 key strengths.
    2. A list of 2-3 areas for improvement.
    3. A simple, actionable step-by-step learning plan with 3-4 steps.
    `;
    
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    stepByStepPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["strengths", "improvements", "stepByStepPlan"]
            }
        }
    });
    
    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse report JSON:", e);
        throw new Error("Could not generate a progress report.");
    }
};
