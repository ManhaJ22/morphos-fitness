// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define the workout type
interface Workout {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  equipment: string;
}

// Define user profile type
interface UserProfile {
  name: string;
  email: string;
  fitnessLevel?: string;
  fitnessGoals?: string[];
  equipment?: string[];
  height?: string;
  weight?: string;
  age?: string;
  workoutDuration?: string;
  workoutFrequency?: string;
  workoutStats?: {
    totalWorkouts: number;
    currentStreak: number;
    caloriesBurned: number;
  };
}

export async function POST(request: Request) {
  try {
    // Check if API key exists
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 500 }
      );
    }
    
    // Initialize the Google Generative AI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const { userMessage, workouts, userProfile } = await request.json() as { 
      userMessage: string; 
      workouts: Workout[];
      userProfile: UserProfile; 
    };
    
    // Create a system prompt that includes the available workouts and user profile
    const systemPrompt = `
    You are a helpful fitness assistant for the Morphos app. Your task is to recommend workouts based on the user's query, taking into account their fitness profile. Keep your response concise.
    
    Available workouts:
    ${workouts.map((workout: Workout) => 
      `- ${workout.name}: ${workout.description}. Difficulty: ${workout.difficulty}. Equipment: ${workout.equipment}`
    ).join('\n')}
    
    User's profile information:
    - Name: ${userProfile.name}
    - Fitness level: ${userProfile.fitnessLevel || 'Not specified'}
    - Age: ${userProfile.age || 'Not specified'}
    - Weight: ${userProfile.weight ? userProfile.weight + ' kg' : 'Not specified'}
    - Height: ${userProfile.height ? userProfile.height + ' cm' : 'Not specified'}
    - Fitness goals: ${userProfile.fitnessGoals?.join(', ') || 'Not specified'}
    - Available equipment: ${userProfile.equipment?.join(', ') || 'None'}
    - Preferred workout duration: ${userProfile.workoutDuration ? userProfile.workoutDuration + ' minutes' : 'Not specified'}
    - Workout frequency: ${userProfile.workoutFrequency ? userProfile.workoutFrequency + ' times per week' : 'Not specified'}
    - Current workout streak: ${userProfile.workoutStats?.currentStreak || 0} days
    - Total workouts completed: ${userProfile.workoutStats?.totalWorkouts || 0}
    - Total calories burned: ${userProfile.workoutStats?.caloriesBurned || 0}
    
    When recommending workouts:
    1. Focus on the workouts from the available list
    2. Consider the user's equipment, fitness level, goals, and physical attributes
    3. Personalize recommendations based on their profile (e.g., suggest appropriate weights, reps, or modifications)
    4. For weight recommendations, use their fitness level and physical attributes as a guide
    5. Explain why you're recommending specific exercises
    6. Keep responses conversational and encouraging
    7. If the user asks for something not in the list, recommend the closest match and explain why
    8. You can use Markdown formatting in your responses:
       - **Bold** for exercise names and important points
       - *Italic* for emphasis
       - Bullet points for lists
    
    Now, respond to the user's message. Be specific and personalized when giving recommendations about weights, repetitions, or exercise variations based on their profile.
    `;
    
    // Generate content with Gemini
    try {
      // Try Gemini 1.5 Pro first
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "I understand. I'll help recommend personalized workouts based on the available options and user profile." }] },
          { role: "user", parts: [{ text: userMessage }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });
      
      const response = result.response;
      const text = response.text();
      
      return NextResponse.json({ message: text });
    } catch (modelError) {
      console.log("Error with gemini-1.5-pro, falling back to gemini-pro model");
      
      // Fall back to the gemini-pro model if 1.5 isn't available
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const fallbackResult = await fallbackModel.generateContent({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "I understand. I'll help recommend personalized workouts based on the available options and user profile." }] },
            { role: "user", parts: [{ text: userMessage }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        });
        
        const fallbackResponse = fallbackResult.response;
        const fallbackText = fallbackResponse.text();
        
        return NextResponse.json({ message: fallbackText });
      } catch (fallbackError) {
        throw new Error(`Failed to generate content with both models: ${fallbackError}`);
      }
    }
  } catch (error: any) {
    console.error('Error processing chat request:', error);
    
    // Provide more specific error messages based on the type of error
    if (error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'Invalid API key configuration. Please check your API key.' },
        { status: 401 }
      );
    } else if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    } else if (error.message?.includes('permission') || error.message?.includes('access')) {
      return NextResponse.json(
        { error: 'This API key does not have permission to use the requested model.' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process your request', details: error.message },
      { status: 500 }
    );
  }
}