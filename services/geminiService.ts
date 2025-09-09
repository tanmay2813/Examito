import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UserProfile, Question, Message, Report } from '../types';

// Get API key from environment variables (Vite prefixes client-side env vars with VITE_)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

console.log('API Key check:', {
    hasKey: !!API_KEY,
    keyLength: API_KEY?.length,
    keyPrefix: API_KEY?.substring(0, 10) + '...',
    isDev: import.meta.env.DEV
});

// Initialize GoogleGenAI only if API key is available
let genAI: GoogleGenerativeAI | null = null;
try {
    if (API_KEY && API_KEY.trim() !== '' && API_KEY !== 'YOUR_API_KEY_HERE') {
        genAI = new GoogleGenerativeAI(API_KEY);
        console.log('✅ GoogleGenAI client initialized successfully');
    } else {
        console.warn('⚠️ API key not configured properly');
        if (import.meta.env.DEV) {
            console.warn("GEMINI_API_KEY environment variable is not set or invalid. AI features will be disabled.");
            console.warn("Current API_KEY value:", API_KEY ? `${API_KEY.substring(0, 10)}...` : 'undefined');
        }
    }
} catch (error) {
    console.error("❌ Failed to initialize GoogleGenAI:", error);
    genAI = null;
}


// Adaptive Tutoring
const getAdaptiveTutorPrompt = () => `
You are Examito, a friendly and vibrant AI tutor for students. Your personality is encouraging and a bit playful, like Duolingo's mascot.
Strictly follow these rules:

1.  **Conversation Modes:**
    - **Direct Answer Mode:** Use this ONLY for questions asking for definitions, summaries, or simple facts (e.g., "What is...", "Define..."). Give a clear, concise answer.
    - **Critical Thinking Mode:** This is your default. For questions involving "why," "how," or problem-solving, guide the student with Socratic questions. DO NOT give the answer directly. Help them think!

2.  **Proactive Timeline Management:** You can add study reminders to the user's timeline.
    - **When to add an entry:**
      * When introducing a new concept that should be reviewed later
      * When setting a study goal or deadline
      * When the student struggles with a concept
      * At the end of a study session to schedule review
    
    - **How to add an entry:**
      Include a JSON object with the following structure in your response, exactly as shown:
      
      {"timelineAction":"add","entry":{"type":"study","title":"Review [Topic]","description":"Brief description of what to review","date":"YYYY-MM-DD","reminderFrequency":"weekly"}}
      
      Replace the placeholders with actual values:
      - [Topic]: The subject or concept to review
      - YYYY-MM-DD: The date for the review (e.g., 2023-12-15)
      
      The date should be in the future, typically 1-7 days from now for review items.
    
    - **Example Usage:** 
      After explaining a concept, you might respond:
      "Great job learning about photosynthesis! I've added a review session to your timeline for next week to help reinforce what you've learned. 🌱"
      
      And include the timeline entry like this:
      {"timelineAction":"add","entry":{"type":"study","title":"Review Photosynthesis","description":"Review the process of photosynthesis and its importance to plants","date":"2023-12-20","reminderFrequency":"weekly"}}

3. **Response Format:**
   - Always respond in markdown format
   - Use emojis to make the conversation more engaging
   - Keep explanations clear and concise
   - Break down complex topics into smaller, manageable parts

3.  **File Analysis:** If the user uploads a file (image or text from a PDF), analyze it in the context of their question. For example, if they upload a diagram and ask "What is this?", explain the diagram. If they upload text from a PDF and ask for a summary, provide it.
`;

interface TimelineAction {
    timelineAction: 'add' | 'update' | 'remove';
    entry: any;
}

const parseTimelineAction = (text: string): TimelineAction | null => {
    try {
        // Look for a JSON object in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.timelineAction && parsed.entry) {
            return parsed as TimelineAction;
        }
        return null;
    } catch (error) {
        console.error('Error parsing timeline action:', error);
        return null;
    }
};

