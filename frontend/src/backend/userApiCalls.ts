//*******************************************
// *******************************************
// **********	     server			**********
// *******************************************
// *******************************************

import apiClient from "./axiosInstance";

export interface User {
    name: string;
    email: string;
    age: string;
    height: string;
    weight: string;
    fitnessLevel: string;
    workoutDuration: string;
    workoutFrequency: string;
    fitnessGoals: string[];
    equipment: string[];
}

export interface UserSignUp {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    age: string;
    height: string;
    weight: string;
    fitnessLevel: string;
    workoutDuration: string;
    workoutFrequency: string;
    fitnessGoals: string[];
    equipment: string[];
}

// Transform frontend data to match API expectations
function transformSignupData(userSignUp: UserSignUp) {
    return {
        email: userSignUp.email,
        password: userSignUp.password,
        name: userSignUp.name,
        height: parseInt(userSignUp.height),
        weight: parseInt(userSignUp.weight),
        age: parseInt(userSignUp.age),
        fitness_level: userSignUp.fitnessLevel,
        workout_duration: parseInt(userSignUp.workoutDuration),
        workout_frequency: parseInt(userSignUp.workoutFrequency),
        fitness_goals: userSignUp.fitnessGoals,
        available_equipment: userSignUp.equipment
    };
}

export async function signIn(email: string, password: string) {
    try {
        const response = await apiClient.post("/auth/signin", { email, password });
        return response;
    } catch (error) {
        console.error(error);
        throw error; // Re-throw to allow proper error handling in components
    }
}

export async function signUp(userSignUp: UserSignUp) {
    try {
        // Transform data to match API expectations
        const apiData = transformSignupData(userSignUp);
        const response = await apiClient.post(`/auth/signup`, apiData);
        return response;
    } catch (error) {
        console.error("Signup error:", error);
        throw error; // Re-throw to allow proper error handling in components
    }
}

// Function to update user fields
export async function updateUser(email: string, updatedFields: Partial<User>) {
    try {
        // Transform fields if necessary to match API expectations
        const apiFields: any = { ...updatedFields };
        
        // Convert camelCase to snake_case for API
        if (updatedFields.fitnessLevel) apiFields.fitness_level = updatedFields.fitnessLevel;
        if (updatedFields.workoutDuration) apiFields.workout_duration = parseInt(updatedFields.workoutDuration);
        if (updatedFields.workoutFrequency) apiFields.workout_frequency = parseInt(updatedFields.workoutFrequency);
        if (updatedFields.fitnessGoals) apiFields.fitness_goals = updatedFields.fitnessGoals;
        if (updatedFields.equipment) apiFields.available_equipment = updatedFields.equipment;
        
        // Remove camelCase fields that have been converted
        delete apiFields.fitnessLevel;
        delete apiFields.workoutDuration;
        delete apiFields.workoutFrequency;
        delete apiFields.fitnessGoals;
        delete apiFields.equipment;
        
        // Use the correct endpoint with email as a query parameter
        const response = await apiClient.put(`/profile/me?email=${email}`, apiFields);
        return response.data;
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
}