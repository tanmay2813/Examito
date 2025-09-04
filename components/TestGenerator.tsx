import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateTestQuestions } from '../services/geminiService';
import type { Question, TestRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const TestGenerator: React.FC = () => {
    const { userProfile, addTestRecord } = useContext(AppContext);
    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('General');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTest, setCurrentTest] = useState<Question[] | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [testFinished, setTestFinished] = useState(false);
    const [score, setScore] = useState(0);

    const handleGenerateTest = async () => {
        if (!topic || !userProfile) {
            toast.error("Please enter a topic for the test.");
            return;
        }
        setIsLoading(true);
        setCurrentTest(null);
        setTestFinished(false);
        setAnswers([]);
        try {
            const questions = await generateTestQuestions(subject, userProfile.board, topic, numQuestions);
            setCurrentTest(questions);
        } catch (error) {
            toast.error('Failed to generate test. Please try again.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswerChange = (questionIndex: number, answer: string) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = answer;
        setAnswers(newAnswers);
    };
    
    const handleSubmitTest = () => {
        if (!currentTest) return;
        let correctAnswers = 0;
        currentTest.forEach((q, i) => {
            if(q.correctAnswer === answers[i]) {
                correctAnswers++;
            }
        });
        const finalScore = Math.round((correctAnswers / currentTest.length) * 100);
        setScore(finalScore);
        
        const newTestRecord: TestRecord = {
            testId: uuidv4(),
            subject: topic,
            board: userProfile!.board,
            questions: currentTest,
            score: finalScore,
            dateTaken: new Date().toISOString()
        };
        addTestRecord(newTestRecord);
        setTestFinished(true);
        toast.success(`Test submitted! Your score is ${finalScore}%`);
    };
    
    const startNewTest = () => {
        setCurrentTest(null);
        setTestFinished(false);
        setTopic('');
    };

    if (currentTest && !testFinished) {
        return (
            <div className="space-y-6 animate-fade-in">
                <h2 className="text-3xl font-bold">Test on {topic}</h2>
                {currentTest.map((q, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                        <p className="font-semibold mb-3">{index + 1}. {q.questionText}</p>
                        <div className="space-y-2">
                            {q.options.map(option => (
                                <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    <input type="radio" name={`question-${index}`} value={option} onChange={(e) => handleAnswerChange(index, e.target.value)} className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500" />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
                <button onClick={handleSubmitTest} className="w-full py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">Submit Test</button>
            </div>
        );
    }
    
    if (testFinished) {
        return (
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg animate-fade-in">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-4xl font-bold text-green-600">Test Complete!</h2>
                <p className="text-xl mt-4">Your score on "{topic}":</p>
                <p className={`text-7xl font-extrabold my-4 ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>{score}%</p>
                <button onClick={startNewTest} className="mt-6 py-3 px-6 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 transition-transform transform hover:scale-105">Take Another Test</button>
            </div>
        );
    }
    

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">Test Generator</h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                <h2 className="text-xl font-bold">Create a New Test</h2>
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium mb-1">Topic</label>
                    <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Photosynthesis" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                    <label htmlFor="numQuestions" className="block text-sm font-medium mb-1">Number of Questions</label>
                    <select id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                    </select>
                </div>
                <button onClick={handleGenerateTest} disabled={isLoading} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400">
                    {isLoading ? 'Generating...' : 'Generate Test'}
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Test History</h2>
                <ul className="space-y-3">
                    {userProfile && userProfile.tests.length > 0 ? (
                        userProfile.tests.slice().reverse().map(test => (
                            <li key={test.testId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div>
                                    <p className="font-semibold">{test.subject}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(test.dateTaken).toLocaleDateString()}</p>
                                </div>
                                <p className={`font-bold text-lg ${test.score >= 70 ? 'text-green-500' : 'text-red-500'}`}>{test.score}%</p>
                            </li>
                        ))
                    ) : (
                        <p>No tests taken yet.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default TestGenerator;
