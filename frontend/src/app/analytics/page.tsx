"use client";

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, BarChart,
    Bar, AreaChart, Area
} from 'recharts';
import { Calendar, ChevronDown, Clock, Dumbbell, Flame, Zap } from 'lucide-react';
import { useUser } from '@/backend/userProvider';
import ReactMarkdown from 'react-markdown';
import Image from "next/image";
import Link from "next/link";

// Interface for workout data from API
interface WorkoutSession {
    _id: string;
    user_email: string;
    date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    tpose_performed: boolean;
    tpose_hold_time_seconds: number;
    tpose_form_score: number;
    bicep_curl_performed: boolean;
    bicep_curl_reps: number;
    bicep_curl_form_score: number;
    squat_performed: boolean;
    squat_reps: number;
    squat_form_score: number;
    lateral_raise_performed: boolean;
    lateral_raise_reps: number;
    lateral_raise_form_score: number;
    plank_performed: boolean;
    plank_hold_time_seconds: number;
    plank_form_score: number;
    id: string;
    created_at: string;
}

// Interface for workout history chart data
interface WorkoutHistoryData {
    date: string;
    duration: number;
    caloriesBurned: number;
    repCount: number;
    formScore: number;
}

// Interface for exercise progress chart data
interface ExerciseProgressData {
    name: string;
    week1: number;
    week2: number;
    week3: number;
    week4: number;
}

// Interface for form quality chart data
interface FormQualityData {
    date: string;
    bicepCurl: number;
    squat: number;
    lateralRaise: number;
    plank: number;
    tpose: number;
}

