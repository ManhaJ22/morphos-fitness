"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/backend/userProvider";
import apiClient from "@/backend/axiosInstance";
import Image from "next/image";

type FitnessGoal = "build muscle" | "lose weight" | "improve flexibility" | "increase endurance" | "general fitness";
type FitnessLevel = "beginner" | "intermediate" | "advanced";
type Equipment = "none" | "dumbbells" | "resistance bands" | "barbell" | "kettlebell" | "pull-up bar" | "exercise bike" | "treadmill";

interface UserProfile {
    // User Identity
    name: string;
    email: string;

    // Physical Stats
    height: number; // in cm
    weight: number; // in kg
    age: number;

    // Fitness Information
    fitnessLevel: FitnessLevel;
    fitnessGoals: FitnessGoal[];
    equipment: Equipment[];
    workoutDuration: number; // in minutes
    workoutFrequency: number; // per week

    // Achievements & Progress (not editable through form)
    workoutStreak: number;
    totalWorkouts: number;
    activeMinutes: number;
    caloriesBurned: number;
    badges: string[];
}

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { user, update, logout } = useUser();
    const [profile, setProfile] = useState<UserProfile>({
        // User Identity
        name: "Alex Johnson",
        email: "alex.johnson@example.com",

        // Physical Stats
        height: 175,
        weight: 70,
        age: 28,

        // Fitness Information
        fitnessLevel: "intermediate",
        fitnessGoals: ["build muscle", "improve flexibility"],
        equipment: ["dumbbells", "resistance bands"],
        workoutDuration: 45,
        workoutFrequency: 4,

        // Achievements & Progress
        workoutStreak: 3,
        totalWorkouts: 24,
        activeMinutes: 645,
        caloriesBurned: 4320,
        badges: ["Early Bird", "Week Warrior", "Perfect Form"]
    });

    // Fetch user profile on component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user?.email) {
                try {
                    const response = await apiClient.get(`/profile/me?email=${user.email}`);

                    // Transform API response to match your component's state structure
                    setProfile({
                        name: response.data.name,
                        email: response.data.email,
                        height: response.data.height,
                        weight: response.data.weight,
                        age: response.data.age,
                        fitnessLevel: response.data.fitness_level,
                        fitnessGoals: response.data.fitness_goals,
                        equipment: response.data.available_equipment,
                        workoutDuration: response.data.workout_duration,
                        workoutFrequency: response.data.workout_frequency,
                        workoutStreak: response.data.workout_streak,
                        totalWorkouts: response.data.total_workouts,
                        activeMinutes: response.data.active_minutes,
                        caloriesBurned: response.data.calories_burned,
                        badges: response.data.badges || []
                    });
                } catch (error) {
                    console.error("Error fetching profile:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchUserProfile();
    }, [user?.email]);


    // Calculate BMI
    const calculateBMI = () => {
        const heightInMeters = profile.height / 100;
        return (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile({
            ...profile,
            [name]: value
        });
    };

    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile({
            ...profile,
            [name]: Number(value)
        });
    };

    const handleMultiSelectChange = (name: string, value: string) => {
        const currentValues = profile[name as keyof UserProfile] as string[];

        if (currentValues.includes(value)) {
            // Remove value if already selected
            setProfile({
                ...profile,
                [name]: currentValues.filter(item => item !== value)
            });
        } else {
            // Add value if not already selected
            setProfile({
                ...profile,
                [name]: [...currentValues, value]
            });
        }
    };

    // Handle saving profile changes
    const handleSaveProfile = async () => {
        try {
            // Transform profile data to match API expectations
            const apiData = {
                name: profile.name,
                height: profile.height,
                weight: profile.weight,
                age: profile.age,
                fitness_level: profile.fitnessLevel,
                workout_duration: profile.workoutDuration,
                workout_frequency: profile.workoutFrequency,
                fitness_goals: profile.fitnessGoals,
                available_equipment: profile.equipment
            };

            const response = await apiClient.put(`/profile/me?email=${user.email}`, apiData);

            if (response.status === 200) {
                // Update user context with new profile data
                update({
                    name: profile.name,
                    email: profile.email,
                    age: profile.age.toString(),
                    height: profile.height.toString(),
                    weight: profile.weight.toString(),
                    fitnessLevel: profile.fitnessLevel,
                    workoutDuration: profile.workoutDuration.toString(),
                    workoutFrequency: profile.workoutFrequency.toString(),
                    fitnessGoals: profile.fitnessGoals,
                    equipment: profile.equipment
                });

                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        // Redirect to login page
        window.location.href = "/";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-lg">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900 bg-opacity-90 sticky top-0 z-50 shadow-md">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <Link href="/homepage">
                            <div className="flex items-center space-x-2">
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
                            </div>
                        </Link>
                    </div>
                    <nav className="flex items-center space-x-6">
                        <Link href="/profile">
                            <span className="text-white font-medium border-b-2 border-purple-500 pb-1 transition-colors">Profile</span>
                        </Link>
                        <button onClick={handleLogout} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition-colors font-medium shadow-sm">
                            Sign Out
                        </button>
                    </nav>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-6 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Profile Header */}
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                            My Profile
                        </h1>
                        <button
                            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                            className={`px-6 py-2 rounded-md font-medium shadow-sm transition-colors ${isEditing
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-indigo-600 hover:bg-indigo-700"
                                }`}
                        >
                            {isEditing ? "Save Changes" : "Edit Profile"}
                        </button>
                    </div>

                    {/* User Identity Section */}
                    <div className="bg-gray-800 bg-opacity-75 rounded-xl p-6 shadow-lg border border-gray-700 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            User Identity
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={profile.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.name}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Email Address</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={profile.email}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Physical Stats Section */}
                    <div className="bg-gray-800 bg-opacity-75 rounded-xl p-6 shadow-lg border border-gray-700 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Physical Stats
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Height (cm)</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="height"
                                        value={profile.height}
                                        onChange={handleNumberInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.height} cm</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Weight (kg)</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="weight"
                                        value={profile.weight}
                                        onChange={handleNumberInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.weight} kg</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Age</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="age"
                                        value={profile.age}
                                        onChange={handleNumberInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.age} years</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">BMI (calculated)</label>
                                <p className="text-white">{calculateBMI()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Fitness Information Section */}
                    <div className="bg-gray-800 bg-opacity-75 rounded-xl p-6 shadow-lg border border-gray-700 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-indigo-400 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Fitness Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Fitness Level</label>
                                {isEditing ? (
                                    <select
                                        name="fitnessLevel"
                                        value={profile.fitnessLevel}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                ) : (
                                    <p className="text-white capitalize">{profile.fitnessLevel}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Workout Duration (minutes)</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="workoutDuration"
                                        value={profile.workoutDuration}
                                        onChange={handleNumberInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.workoutDuration} minutes</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Workout Frequency (per week)</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="workoutFrequency"
                                        value={profile.workoutFrequency}
                                        onChange={handleNumberInputChange}
                                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                    />
                                ) : (
                                    <p className="text-white">{profile.workoutFrequency} days per week</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-gray-400 text-sm mb-2">Fitness Goals</label>
                            {isEditing ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {["build muscle", "lose weight", "improve flexibility", "increase endurance", "general fitness"].map((goal) => (
                                        <div
                                            key={goal}
                                            onClick={() => handleMultiSelectChange("fitnessGoals", goal)}
                                            className={`p-2 rounded-lg cursor-pointer ${profile.fitnessGoals.includes(goal)
                                                ? "bg-indigo-700 text-white"
                                                : "bg-gray-700 text-gray-300"
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${profile.fitnessGoals.includes(goal) ? "bg-indigo-500" : "bg-gray-600"
                                                    }`}>
                                                    {profile.fitnessGoals.includes(goal) && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="capitalize">{goal}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {profile.fitnessGoals.map(goal => (
                                        <span key={goal} className="px-3 py-1 bg-indigo-800 rounded-full text-sm capitalize">{goal}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <label className="block text-gray-400 text-sm mb-2">Available Equipment</label>
                            {isEditing ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {["none", "dumbbells", "resistance bands", "barbell", "kettlebell", "pull-up bar", "exercise bike", "treadmill"].map((equipment) => (
                                        <div
                                            key={equipment}
                                            onClick={() => handleMultiSelectChange("equipment", equipment)}
                                            className={`p-2 rounded-lg cursor-pointer ${profile.equipment.includes(equipment)
                                                ? "bg-purple-700 text-white"
                                                : "bg-gray-700 text-gray-300"
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${profile.equipment.includes(equipment) ? "bg-purple-500" : "bg-gray-600"
                                                    }`}>
                                                    {profile.equipment.includes(equipment) && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="capitalize">{equipment}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {profile.equipment.map(item => (
                                        <span key={item} className="px-3 py-1 bg-purple-800 rounded-full text-sm capitalize">{item}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Achievements Section */}
                    <div className="bg-gray-800 bg-opacity-75 rounded-xl p-6 shadow-lg border border-gray-700 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-pink-400 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Achievements & Progress
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-gray-700 p-4 rounded-lg shadow">
                                <div className="text-center">
                                    <div className="text-indigo-400 font-medium text-sm mb-1">Current Streak</div>
                                    <div className="text-3xl font-bold">{profile.workoutStreak} days</div>
                                </div>
                            </div>
                            <div className="bg-gray-700 p-4 rounded-lg shadow">
                                <div className="text-center">
                                    <div className="text-blue-400 font-medium text-sm mb-1">Total Workouts</div>
                                    <div className="text-3xl font-bold">{profile.totalWorkouts}</div>
                                </div>
                            </div>
                            <div className="bg-gray-700 p-4 rounded-lg shadow">
                                <div className="text-center">
                                    <div className="text-purple-400 font-medium text-sm mb-1">Active Minutes</div>
                                    <div className="text-3xl font-bold">{profile.activeMinutes}</div>
                                </div>
                            </div>
                            <div className="bg-gray-700 p-4 rounded-lg shadow">
                                <div className="text-center">
                                    <div className="text-pink-400 font-medium text-sm mb-1">Calories Burned</div>
                                    <div className="text-3xl font-bold">{profile.caloriesBurned}</div>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold mb-3 text-gray-300">Badges</h3>
                        <div className="flex flex-wrap gap-3">
                            {profile.badges.map((badge, index) => (
                                <div key={index} className="bg-gradient-to-r from-indigo-900 to-purple-900 p-3 rounded-lg flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center mr-2">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span>{badge}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cancel button (only visible when editing) */}
                    {isEditing && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 rounded-md font-medium shadow-sm bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-6">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-600">
                            MotionMind
                        </span>
                    </div>
                    <div className="text-gray-400 text-sm flex justify-center space-x-6 mb-4">
                        <a href="#" className="hover:text-gray-300 transition-colors">About</a>
                        <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
                        <a href="#" className="hover:text-gray-300 transition-colors">Contact</a>
                    </div>
                    <p className="text-gray-500 text-sm">© 2025 MotionMind. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}