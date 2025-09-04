import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import type { TimelineEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const Timeline: React.FC = () => {
    const { userProfile, addTimelineEntry, setUserProfile } = useContext(AppContext);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'none'>('none');

    useEffect(() => {
        // Simple reminder system check
        if (!userProfile) return;
        const now = new Date();
        userProfile.timeline.forEach(entry => {
            const entryDate = new Date(entry.date);
            if (entry.reminderFrequency !== 'none' && entryDate <= now) {
                // A very basic check. In a real app, this would be more robust.
                const timeDiff = now.getTime() - entryDate.getTime();
                const dayDiff = timeDiff / (1000 * 3600 * 24);

                if ((entry.reminderFrequency === 'daily' && dayDiff >= 1) ||
                    (entry.reminderFrequency === 'weekly' && dayDiff >= 7) ||
                    (entry.reminderFrequency === 'monthly' && dayDiff >= 30)) {
                    toast(`Reminder: ${entry.title}`, { icon: '⏰' });
                }
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) {
            toast.error("Title and date are required.");
            return;
        }
        const newEntry: TimelineEntry = {
            entryId: uuidv4(),
            title,
            description,
            date,
            reminderFrequency,
        };
        addTimelineEntry(newEntry);
        // Reset form
        setShowForm(false);
        setTitle('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setReminderFrequency('none');
    };
    
    const handleDelete = (entryId: string) => {
        if (!userProfile) return;
        if (window.confirm("Are you sure you want to delete this timeline entry?")) {
            const updatedTimeline = userProfile.timeline.filter(e => e.entryId !== entryId);
            setUserProfile({ ...userProfile, timeline: updatedTimeline });
            toast.success("Entry deleted.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold">Learning Timeline</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Your study schedule and key concepts, all in one place.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                    {showForm ? 'Cancel' : 'Add New Entry'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    <select value={reminderFrequency} onChange={e => setReminderFrequency(e.target.value as any)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="none">No Reminders</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                    <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg">Add to Timeline</button>
                </form>
            )}

            <div className="space-y-4">
                {userProfile && userProfile.timeline.length > 0 ? (
                    userProfile.timeline.map(entry => (
                        <div key={entry.entryId} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-start justify-between">
                            <div>
                                <p className="text-lg font-bold">{entry.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(entry.date).toDateString()}</p>
                                {entry.description && <p className="mt-2 text-gray-700 dark:text-gray-300">{entry.description}</p>}
                            </div>
                             <button onClick={() => handleDelete(entry.entryId)} className="text-red-500 hover:text-red-700 font-bold p-2">
                                &times;
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                        <p>Your timeline is empty. Add a study task or save a concept from the tutor to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Timeline;