const AnalyticsDashboard = () => {
    const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);
    const [insightsError, setInsightsError] = useState<string | null>(null);

    // Derived statistics
    const [workoutHistoryData, setWorkoutHistoryData] = useState<WorkoutHistoryData[]>([]);
    const [exerciseProgressData, setExerciseProgressData] = useState<ExerciseProgressData[]>([]);
    const [formQualityData, setFormQualityData] = useState<FormQualityData[]>([]);
    const [totalStats, setTotalStats] = useState({
        totalWorkouts: 0,
        totalMinutes: 0,
        totalCalories: 0,
        currentStreak: 0,
        bestStreak: 0,
        improvementPercentages: {
            workouts: 0,
            minutes: 0,
            calories: 0
        }
    });

    const { user } = useUser();

    // Fetch workout data
    // Replace your existing fetchWorkoutData function with this one

    useEffect(() => {
        fetchWorkoutData();
    }, [user]);

    const fetchWorkoutData = async () => {
        setIsLoading(true);
        try {
            // Get API key from environment or use fallback for development
            const apiKey = process.env.NEXT_PUBLIC_API_KEY || "";

            // Add user_email filter - this is likely required by the API
            const userEmail = user?.email || "anonymous@user.com"; // Use the same email you used for submitting workouts

            const response = await fetch(
                `https://morphos-backend-service-1020595365432.us-central1.run.app/exercises?email=${encodeURIComponent(userEmail)}`,
                {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'X-API-Key': apiKey
                    }
                }
            );

            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorBody = await response.text();
                    errorDetails = errorBody;
                    console.error('Error response body:', errorBody);
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                }

                throw new Error(`Error fetching workout data: ${response.status} - ${errorDetails}`);
            }

            const data = await response.json();
            console.log('Successfully fetched workout data:', data);

            // The API might return an object with a data property instead of an array directly
            // Handle both cases
            const workoutData = Array.isArray(data) ? data : (data.data || []);

            setWorkoutSessions(workoutData);

            // Process the data for various charts and stats
            if (workoutData.length > 0) {
                processWorkoutData(workoutData);
            } else {
                console.log('No workout data found for this user');
            }
        } catch (err) {
            console.error('Failed to fetch workout data:', err);
            setError('Failed to load workout data. Please try again later. ' + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkoutData();
    }, [user]);

    // Process workout data for charts and statistics
    const processWorkoutData = (data: WorkoutSession[]) => {
        if (!data || data.length === 0) return;

        // Sort sessions by date (newest first)
        const sortedSessions = [...data].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Process workout history data (last 10 sessions)
        const historyData: WorkoutHistoryData[] = sortedSessions.slice(0, 10).reverse().map(session => {
            // Calculate total reps across all exercises
            const totalReps = session.bicep_curl_reps + session.squat_reps + session.lateral_raise_reps;

            // Calculate average form score from performed exercises
            let formScoreSum = 0;
            let formScoreCount = 0;

            if (session.tpose_performed && session.tpose_form_score > 0) {
                formScoreSum += session.tpose_form_score;
                formScoreCount++;
            }
            if (session.bicep_curl_performed && session.bicep_curl_form_score > 0) {
                formScoreSum += session.bicep_curl_form_score;
                formScoreCount++;
            }
            if (session.squat_performed && session.squat_form_score > 0) {
                formScoreSum += session.squat_form_score;
                formScoreCount++;
            }
            if (session.lateral_raise_performed && session.lateral_raise_form_score > 0) {
                formScoreSum += session.lateral_raise_form_score;
                formScoreCount++;
            }
            if (session.plank_performed && session.plank_form_score > 0) {
                formScoreSum += session.plank_form_score;
                formScoreCount++;
            }

            const avgFormScore = formScoreCount > 0 ? formScoreSum / formScoreCount : 0;

            // Estimate calories burned (simple formula based on duration and intensity)
            // Using a basic MET value of 4 for moderate intensity exercise
            // Calories = MET × weight in kg × duration in hours
            // Assuming 70kg person as default
            const MET = 4;
            const weightKg = 70;
            const durationHours = session.duration_minutes / 60;
            const caloriesBurned = Math.round(MET * weightKg * durationHours);

            return {
                date: new Date(session.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
                duration: session.duration_minutes,
                caloriesBurned: caloriesBurned,
                repCount: totalReps,
                formScore: Math.round(avgFormScore)
            };
        });

        const generateAiInsights = async () => {
            if (workoutSessions.length === 0) {
                setInsightsError("Need workout data to generate insights");
                return;
            }

            setIsGeneratingInsights(true);
            setInsightsError(null);

            try {
                // Prepare data summary for the AI to analyze
                const workoutSummary = {
                    totalWorkouts: totalStats.totalWorkouts,
                    totalMinutes: totalStats.totalMinutes,
                    currentStreak: totalStats.currentStreak,
                    improvementPercentages: totalStats.improvementPercentages,
                    exercises: {
                        bicepCurls: {
                            performed: workoutSessions.filter(s => s.bicep_curl_performed).length,
                            totalReps: workoutSessions.reduce((sum, s) => sum + (s.bicep_curl_performed ? s.bicep_curl_reps : 0), 0),
                            avgFormScore: Math.round(workoutSessions
                                .filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0)
                                .reduce((sum, s) => sum + s.bicep_curl_form_score, 0) /
                                Math.max(1, workoutSessions.filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0).length)
                            )
                        },
                        squats: {
                            performed: workoutSessions.filter(s => s.squat_performed).length,
                            totalReps: workoutSessions.reduce((sum, s) => sum + (s.squat_performed ? s.squat_reps : 0), 0),
                            avgFormScore: Math.round(workoutSessions
                                .filter(s => s.squat_performed && s.squat_form_score > 0)
                                .reduce((sum, s) => sum + s.squat_form_score, 0) /
                                Math.max(1, workoutSessions.filter(s => s.squat_performed && s.squat_form_score > 0).length)
                            )
                        },
                        lateralRaises: {
                            performed: workoutSessions.filter(s => s.lateral_raise_performed).length,
                            totalReps: workoutSessions.reduce((sum, s) => sum + (s.lateral_raise_performed ? s.lateral_raise_reps : 0), 0),
                            avgFormScore: Math.round(workoutSessions
                                .filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0)
                                .reduce((sum, s) => sum + s.lateral_raise_form_score, 0) /
                                Math.max(1, workoutSessions.filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0).length)
                            )
                        },
                        plank: {
                            performed: workoutSessions.filter(s => s.plank_performed).length,
                            totalHoldSeconds: workoutSessions.reduce((sum, s) => sum + (s.plank_performed ? s.plank_hold_time_seconds : 0), 0),
                            avgFormScore: Math.round(workoutSessions
                                .filter(s => s.plank_performed && s.plank_form_score > 0)
                                .reduce((sum, s) => sum + s.plank_form_score, 0) /
                                Math.max(1, workoutSessions.filter(s => s.plank_performed && s.plank_form_score > 0).length)
                            )
                        }
                    },
                    // Add workout history progression
                    recentWorkouts: workoutSessions.slice(0, 5).map(session => {
                        const date = new Date(session.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        });

                        const exercises = [];
                        if (session.bicep_curl_performed) exercises.push('Bicep Curl');
                        if (session.squat_performed) exercises.push('Squat');
                        if (session.lateral_raise_performed) exercises.push('Lateral Raise');
                        if (session.plank_performed) exercises.push('Plank');

                        return {
                            date,
                            duration: session.duration_minutes,
                            exercises: exercises.join(', ')
                        };
                    })
                };

                // Call API to generate insights
                const response = await fetch('/api/insights', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ workoutSummary }),
                });

                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }

                const data = await response.json();

                // Set the insights
                setAiInsights(data.insights);
            } catch (error) {
                console.error('Error generating AI insights:', error);
                setInsightsError('Failed to generate insights. Please try again later.');
            } finally {
                setIsGeneratingInsights(false);
            }
        };

        // Process form quality data
        const formData: FormQualityData[] = sortedSessions.slice(0, 10).reverse().map(session => {
            return {
                date: new Date(session.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
                bicepCurl: session.bicep_curl_form_score || 0,
                squat: session.squat_form_score || 0,
                lateralRaise: session.lateral_raise_form_score || 0,
                plank: session.plank_form_score || 0,
                tpose: session.tpose_form_score || 0
            };
        });

        // Group workouts by week for exercise progress
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const weeklyData = sortedSessions
            .filter(session => new Date(session.date) >= fourWeeksAgo)
            .reduce((acc, session) => {
                const sessionDate = new Date(session.date);
                const weekNumber = Math.floor((new Date().getTime() - sessionDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

                if (weekNumber <= 4) {
                    const weekKey = `week${weekNumber}` as 'week1' | 'week2' | 'week3' | 'week4';

                    if (!acc.bicepCurl) {
                        acc.bicepCurl = { week1: 0, week2: 0, week3: 0, week4: 0 };
                        acc.squat = { week1: 0, week2: 0, week3: 0, week4: 0 };
                        acc.lateralRaise = { week1: 0, week2: 0, week3: 0, week4: 0 };
                        acc.plank = { week1: 0, week2: 0, week3: 0, week4: 0 };
                    }

                    if (session.bicep_curl_performed) acc.bicepCurl[weekKey] += session.bicep_curl_reps;
                    if (session.squat_performed) acc.squat[weekKey] += session.squat_reps;
                    if (session.lateral_raise_performed) acc.lateralRaise[weekKey] += session.lateral_raise_reps;
                    if (session.plank_performed) acc.plank[weekKey] += session.plank_hold_time_seconds;
                }

                return acc;
            }, {} as Record<string, Record<'week1' | 'week2' | 'week3' | 'week4', number>>);

        const progressData: ExerciseProgressData[] = [
            { name: 'Bicep Curls', ...weeklyData.bicepCurl },
            { name: 'Squats', ...weeklyData.squat },
            { name: 'Lateral Raises', ...weeklyData.lateralRaise },
            { name: 'Plank (sec)', ...weeklyData.plank }
        ];

        // Calculate total stats
        const totalWorkouts = sortedSessions.length;
        const totalMinutes = sortedSessions.reduce((sum, session) => sum + session.duration_minutes, 0);

        // Calculate calories burned across all sessions
        const totalCalories = sortedSessions.reduce((sum, session) => {
            const MET = 4;
            const weightKg = 70;
            const durationHours = session.duration_minutes / 60;
            return sum + Math.round(MET * weightKg * durationHours);
        }, 0);

        // Calculate workout streak (consecutive days)
        const streakData = calculateStreak(sortedSessions);

        // Calculate improvement percentages (if we have enough data)
        const improvementPercentages = {
            workouts: 0,
            minutes: 0,
            calories: 0
        };

        if (sortedSessions.length >= 2) {
            // Split data into current month and previous month
            const today = new Date();
            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

            const currentMonthSessions = sortedSessions.filter(session =>
                new Date(session.date) >= currentMonthStart
            );

            const lastMonthSessions = sortedSessions.filter(session =>
                new Date(session.date) >= lastMonthStart &&
                new Date(session.date) < currentMonthStart
            );

            if (lastMonthSessions.length > 0) {
                // Calculate workouts improvement
                const currentMonthWorkouts = currentMonthSessions.length;
                const lastMonthWorkouts = lastMonthSessions.length;
                improvementPercentages.workouts = lastMonthWorkouts > 0
                    ? Math.round(((currentMonthWorkouts - lastMonthWorkouts) / lastMonthWorkouts) * 100)
                    : 100;

                // Calculate minutes improvement
                const currentMonthMinutes = currentMonthSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
                const lastMonthMinutes = lastMonthSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
                improvementPercentages.minutes = lastMonthMinutes > 0
                    ? Math.round(((currentMonthMinutes - lastMonthMinutes) / lastMonthMinutes) * 100)
                    : 100;

                // Calculate calories improvement
                const currentMonthCalories = currentMonthSessions.reduce((sum, session) => {
                    const MET = 4;
                    const weightKg = 70;
                    const durationHours = session.duration_minutes / 60;
                    return sum + Math.round(MET * weightKg * durationHours);
                }, 0);

                const lastMonthCalories = lastMonthSessions.reduce((sum, session) => {
                    const MET = 4;
                    const weightKg = 70;
                    const durationHours = session.duration_minutes / 60;
                    return sum + Math.round(MET * weightKg * durationHours);
                }, 0);

                improvementPercentages.calories = lastMonthCalories > 0
                    ? Math.round(((currentMonthCalories - lastMonthCalories) / lastMonthCalories) * 100)
                    : 100;
            }
        }

        // Update state with processed data
        setWorkoutHistoryData(historyData);
        setExerciseProgressData(progressData);
        setFormQualityData(formData);
        setTotalStats({
            totalWorkouts,
            totalMinutes,
            totalCalories,
            currentStreak: streakData.currentStreak,
            bestStreak: streakData.bestStreak,
            improvementPercentages
        });
    };

    // Calculate current and best workout streaks
    const calculateStreak = (sessions: WorkoutSession[]) => {
        // Sort sessions by date (oldest first)
        const sortedDates = [...sessions]
            .map(session => new Date(session.date).toISOString().split('T')[0])
            .sort();

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        // Get today's date in ISO format (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // Check if the most recent workout was today or yesterday to maintain streak
        if (sortedDates.length > 0) {
            const lastWorkoutDate = new Date(sortedDates[sortedDates.length - 1]);
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = yesterdayDate.toISOString().split('T')[0];

            const isActiveStreak = sortedDates[sortedDates.length - 1] === today ||
                sortedDates[sortedDates.length - 1] === yesterday;

            // Calculate the current streak
            if (isActiveStreak) {
                currentStreak = 1; // Start with 1 for the most recent day

                // Go backwards through the sorted dates
                for (let i = sortedDates.length - 2; i >= 0; i--) {
                    const currentDate = new Date(sortedDates[i + 1]);
                    const prevDate = new Date(sortedDates[i]);

                    // Check if dates are consecutive
                    const diffTime = currentDate.getTime() - prevDate.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }

        // Calculate best streak
        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                tempStreak = 1;
            } else {
                const currentDate = new Date(sortedDates[i]);
                const prevDate = new Date(sortedDates[i - 1]);

                const diffTime = currentDate.getTime() - prevDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
            }

            if (tempStreak > bestStreak) {
                bestStreak = tempStreak;
            }
        }

        return { currentStreak, bestStreak };
    };

    const gradientOffset = () => {
        if (!workoutHistoryData || workoutHistoryData.length === 0) return 0;

        const dataMax = Math.max(...workoutHistoryData.map(i => i.caloriesBurned));
        const dataMin = Math.min(...workoutHistoryData.map(i => i.caloriesBurned));

        if (dataMax <= 0) {
            return 0;
        }
        if (dataMin >= 0) {
            return 1;
        }

        return dataMax / (dataMax - dataMin);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading workout data...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
                    <div className="text-red-400 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // No data state
    if (workoutSessions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
                    <div className="text-yellow-400 text-5xl mb-4">📊</div>
                    <h2 className="text-xl font-bold mb-2">No Workout Data Yet</h2>
                    <p className="text-gray-400 mb-4">Complete your first workout to start seeing analytics.</p>
                    <button
                        onClick={() => window.location.href = '/workout'}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                        Start a Workout
                    </button>
                </div>
            </div>
        );
    }

    const generateAiInsights = async () => {
        if (workoutSessions.length === 0) {
            setInsightsError("Need workout data to generate insights");
            return;
        }

        setIsGeneratingInsights(true);
        setInsightsError(null);

        try {
            // Prepare data summary for the AI to analyze
            const workoutSummary = {
                totalWorkouts: totalStats.totalWorkouts,
                totalMinutes: totalStats.totalMinutes,
                currentStreak: totalStats.currentStreak,
                improvementPercentages: totalStats.improvementPercentages,
                exercises: {
                    bicepCurls: {
                        performed: workoutSessions.filter(s => s.bicep_curl_performed).length,
                        totalReps: workoutSessions.reduce((sum, s) => sum + (s.bicep_curl_performed ? s.bicep_curl_reps : 0), 0),
                        avgFormScore: Math.round(workoutSessions
                            .filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0)
                            .reduce((sum, s) => sum + s.bicep_curl_form_score, 0) /
                            Math.max(1, workoutSessions.filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0).length)
                        )
                    },
                    squats: {
                        performed: workoutSessions.filter(s => s.squat_performed).length,
                        totalReps: workoutSessions.reduce((sum, s) => sum + (s.squat_performed ? s.squat_reps : 0), 0),
                        avgFormScore: Math.round(workoutSessions
                            .filter(s => s.squat_performed && s.squat_form_score > 0)
                            .reduce((sum, s) => sum + s.squat_form_score, 0) /
                            Math.max(1, workoutSessions.filter(s => s.squat_performed && s.squat_form_score > 0).length)
                        )
                    },
                    lateralRaises: {
                        performed: workoutSessions.filter(s => s.lateral_raise_performed).length,
                        totalReps: workoutSessions.reduce((sum, s) => sum + (s.lateral_raise_performed ? s.lateral_raise_reps : 0), 0),
                        avgFormScore: Math.round(workoutSessions
                            .filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0)
                            .reduce((sum, s) => sum + s.lateral_raise_form_score, 0) /
                            Math.max(1, workoutSessions.filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0).length)
                        )
                    },
                    plank: {
                        performed: workoutSessions.filter(s => s.plank_performed).length,
                        totalHoldSeconds: workoutSessions.reduce((sum, s) => sum + (s.plank_performed ? s.plank_hold_time_seconds : 0), 0),
                        avgFormScore: Math.round(workoutSessions
                            .filter(s => s.plank_performed && s.plank_form_score > 0)
                            .reduce((sum, s) => sum + s.plank_form_score, 0) /
                            Math.max(1, workoutSessions.filter(s => s.plank_performed && s.plank_form_score > 0).length)
                        )
                    }
                },
                // Add workout history progression
                recentWorkouts: workoutSessions.slice(0, 5).map(session => {
                    const date = new Date(session.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                    const exercises = [];
                    if (session.bicep_curl_performed) exercises.push('Bicep Curl');
                    if (session.squat_performed) exercises.push('Squat');
                    if (session.lateral_raise_performed) exercises.push('Lateral Raise');
                    if (session.plank_performed) exercises.push('Plank');

                    return {
                        date,
                        duration: session.duration_minutes,
                        exercises: exercises.join(', ')
                    };
                })
            };

            // Call API to generate insights
            const response = await fetch('/api/insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ workoutSummary }),
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Set the insights
            setAiInsights(data.insights);
        } catch (error) {
            console.error('Error generating AI insights:', error);
            setInsightsError('Failed to generate insights. Please try again later.');
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    const renderAiInsightsSection = () => {
        return (
            <div className="mb-8 bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-violet-900 to-purple-900 p-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-600 rounded-lg mr-3">
                            <Zap className="text-white" size={20} />
                        </div>
                        <h2 className="text-lg font-semibold text-white">AI Workout Insights</h2>
                    </div>
                    <button
                        onClick={generateAiInsights}
                        disabled={isGeneratingInsights || workoutSessions.length === 0}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium
              ${isGeneratingInsights
                                ? 'bg-gray-700 cursor-not-allowed'
                                : workoutSessions.length === 0
                                    ? 'bg-gray-700 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500'
                            }`}
                    >
                        {isGeneratingInsights
                            ? <div className="flex items-center">
                                <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                Generating...
                            </div>
                            : 'Generate Insights'
                        }
                    </button>
                </div>

                <div className="p-4">
                    {insightsError ? (
                        <div className="bg-red-900/20 border border-red-900/30 text-red-200 p-3 rounded-lg text-sm">
                            <p>{insightsError}</p>
                        </div>
                    ) : !aiInsights && !isGeneratingInsights ? (
                        <div className="bg-gray-700/30 border border-gray-600/30 p-4 rounded-lg text-center">
                            <p className="text-gray-400 mb-2 text-sm">Generate AI-powered insights based on your workout data</p>
                            <p className="text-gray-500 text-xs">Get concise recommendations to improve form and consistency</p>
                        </div>
                    ) : isGeneratingInsights ? (
                        <div className="min-h-40 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-gray-400 text-sm">Analyzing your workout data...</p>
                        </div>
                    ) : (
                        <div className="prose prose-sm prose-invert prose-violet max-w-none">
                            <ReactMarkdown components={{
                                // Customize heading styles
                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-indigo-400 mb-2" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-base font-bold text-violet-400 mt-3 mb-1.5" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-pink-400 mt-2 mb-1" {...props} />,
                                // Add more spacing and custom styling for paragraphs
                                p: ({ node, ...props }) => <p className="text-sm mb-2 leading-relaxed" {...props} />,
                                // Style lists better
                                ul: ({ node, ...props }) => <ul className="text-sm pl-4 mb-3 space-y-1" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-1 text-gray-200" {...props} />
                            }}>
                                {aiInsights || ''}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                <div className="flex justify-between items-center">
                    <Link href="/homepage" className="flex items-center space-x-2">
                        <img
                            src="/logo.png"
                            alt="Morphos Logo"
                            width={32}
                            height={32}
                            className="rounded-md"
                        />
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-600">
                            Morphos
                        </span>
                    </Link>

                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400">
                            Fitness Analytics
                        </h1>
                        <p className="text-gray-400 mt-1">Track your progress and insights</p>
                    </div>

                    {/* Empty div for balanced spacing */}
                    <div className="w-[150px]"></div>
                </div>
            </header>

            <main className="px-6 py-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg transform transition-all hover:translate-y-[-2px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-sm">Total Workouts</p>
                                <h3 className="text-3xl font-bold mt-1 text-indigo-400">{totalStats.totalWorkouts}</h3>
                            </div>
                            <div className="p-2 bg-indigo-900/30 rounded-lg">
                                <Dumbbell className="text-indigo-400" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            <span className={totalStats.improvementPercentages.workouts >= 0 ? "text-green-400" : "text-red-400"}>
                                {totalStats.improvementPercentages.workouts >= 0 ? "↑" : "↓"} {Math.abs(totalStats.improvementPercentages.workouts)}%
                            </span> from last month
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg transform transition-all hover:translate-y-[-2px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-sm">Active Minutes</p>
                                <h3 className="text-3xl font-bold mt-1 text-violet-400">{totalStats.totalMinutes}</h3>
                            </div>
                            <div className="p-2 bg-violet-900/30 rounded-lg">
                                <Clock className="text-violet-400" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            <span className={totalStats.improvementPercentages.minutes >= 0 ? "text-green-400" : "text-red-400"}>
                                {totalStats.improvementPercentages.minutes >= 0 ? "↑" : "↓"} {Math.abs(totalStats.improvementPercentages.minutes)}%
                            </span> from last month
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg transform transition-all hover:translate-y-[-2px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-sm">Calories Burned</p>
                                <h3 className="text-3xl font-bold mt-1 text-pink-400">{totalStats.totalCalories.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-pink-900/30 rounded-lg">
                                <Flame className="text-pink-400" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            <span className={totalStats.improvementPercentages.calories >= 0 ? "text-green-400" : "text-red-400"}>
                                {totalStats.improvementPercentages.calories >= 0 ? "↑" : "↓"} {Math.abs(totalStats.improvementPercentages.calories)}%
                            </span> from last month
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg transform transition-all hover:translate-y-[-2px]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-sm">Current Streak</p>
                                <h3 className="text-3xl font-bold mt-1 text-purple-400">{totalStats.currentStreak} day{totalStats.currentStreak !== 1 ? 's' : ''}</h3>
                            </div>
                            <div className="p-2 bg-purple-900/30 rounded-lg">
                                <Calendar className="text-purple-400" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            Best: <span className="text-purple-400">{totalStats.bestStreak} day{totalStats.bestStreak !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Main Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Workout History Chart */}
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-200">Workout History</h2>
                        </div>
                        {workoutHistoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart
                                    data={workoutHistoryData}
                                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563', borderRadius: '0.5rem' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="caloriesBurned"
                                        name="Calories"
                                        stroke="#8B5CF6"
                                        fillOpacity={1}
                                        fill="url(#caloriesGradient)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="duration"
                                        name="Duration (min)"
                                        stroke="#60A5FA"
                                        fillOpacity={1}
                                        fill="url(#durationGradient)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#9CA3AF' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                <p>Not enough workout data to display chart</p>
                            </div>
                        )}
                    </div>

                    {/* Exercise Progress Chart */}
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-200">Exercise Progress</h2>
                        </div>
                        {exerciseProgressData.length > 0 && exerciseProgressData.some(item =>
                            item.week1 > 0 || item.week2 > 0 || item.week3 > 0 || item.week4 > 0
                        ) ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={exerciseProgressData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563', borderRadius: '0.5rem' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#9CA3AF' }} />
                                    <Bar dataKey="week1" name="Week 1" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="week2" name="Week 2" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="week3" name="Week 3" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="week4" name="Week 4" fill="#EC4899" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                <p>Not enough exercise data to display progress</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Form Quality Chart */}
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-200">Form Quality</h2>
                            <div className="flex items-center space-x-1 flex-wrap">
                                <span className="inline-block w-3 h-3 rounded-full bg-indigo-400"></span>
                                <span className="text-xs text-gray-400">Bicep Curl</span>
                                <span className="inline-block w-3 h-3 rounded-full bg-violet-400 ml-3"></span>
                                <span className="text-xs text-gray-400">Squat</span>
                                <span className="inline-block w-3 h-3 rounded-full bg-pink-400 ml-3"></span>
                                <span className="text-xs text-gray-400">Lateral Raise</span>
                            </div>
                        </div>
                        {formQualityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={formQualityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                    <YAxis domain={[0, 100]} stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563', borderRadius: '0.5rem' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="bicepCurl"
                                        name="Bicep Curl"
                                        stroke="#60A5FA"
                                        strokeWidth={3}
                                        dot={{ stroke: '#60A5FA', strokeWidth: 2, r: 4, fill: '#1F2937' }}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#60A5FA' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="squat"
                                        name="Squat"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 4, fill: '#1F2937' }}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#8B5CF6' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="lateralRaise"
                                        name="Lateral Raise"
                                        stroke="#EC4899"
                                        strokeWidth={3}
                                        dot={{ stroke: '#EC4899', strokeWidth: 2, r: 4, fill: '#1F2937' }}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#EC4899' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                <p>Not enough form data to display chart</p>
                            </div>
                        )}
                    </div>

                    {/* Exercise Breakdown */}
                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-200">Exercise Breakdown</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Bicep Curl Stats */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <span className="text-gray-200 font-medium">Bicep Curl</span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {workoutSessions.filter(s => s.bicep_curl_performed).length} workouts,
                                            {workoutSessions.reduce((sum, s) => sum + (s.bicep_curl_performed ? s.bicep_curl_reps : 0), 0)} total reps
                                        </p>
                                    </div>
                                    <span className="text-violet-400 font-medium">
                                        {Math.round(workoutSessions
                                            .filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0)
                                            .reduce((sum, s) => sum + s.bicep_curl_form_score, 0) /
                                            Math.max(1, workoutSessions.filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0).length)
                                        )}% form
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                                        style={{
                                            width: `${Math.round(workoutSessions
                                                .filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0)
                                                .reduce((sum, s) => sum + s.bicep_curl_form_score, 0) /
                                                Math.max(1, workoutSessions.filter(s => s.bicep_curl_performed && s.bicep_curl_form_score > 0).length)
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Squat Stats */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <span className="text-gray-200 font-medium">Squat</span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {workoutSessions.filter(s => s.squat_performed).length} workouts,
                                            {workoutSessions.reduce((sum, s) => sum + (s.squat_performed ? s.squat_reps : 0), 0)} total reps
                                        </p>
                                    </div>
                                    <span className="text-violet-400 font-medium">
                                        {Math.round(workoutSessions
                                            .filter(s => s.squat_performed && s.squat_form_score > 0)
                                            .reduce((sum, s) => sum + s.squat_form_score, 0) /
                                            Math.max(1, workoutSessions.filter(s => s.squat_performed && s.squat_form_score > 0).length)
                                        )}% form
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                                        style={{
                                            width: `${Math.round(workoutSessions
                                                .filter(s => s.squat_performed && s.squat_form_score > 0)
                                                .reduce((sum, s) => sum + s.squat_form_score, 0) /
                                                Math.max(1, workoutSessions.filter(s => s.squat_performed && s.squat_form_score > 0).length)
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Lateral Raise Stats */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <span className="text-gray-200 font-medium">Lateral Raise</span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {workoutSessions.filter(s => s.lateral_raise_performed).length} workouts,
                                            {workoutSessions.reduce((sum, s) => sum + (s.lateral_raise_performed ? s.lateral_raise_reps : 0), 0)} total reps
                                        </p>
                                    </div>
                                    <span className="text-violet-400 font-medium">
                                        {Math.round(workoutSessions
                                            .filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0)
                                            .reduce((sum, s) => sum + s.lateral_raise_form_score, 0) /
                                            Math.max(1, workoutSessions.filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0).length)
                                        )}% form
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                        style={{
                                            width: `${Math.round(workoutSessions
                                                .filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0)
                                                .reduce((sum, s) => sum + s.lateral_raise_form_score, 0) /
                                                Math.max(1, workoutSessions.filter(s => s.lateral_raise_performed && s.lateral_raise_form_score > 0).length)
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Plank Stats */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <span className="text-gray-200 font-medium">Plank</span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {workoutSessions.filter(s => s.plank_performed).length} workouts,
                                            {Math.round(workoutSessions.reduce((sum, s) => sum + (s.plank_performed ? s.plank_hold_time_seconds : 0), 0) / 60)} total minutes
                                        </p>
                                    </div>
                                    <span className="text-violet-400 font-medium">
                                        {Math.round(workoutSessions
                                            .filter(s => s.plank_performed && s.plank_form_score > 0)
                                            .reduce((sum, s) => sum + s.plank_form_score, 0) /
                                            Math.max(1, workoutSessions.filter(s => s.plank_performed && s.plank_form_score > 0).length)
                                        )}% form
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500"
                                        style={{
                                            width: `${Math.round(workoutSessions
                                                .filter(s => s.plank_performed && s.plank_form_score > 0)
                                                .reduce((sum, s) => sum + s.plank_form_score, 0) /
                                                Math.max(1, workoutSessions.filter(s => s.plank_performed && s.plank_form_score > 0).length)
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Workouts Section */}
                <div className="mt-8 mb-8 bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-200">Recent Workouts</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-gray-700">
                                    <th className="pb-3 text-gray-400 font-medium text-sm">Date</th>
                                    <th className="pb-3 text-gray-400 font-medium text-sm">Duration</th>
                                    <th className="pb-3 text-gray-400 font-medium text-sm">Exercises</th>
                                    <th className="pb-3 text-gray-400 font-medium text-sm">Avg. Form</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workoutSessions.slice(0, 5).map((session, index) => {
                                    // Calculate exercises performed
                                    const exercises = [];
                                    if (session.tpose_performed) exercises.push('T-Pose');
                                    if (session.bicep_curl_performed) exercises.push('Bicep Curl');
                                    if (session.squat_performed) exercises.push('Squat');
                                    if (session.lateral_raise_performed) exercises.push('Lateral Raise');
                                    if (session.plank_performed) exercises.push('Plank');

                                    // Calculate average form score
                                    let formScoreSum = 0;
                                    let formScoreCount = 0;

                                    if (session.tpose_performed && session.tpose_form_score > 0) {
                                        formScoreSum += session.tpose_form_score;
                                        formScoreCount++;
                                    }
                                    if (session.bicep_curl_performed && session.bicep_curl_form_score > 0) {
                                        formScoreSum += session.bicep_curl_form_score;
                                        formScoreCount++;
                                    }
                                    if (session.squat_performed && session.squat_form_score > 0) {
                                        formScoreSum += session.squat_form_score;
                                        formScoreCount++;
                                    }
                                    if (session.lateral_raise_performed && session.lateral_raise_form_score > 0) {
                                        formScoreSum += session.lateral_raise_form_score;
                                        formScoreCount++;
                                    }
                                    if (session.plank_performed && session.plank_form_score > 0) {
                                        formScoreSum += session.plank_form_score;
                                        formScoreCount++;
                                    }

                                    const avgFormScore = formScoreCount > 0 ? Math.round(formScoreSum / formScoreCount) : 0;

                                    return (
                                        <tr key={session.id} className={index < workoutSessions.slice(0, 5).length - 1 ? "border-b border-gray-700" : ""}>
                                            <td className="py-4 text-gray-200">
                                                {new Date(session.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="py-4 text-gray-200">{session.duration_minutes} min</td>
                                            <td className="py-4 text-gray-200">{exercises.join(', ')}</td>
                                            <td className="py-4">
                                                <div className="flex items-center">
                                                    <span className={`mr-2 font-medium ${avgFormScore >= 80 ? 'text-green-400' :
                                                        avgFormScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>
                                                        {avgFormScore}%
                                                    </span>
                                                    <div className="w-16 bg-gray-700 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${avgFormScore >= 80 ? 'bg-green-400' :
                                                                avgFormScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                                                                }`}
                                                            style={{ width: `${avgFormScore}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {workoutSessions.length > 5 && (
                        <div className="mt-4 text-center">
                            <button className="text-indigo-400 hover:text-indigo-300 text-sm">
                                View all {workoutSessions.length} workouts
                            </button>
                        </div>
                    )}
                </div>
                {renderAiInsightsSection()}
            </main>

            <footer className="mt-10 py-6 border-t border-gray-800 px-6">
                <div className="text-center text-gray-500 text-sm">
                    © 2025 Morphos. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default AnalyticsDashboard;