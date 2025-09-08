import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Question, Message, Report } from '../types';

// Get API key from environment variables (Vite prefixes client-side env vars with VITE_)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize GoogleGenAI only if API key is available
let ai: any = null;
try {
    if (API_KEY) {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    } else if (import.meta.env.DEV) {
        console.warn("GEMINI_API_KEY environment variable is not set. AI features will be disabled.");
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
}

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
    if (!ai) {
        console.error("AI client is not initialized. Please check your API key.");
        return "I'm sorry, but the AI service is currently unavailable. Please check your API key and try again later.";
    }
    
    try {
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
    } catch (error) {
        console.error("Error getting AI response:", error);
        return "I'm sorry, but I encountered an error while processing your request. Please try again later.";
    }
};


// File Analysis (Now merged into Adaptive Tutor)
// The `getAdaptiveResponse` function now handles file uploads.
// Fix: Added back analyzeFileContent to fix an import error in the FileAnalyzer component.
export const analyzeFileContent = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    if (!ai) {
        console.error("AI client is not initialized. Please check your API key.");
        return "I'm sorry, but the AI service is currently unavailable. Please check your API key and try again later.";
    }

    try {
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
    } catch (error) {
        console.error("Error analyzing file content:", error);
        return "I'm sorry, but I encountered an error while analyzing the file. Please try again later.";
    }
  };

// Test Generation
export const generateTestQuestions = async (subject: string, board: string, topic: string, numQuestions: number): Promise<Question[]> => {
    if (!ai) {
        console.error("AI client is not initialized. Please check your API key.");
        return [{
            questionText: "AI service is currently unavailable. Please check your API key.",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "The AI service is not available. Please check your API key and try again."
        }];
    }

    try {
        const prompt = `Generate a ${numQuestions}-question multiple-choice test on the topic of "${topic}" for a student studying under the "${board}" academic board. The subject is ${subject}.`;
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 2000,
            },
        });

        try {
            const questions = JSON.parse(response.text);
            return Array.isArray(questions) ? questions : [];
        } catch (parseError) {
            console.error('Error parsing test questions:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Error generating test questions:', error);
        return [{
            questionText: "An error occurred while generating test questions. Please try again later.",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "There was an error generating the test questions. Please try again later."
        }];
    }
};

// Daily 5 Questions
export const generateDailyQuestions = async (board: string): Promise<Question[]> => {
    if (!ai) {
        console.error("AI client is not initialized. Please check your API key.");
        return [{
            questionText: "AI service is currently unavailable. Please check your API key.",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "The AI service is not available. Please check your API key and try again."
        }];
    }

    try {
        const prompt = `Generate 5 diverse, high-quality multiple-choice questions suitable for a student studying under the "${board}" curriculum. The topics can be varied (e.g., Math, Science, History) to provide a good daily challenge.`;
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 2000,
            },
        });

        try {
            const questions = JSON.parse(response.text);
            return Array.isArray(questions) ? questions : [];
        } catch (parseError) {
            console.error('Error parsing daily questions:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Error generating daily questions:', error);
        return [{
            questionText: "An error occurred while generating daily questions. Please try again later.",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "There was an error generating the daily questions. Please try again later."
        }];
    }
};

// Generate Progress Report
export const generateProgressReport = async (userProfile: UserProfile): Promise<Report> => {
    // Check if AI client is initialized
    if (!ai) {
        console.error("AI client is not initialized. Please check your API key.");
        // Return a default error report
        return {
            reportId: `error-${Date.now()}`,
            strengths: ["Error: AI service unavailable"],
            improvements: ["Please check your API key and try again"],
            stepByStepPlan: [
                "1. Check your .env file for the VITE_GEMINI_API_KEY",
                "2. Make sure the API key is valid and has the correct permissions",
                "3. Restart the application after making changes"
            ],
            dateGenerated: new Date().toISOString()
        };
    }

    try {
        const prompt = `
        Analyze the following student profile and generate a progress report.
        Profile:
        - Name: ${userProfile.name}
        - Board: ${userProfile.board}
        - Recent Test Scores: ${userProfile.tests.slice(-5).map(t => `${t.subject}: ${t.score}%`).join(', ')}
        - Recent activity summary can be inferred from the test subjects.

        Based on this data, provide a JSON object with:
        - strengths: A list of 2-3 key strengths.
        - improvements: A list of 2-3 areas for improvement.
        - plan: A simple, actionable step-by-step learning plan with 3-4 steps.
        `;
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.5,
                maxOutputTokens: 2000,
            },
        });

        try {
            const report = JSON.parse(response.text);
            // Ensure all required fields are present and of the correct type
            return {
                reportId: `report-${Date.now()}`,
                strengths: Array.isArray(report.strengths) ? 
                    report.strengths.map(String).filter(Boolean) : [],
                improvements: Array.isArray(report.improvements) ? 
                    report.improvements.map(String).filter(Boolean) : [],
                stepByStepPlan: Array.isArray(report.plan) ? 
                    report.plan.map(String).filter(Boolean) : ["No learning plan was generated."],
                dateGenerated: new Date().toISOString()
            };
        } catch (parseError) {
            console.error('Error parsing progress report:', parseError);
            return {
                reportId: `error-${Date.now()}`,
                strengths: [],
                improvements: ["Error parsing the progress report"],
                stepByStepPlan: ["Could not parse the progress report. Please try again later."],
                dateGenerated: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error('Error generating progress report:', error);
        return {
            reportId: `error-${Date.now()}`,
            strengths: [],
            improvements: ["An error occurred while generating the progress report."],
            stepByStepPlan: ["Please try again later or contact support if the issue persists."],
            dateGenerated: new Date().toISOString()
        };
    }
};
