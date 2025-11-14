// app/api/insights/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    
    const { workoutSummary } = await request.json();
    
    // Create a system prompt for analyzing workout data
    const systemPrompt = `
    You are an AI fitness coach for the Morphos app. Your task is to analyze the user's workout data and provide concise, actionable insights.

    Here's the workout data summary:
    ${JSON.stringify(workoutSummary, null, 2)}

    Provide a concise analysis with the following sections:

    1. Overall Progress Assessment (2-3 sentences)
    - Brief overview highlighting strengths and areas for improvement

    2. Exercise-Specific Insights (1-2 bullet points per exercise)
    - Only include exercises they've actually performed
    - For each exercise, focus on form improvements and specific recommendations
    - Keep recommendations very brief and specific

    3. Workout Pattern Recommendation (2-3 sentences)
    - Quick analysis of workout frequency and consistency
    - One concrete suggestion to improve their schedule

    4. Next Steps (3 bullet points maximum)
    - Very specific, actionable steps they should focus on this week
    - Each should be 1 sentence only

    Use a friendly but direct tone. Format with clear headings and spacing.
    Keep the total response under 250 words.
    `;
    
    // Generate content with Gemini
    try {
      // Try Gemini 1.5 Pro first
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 800,
        },
      });
      
      const response = result.response;
      const text = response.text();
      
      return NextResponse.json({ insights: text });
    } catch (modelError) {
      console.log("Error with gemini-1.5-pro, falling back to gemini-pro model");
      
      // Fall back to the gemini-pro model if 1.5 isn't available
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const fallbackResult = await fallbackModel.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 800,
          },
        });
        
        const fallbackResponse = fallbackResult.response;
        const fallbackText = fallbackResponse.text();
        
        return NextResponse.json({ insights: fallbackText });
      } catch (fallbackError) {
        throw new Error(`Failed to generate content with both models: ${fallbackError}`);
      }
    }
  } catch (error: any) {
    console.error('Error processing insights request:', error);
    
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