export const getAdaptiveResponse = async (
    history: Message[],
    newMessage: string,
    file?: { mimeType: string, data: string }
): Promise<{ text: string; timelineAction?: TimelineAction }> => {
    console.log('getAdaptiveResponse called, genAI status:', {
        genAI: !!genAI,
        apiKey: !!API_KEY,
        apiKeyLength: API_KEY?.length
    });
    
    if (!genAI) {
        console.error("❌ AI client is not initialized. Please check your API key.");
        console.error("Debug info:", {
            API_KEY: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'not set',
            genAI: genAI,
            env: import.meta.env.VITE_GEMINI_API_KEY ? 'set' : 'not set'
        });
        return {
            text: "🔑 **AI Service Not Available**\n\nDebugging info:\n- API Key in env: " + (API_KEY ? 'Present' : 'Missing') + "\n- Client initialized: " + (genAI ? 'Yes' : 'No') + "\n\nPlease check your `.env` file and make sure `VITE_GEMINI_API_KEY` is set correctly.\n\nGet your API key from: [Google AI Studio](https://makersuite.google.com/app/apikey)"
        };
    }

    try {
        // Prepare the conversation history
        const messages = [
            { role: 'user', parts: [{ text: getAdaptiveTutorPrompt() }] },
            { role: 'model', parts: [{ text: 'I am Examito, your AI tutor. How can I help you learn today?' }] },
            ...history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            })),
            { role: 'user', parts: [{ text: newMessage }] }
        ];

        // If there's a file, add it to the last user message
        if (file) {
            const lastMessage = messages[messages.length - 1];
            (lastMessage.parts as any[]).push({
                fileData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        }

        // Generate the response
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
            },
        });

        try {
            // For Google Generative AI, we need to send just the latest user message
            // and handle conversation context differently
            const userMessage = newMessage + (file ? ' [File uploaded]' : '');
            
            const result = await model.generateContent(userMessage);
            
            // Get the response text
            const responseText = result.response.text();
            
            // Check for timeline actions in the response
            const timelineAction = parseTimelineAction(responseText);
            
            // Remove the JSON from the response text if it exists
            let cleanText = responseText;
            if (timelineAction) {
                cleanText = responseText.replace(/\{[\s\S]*\}/, '').trim();
            }
            
            return {
                text: cleanText || responseText,
                ...(timelineAction && { timelineAction })
            };
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error generating adaptive response:', error);
        return {
            text: "I'm sorry, but I encountered an error while processing your request. Please try again later."
        };
    }
};


// File Analysis (Now merged into Adaptive Tutor)
// The `getAdaptiveResponse` function now handles file uploads.
// Fix: Added back analyzeFileContent to fix an import error in the FileAnalyzer component.
export const analyzeFileContent = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    if (!genAI) {
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
    
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent([textPart, imagePart]);
    
        return response.response.text();
    } catch (error) {
        console.error("Error analyzing file content:", error);
        return "I'm sorry, but I encountered an error while analyzing the file. Please try again later.";
    }
  };

// Test Generation
export const generateTestQuestions = async (subject: string, board: string, topic: string, numQuestions: number): Promise<Question[]> => {
    if (!genAI) {
        console.error("AI client is not initialized. Please check your API key.");
        return [{
            id: `error-${Date.now()}`,
            questionText: "AI service is currently unavailable. Please check your API key.",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "The AI service is not available. Please check your API key and try again.",
            subject: subject || 'General',
            difficulty: 'medium'
        }];
    }

    try {
        const prompt = `Generate a ${numQuestions}-question multiple-choice test in JSON format on the topic of "${topic}" for a student studying under the "${board}" academic board. The subject is ${subject}.
        
        The response must be a valid JSON array where each question has these exact fields:
        - id: string (unique identifier)
        - questionText: string (the question itself)
        - options: string[] (exactly 4 options)
        - correctAnswer: string (must match one of the options exactly)
        - explanation: string (detailed explanation of the answer)
        - subject: string (the subject area)
        - difficulty: 'easy' | 'medium' | 'hard'
        
        Example format:
        [
            {
                "id": "q1",
                "questionText": "What is the capital of France?",
                "options": ["London", "Berlin", "Paris", "Madrid"],
                "correctAnswer": "Paris",
                "explanation": "Paris is the capital and most populous city of France.",
                "subject": "Geography",
                "difficulty": "easy"
            }
        ]`;

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 4000,
            },
        });
        
        let responseText = '';
        try {
            // Generate content and get the response
            const result = await model.generateContent(prompt);
            
            // Get the response text
            responseText = result.response.text();
            
            // Handle markdown code blocks in the response
            let jsonText = responseText;
            const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
            }
            
            // Additional cleanup: remove any leading/trailing non-JSON content
            const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
            
            const questions = JSON.parse(jsonText);
            if (!Array.isArray(questions)) {
                throw new Error('Response is not an array');
            }
            
            // Validate and format each question
            return questions.map((q, i) => ({
                id: q.id || `test-${Date.now()}-${i}`,
                questionText: q.questionText || `Question ${i + 1} about ${topic}`,
                options: Array.isArray(q.options) && q.options.length === 4 ? q.options : 
                    ["Option 1", "Option 2", "Option 3", "Option 4"],
                correctAnswer: q.correctAnswer || "Option 1",
                explanation: q.explanation || 'No explanation provided',
                subject: q.subject || subject || 'General',
                difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'
            }));
        } catch (parseError) {
            console.error('Error parsing test questions:', parseError, 'Response:', responseText);
            throw new Error('Failed to parse test questions. Please try again.');
        }
    } catch (error) {
        console.error('Error generating test questions:', error);
        throw new Error('Failed to generate test questions. Please try again later.');
    }
};

