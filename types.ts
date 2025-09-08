
import type { Dispatch, SetStateAction } from 'react';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'model';
  file?: {
      name: string;
      type: string;
      base64Data: string;
  }
}

export interface UserProfile {
  userId: string;
  name: string;
  board: string;
  XP: number;
  streak: number;
  lastDailyCompletion: string | null; // ISO Date string yyyy-mm-dd
  dailyQuestionsCompleted: number;
  timeline: TimelineEntry[];
  tests: TestRecord[];
  reports: Report[];
  tutorHistory: Message[];
}

export interface TimelineEntry {
  id: string;
  type: 'test' | 'study' | 'reminder' | 'achievement' | 'other';
  title: string;
  description: string;
  date: string; // ISO8601 string
  details?: Record<string, any>;
  reminderFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
}

export interface Question {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    userAnswer?: string;
    isCorrect?: boolean;
}

export interface TestRecord {
  testId: string;
  subject: string;
  board: string;
  questions: Question[];
  score: number;
  dateTaken: string; // ISO8601 string
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export interface Report {
  reportId: string;
  strengths: string[];
  improvements: string[];
  stepByStepPlan: string[];
  dateGenerated: string; // ISO8601 string
}

export enum View {
    DASHBOARD = 'DASHBOARD',
    TUTOR = 'TUTOR',
    TESTS = 'TESTS',
    REPORTS = 'REPORTS',
    TIMELINE = 'TIMELINE',
}

export interface AppContextType {
    userProfile: UserProfile | null;
    loading: boolean;
    setUserProfile: (profile: UserProfile | null) => void;
    addTimelineEntry: (entry: TimelineEntry) => void;
    addTestRecord: (record: TestRecord) => void;
    addReport: (report: Report) => void;
    setTutorHistory: (history: Message[]) => void;
}