// Daily 5 Questions
export const generateDailyQuestions = async (board: string): Promise<Question[]> => {
    if (!genAI) {
        console.error("AI client is not initialized. Please check your API key.");
        return [{
            id: `error-${Date.now()}`,
            questionText: "AI service is currently unavailable. Please check your API key.",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "The AI service is not available. Please check your API key and try again.",
            subject: "General",
            difficulty: "medium"
        }];
    }

    try {
        const prompt = `Generate 5 diverse, high-quality multiple-choice questions in JSON format suitable for a student studying under the "${board}" curriculum. 
        The response must be a valid JSON array where each question has these exact fields:
        - id: string (unique identifier)
        - questionText: string (the question itself)
        - options: string[] (exactly 4 options)
        - correctAnswer: string (must match one of the options exactly)
        - explanation: string (explanation of the answer)
        - subject: string (subject area)
        - difficulty: 'easy' | 'medium' | 'hard'
        
        Example format:
        [
            {
                "id": "q1",
                "questionText": "What is the capital of France?",
                "options": ["London", "Berlin", "Paris", "Madrid"],
                "correctAnswer": "Paris",
                "explanation": "Paris is the capital of France.",
                "subject": "Geography",
                "difficulty": "easy"
            }
        ]`;

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 2000,
            },
        });
        const response = await model.generateContent(prompt);

        try {
            let responseText = response.response.text();
            
            // Handle markdown code blocks in the response
            const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                responseText = codeBlockMatch[1].trim();
            }
            
            // Additional cleanup: remove any leading/trailing non-JSON content
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }
            
            const questions = JSON.parse(responseText);
            if (!Array.isArray(questions)) {
                throw new Error('Response is not an array');
            }
            
            // Validate each question has required fields
            return questions.map((q, i) => ({
                id: q.id || `daily-${Date.now()}-${i}`,
                questionText: q.questionText || 'No question text provided',
                options: Array.isArray(q.options) && q.options.length === 4 ? q.options : 
                    ["Option 1", "Option 2", "Option 3", "Option 4"],
                correctAnswer: q.correctAnswer || "Option 1",
                explanation: q.explanation || 'No explanation provided',
                subject: q.subject || 'General',
                difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'
            }));
        } catch (parseError) {
            console.error('Error parsing daily questions:', parseError, 'Response:', response?.response?.text());
            throw new Error('Failed to parse questions. Please try again.');
        }
    } catch (error) {
        console.error('Error generating daily questions:', error);
        throw new Error('Failed to generate questions. Please try again later.');
    }
};

// Generate Progress Report
export const generateProgressReport = async (userProfile: UserProfile): Promise<Report> => {
    // Check if AI client is initialized
    if (!genAI) {
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
        
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.5,
                maxOutputTokens: 2000,
            },
        });
        let responseText = '';
        try {
            const result = await model.generateContent(prompt);
            
            // Get the response text
            responseText = result.response.text();
            
            // Handle markdown code blocks in the response
            let jsonText = responseText;
            const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
            }
            
            // Additional cleanup: remove any leading/trailing non-JSON content
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
            
            const report = JSON.parse(jsonText);
            
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
            console.error('Error parsing progress report:', parseError, 'Response:', responseText);
            return {
                reportId: `error-${Date.now()}`,
                strengths: [],
                improvements: ["Error parsing the progress report"],
                stepByStepPlan: ["Could not parse the progress report. The AI response format was unexpected."],
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
