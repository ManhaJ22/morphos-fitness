import React, { useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/backend/userProvider';


interface WorkoutData {
  id: string;
  user_email: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  // T-Pose
  tpose_performed: boolean;
  tpose_hold_time_seconds: number;
  tpose_form_score: number;
  // Bicep Curl
  bicep_curl_performed: boolean;
  bicep_curl_reps: number;
  bicep_curl_form_score: number;
  // Squat
  squat_performed: boolean;
  squat_reps: number;
  squat_form_score: number;
  // Lateral Raise
  lateral_raise_performed: boolean;
  lateral_raise_reps: number;
  lateral_raise_form_score: number;
  // Plank
  plank_performed: boolean;
  plank_hold_time_seconds: number;
  plank_form_score: number;
}

// Define types for feedback data
interface FeedbackItem {
  correct: boolean;
  message: string;
  score: number;
}

interface RepPhase {
  status: string;
  count: number;
}

// Base feedback interface with common properties
interface BaseFeedback {
  overall: FeedbackItem;
  posture: FeedbackItem;
}

// T-Pose specific feedback
interface TPoseFeedback extends BaseFeedback {
  left_arm: FeedbackItem;
  right_arm: FeedbackItem;
  stopwatch: {
    time: number;       // Time in milliseconds
    isRunning: boolean; // Whether the stopwatch is currently running
    lastStartTime: number | null; // Timestamp when the stopwatch was last started
  };
}

// Bicep curl specific feedback
interface BicepCurlFeedback extends BaseFeedback {
  elbow_angle: FeedbackItem;
  arm_position: FeedbackItem;
  rep_phase: RepPhase;
}

interface SquatFeedback extends BaseFeedback {
  knee_angle: FeedbackItem;
  hip_position: FeedbackItem;
  rep_phase: RepPhase;
}

interface LateralRaiseFeedback extends BaseFeedback {
  arm_angle: FeedbackItem;
  arm_symmetry: FeedbackItem;
  rep_phase: RepPhase;
}

interface PlankFeedback extends BaseFeedback {
  body_alignment: FeedbackItem;
  hip_position: FeedbackItem;
  // head_position: FeedbackItem;
  stopwatch: {
    time: number;
    isRunning: boolean;
    lastStartTime: number | null;
  };
}

// Combined type
type Feedback = TPoseFeedback | BicepCurlFeedback | SquatFeedback | LateralRaiseFeedback | PlankFeedback;

// Define emotion types
type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised' | 'tired' | 'detecting...' | 'No face detected' | 'unknown';

// Track type from Spotify
interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
}

interface TrackList {
  tracks: SpotifyTrack[];
}

interface PoseData {
  keypoints: number[][];
  feedback: Feedback;
  exercise_mode: string;
  error?: string;
}

interface EmotionData {
  current_emotion: EmotionType;
  stable_emotion: EmotionType | null;
  eye_openness: number;
}

interface CombinedData {
  pose_data: PoseData;
  emotion_data: EmotionData;
  music_recommendations: TrackList;
}

// Type guard functions
function isTPoseFeedback(feedback: Feedback): feedback is TPoseFeedback {
  return 'left_arm' in feedback && 'right_arm' in feedback && 'stopwatch' in feedback;
}

function isBicepCurlFeedback(feedback: Feedback): feedback is BicepCurlFeedback {
  return 'elbow_angle' in feedback && 'arm_position' in feedback && 'rep_phase' in feedback;
}

function isSquatFeedback(feedback: Feedback): feedback is SquatFeedback {
  return 'knee_angle' in feedback && 'hip_position' in feedback && 'rep_phase' in feedback;
}

function isLateralRaiseFeedback(feedback: Feedback): feedback is LateralRaiseFeedback {
  return 'arm_angle' in feedback && 'arm_symmetry' in feedback && 'rep_phase' in feedback;
}

function isPlankFeedback(feedback: Feedback): feedback is PlankFeedback {
  return 'body_alignment' in feedback && 'hip_position' in feedback && 'stopwatch' in feedback;
}

const formatTime = (timeInMs: number): string => {
  const totalSeconds = Math.floor(timeInMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((timeInMs % 1000) / 10); // Show only 2 digits of ms
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
};

// Define UI colors for feedback
const COLORS = {
  background: 'rgb(25, 25, 35)',
  panel: 'rgb(40, 40, 55)',
  accent: 'rgb(75, 161, 255)',
  correct: 'rgb(50, 205, 50)',
  incorrect: 'rgb(255, 80, 80)',
  neutral: 'rgb(180, 180, 180)',
  highlight: 'rgb(255, 215, 0)',
  text: 'rgb(240, 240, 240)',
  shadow: 'rgb(15, 15, 20)',
  happy: 'rgb(255, 223, 0)',
  sad: 'rgb(135, 206, 235)',
  angry: 'rgb(255, 85, 85)',
  tired: 'rgb(150, 150, 210)',
};

// Emotion to emoji mapping
const EMOTION_EMOJIS: Record<EmotionType, string> = {
  'happy': '😊',
  'sad': '😢',
  'angry': '😠',
  'fearful': '😨',
  'disgusted': '😖',
  'surprised': '😮',
  'tired': '😴',
  'neutral': '😐',
  'detecting...': '🔍',
  'No face detected': '❓',
  'unknown': '❓'
};

const FitnessCoach: React.FC = () => {
  // References and state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(uuidv4());
  const requestAnimationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [processingFrame, setProcessingFrame] = useState<boolean>(false);
  const [frameInterval, setFrameInterval] = useState<number>(200); // ms between frames
  const lastFrameSentTime = useRef<number>(0);
  const [isFullyMounted, setIsFullyMounted] = useState<boolean>(false);
  
  // Emotion and music states
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('detecting...');
  const [stableEmotion, setStableEmotion] = useState<EmotionType | null>(null);
  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([]);
  const [showMusicPanel, setShowMusicPanel] = useState<boolean>(false);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<string | null>(null);

  const [isRefreshingMusic, setIsRefreshingMusic] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  const searchParams = useSearchParams() || new URLSearchParams();

  type FeedbackPriority = 'high' | 'medium' | 'low';

  // Define feedback item structure
  interface PendingFeedback {
    message: string;
    priority: FeedbackPriority;
    timestamp: number;
  }

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastSpokenMessage, setLastSpokenMessage] = useState('');
  const [lastSpokenTime, setLastSpokenTime] = useState(0);
  const isSpeakingRef = useRef<boolean>(false);
  const pendingAdviceRef = useRef<string | null>(null);
  const pendingFeedbackRef = useRef<PendingFeedback | null>(null);

  const PAUSE_BETWEEN_COMMANDS = 800;

  const mapExerciseIdToMode = (exerciseId: string | null): string => {
    switch (exerciseId) {
      case 'bicep-curl':
        return 'bicep_curl';
      case 'squat':
        return 'squat';
      case 'lateral-raise':
        return 'lateral_raise';
      case 'plank':
        return 'plank';
      case 'tpose':
        return 'tpose';
      default:
        return 'tpose'; // Default fallback
    }
  };

  const exerciseFromUrl = searchParams.get('exercise');
  const initialExerciseMode = mapExerciseIdToMode(exerciseFromUrl);
  const [exerciseMode, setExerciseMode] = useState<string>('tpose');
  
  // Store timestamps for FPS calculation
  const lastFrameTime = useRef<number>(0);
  const fpsBuffer = useRef<number[]>([]);

  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [exercisePerformed, setExercisePerformed] = useState<Record<string, boolean>>({
    tpose: false,
    bicep_curl: false,
    squat: false,
    lateral_raise: false,
    plank: false
  });
  const [exerciseStats, setExerciseStats] = useState<Record<string, { reps: number, time: number, form: number }>>({
    tpose: { reps: 0, time: 0, form: 0 },
    bicep_curl: { reps: 0, time: 0, form: 0 },
    squat: { reps: 0, time: 0, form: 0 },
    lateral_raise: { reps: 0, time: 0, form: 0 },
    plank: { reps: 0, time: 0, form: 0 },
  });
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { user } = useUser();

  useEffect(() => {
    if (user && user.email) {
      setUserEmail(user.email);
    }
  }, [user]);

  const speakMessage = (message: string): void => {
    if (!voiceEnabled || !message || message.trim() === '') return;
    
    // Don't repeat the same message too frequently (within 3 seconds)
    const now = Date.now();
    if (message === lastSpokenMessage && now - lastSpokenTime < 3000) return;
    
    // If already speaking, don't interrupt
    if (isSpeakingRef.current) {
      return;
    }
    
    // Not speaking, so we can speak this message
    isSpeakingRef.current = true;
    setLastSpokenMessage(message);
    setLastSpokenTime(now);
    
    // Create speech synthesis utterance
    const speech = new SpeechSynthesisUtterance(message);
    
    // Configure voice settings
    speech.volume = 1.0;
    speech.rate = 1.0;
    speech.pitch = 1.0;
    
    // Use a voice that sounds clear and authoritative if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || voice.name.includes('English') || voice.name.includes('US')
    );
    
    if (preferredVoice) {
      speech.voice = preferredVoice;
    }
    
    // When finished speaking, reset the speaking flag
    speech.onend = () => {
      isSpeakingRef.current = false;
    };
    
    // Handle errors
    speech.onerror = () => {
      isSpeakingRef.current = false;
    };
    
    // Speak the message
    window.speechSynthesis.speak(speech);
  };
  
  
  // Helper function to actually perform the speaking
  // const speakMessageImmediately = (message: string, priority: FeedbackPriority, timestamp: number): void => {
  //   isSpeakingRef.current = true;
  //   setLastSpokenMessage(message);
  //   setLastSpokenTime(timestamp);
    
  //   // Create speech synthesis utterance
  //   const speech = new SpeechSynthesisUtterance(message);
    
  //   // Configure voice settings for clarity during workout
  //   speech.volume = 1.0;
  //   speech.rate = 1.0;
  //   speech.pitch = 1.0;
    
  //   // Use a voice that sounds clear and authoritative if available
  //   const voices = window.speechSynthesis.getVoices();
  //   const preferredVoice = voices.find(voice => 
  //     voice.name.includes('Google') || voice.name.includes('English') || voice.name.includes('US')
  //   );
    
  //   if (preferredVoice) {
  //     speech.voice = preferredVoice;
  //   }
    
  //   // Handle speech end - check for pending advice with pause
  //   speech.onend = () => {
  //     isSpeakingRef.current = false;
      
  //     // If there's pending advice, speak it after a pause
  //     if (pendingFeedbackRef.current) {
  //       const pendingFeedback = pendingFeedbackRef.current;
  //       pendingFeedbackRef.current = null;
        
  //       // Add a natural pause between commands
  //       setTimeout(() => {
  //         speakMessageImmediately(
  //           pendingFeedback.message, 
  //           pendingFeedback.priority,
  //           pendingFeedback.timestamp
  //         );
  //       }, PAUSE_BETWEEN_COMMANDS);
  //     }
  //   };
    
  //   // Handle speech error - make sure we reset speaking state
  //   speech.onerror = () => {
  //     isSpeakingRef.current = false;
      
  //     // If there's pending advice, try to speak it after error
  //     if (pendingFeedbackRef.current) {
  //       const pendingFeedback = pendingFeedbackRef.current;
  //       pendingFeedbackRef.current = null;
        
  //       setTimeout(() => {
  //         speakMessageImmediately(
  //           pendingFeedback.message, 
  //           pendingFeedback.priority,
  //           pendingFeedback.timestamp
  //         );
  //       }, 300); // Shorter pause after error
  //     }
  //   };
    
  //   // Speak the message
  //   window.speechSynthesis.speak(speech);
  // };
  
  // Update the toggle function
  const toggleVoiceEnabled = (): void => {
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    } else {
      setVoiceEnabled(true);
      setTimeout(() => {
        speakMessage("Voice coaching activated");
      }, 100);
      return;
    }
    setVoiceEnabled(!voiceEnabled);
  };

  // Helper function to determine the priority of specific feedback
  const getFeedbackPriority = (feedbackType: string, isCorrect: boolean): FeedbackPriority => {
    // If the form is incorrect, it's high priority feedback
    if (!isCorrect) {
      // Form-specific feedback gets highest priority
      switch (feedbackType) {
        case 'left_arm':
        case 'right_arm':
        case 'elbow_angle':
        case 'arm_position':
        case 'knee_angle':
        case 'hip_position':
        case 'arm_angle':
        case 'arm_symmetry':
        case 'body_alignment':
          return 'high';
        case 'posture':
          return 'medium';
        default:
          return 'medium';
      }
    }
    
    // Correct form feedback is lower priority
    return 'low';
  };

  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    // Load voices if needed
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    
    // Some browsers need this event to access voices
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Cleanup on unmount
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!poseData || !poseData.feedback || !voiceEnabled || isSpeakingRef.current) return;
    
    const feedback = poseData.feedback;
    const exerciseMode = poseData.exercise_mode;
    const now = Date.now();
    const timeSinceLastSpoken = now - lastSpokenTime;
    
    // Only speak every few seconds to avoid too much chatter
    if (timeSinceLastSpoken < 3000) return;
    
    // Try to find highest priority feedback first
    let messageToSpeak = '';
    let priorityFound = false;
    
    // HIGH PRIORITY: Check for specific form issues first (always prioritize these)
    if (exerciseMode === 'tpose' && isTPoseFeedback(feedback)) {
      if (!feedback.left_arm.correct) {
        messageToSpeak = feedback.left_arm.message;
        priorityFound = true;
      } else if (!feedback.right_arm.correct) {
        messageToSpeak = feedback.right_arm.message;
        priorityFound = true;
      }
    } else if (exerciseMode === 'bicep_curl' && isBicepCurlFeedback(feedback)) {
      if (!feedback.elbow_angle.correct) {
        messageToSpeak = feedback.elbow_angle.message;
        priorityFound = true;
      } else if (!feedback.arm_position.correct) {
        messageToSpeak = feedback.arm_position.message;
        priorityFound = true;
      }
    } else if (exerciseMode === 'squat' && isSquatFeedback(feedback)) {
      if (!feedback.knee_angle.correct) {
        messageToSpeak = feedback.knee_angle.message;
        priorityFound = true;
      } else if (!feedback.hip_position.correct) {
        messageToSpeak = feedback.hip_position.message;
        priorityFound = true;
      }
    } else if (exerciseMode === 'lateral_raise' && isLateralRaiseFeedback(feedback)) {
      if (!feedback.arm_angle.correct) {
        messageToSpeak = feedback.arm_angle.message;
        priorityFound = true;
      } else if (!feedback.arm_symmetry.correct) {
        messageToSpeak = feedback.arm_symmetry.message;
        priorityFound = true;
      }
    } else if (exerciseMode === 'plank' && isPlankFeedback(feedback)) {
      if (!feedback.body_alignment.correct) {
        messageToSpeak = feedback.body_alignment.message;
        priorityFound = true;
      } else if (!feedback.hip_position.correct) {
        messageToSpeak = feedback.hip_position.message;
        priorityFound = true;
      }
    }
    
    // MEDIUM PRIORITY: Rep counts and time milestones
    if (!priorityFound) {
      // Rep-based exercises
      if (['bicep_curl', 'squat', 'lateral_raise'].includes(exerciseMode) && 
          'rep_phase' in feedback) {
        const repPhase = (feedback as any).rep_phase;
        if (repPhase.count > 0 && repPhase.count % 5 === 0 && 
            !lastSpokenMessage.includes(`${repPhase.count} reps`)) {
          messageToSpeak = `${repPhase.count} reps completed. Great work!`;
          priorityFound = true;
        }
      } 
      // Time-based exercises
      else if (['tpose', 'plank'].includes(exerciseMode) && 
               'stopwatch' in feedback) {
        const stopwatch = (feedback as any).stopwatch;
        const seconds = Math.floor(stopwatch.time / 1000);
        
        if (stopwatch.isRunning && seconds > 0) {
          if ((seconds <= 30 && seconds % 5 === 0) || 
              (seconds > 30 && seconds % 10 === 0)) {
            if (!lastSpokenMessage.includes(`${seconds} seconds`)) {
              messageToSpeak = `${seconds} seconds. Keep holding!`;
              priorityFound = true;
            }
          } else if (seconds === 15 && !lastSpokenMessage.includes('halfway')) {
            messageToSpeak = "You're halfway to 30 seconds!";
            priorityFound = true;
          } else if (seconds === 30 && !lastSpokenMessage.includes('30 seconds')) {
            messageToSpeak = "30 seconds achieved! Great work!";
            priorityFound = true;
          } else if (seconds === 60 && !lastSpokenMessage.includes('minute')) {
            messageToSpeak = "One minute hold! Outstanding!";
            priorityFound = true;
          }
        }
      }
    }
    
    // LOW PRIORITY: Overall messages
    if (!priorityFound && timeSinceLastSpoken > 5000) {
      // If nothing more important to say, use the overall message
      if (!feedback.overall.message.includes(lastSpokenMessage)) {
        messageToSpeak = feedback.overall.message;
      }
    }
    
    // If we found a message to speak, do it
    if (messageToSpeak) {
      speakMessage(messageToSpeak);
    }
  }, [poseData, voiceEnabled, lastSpokenMessage, lastSpokenTime]);

  // Helper function to extract the most important form feedback
function getExerciseSpecificFormFeedback(feedback: Feedback, exerciseMode: string): { message: string, formPart: string, isCorrect: boolean } | null {
  // For each exercise mode, check the most critical form factors first
  
  switch(exerciseMode) {
    case 'tpose':
      // Check arms first, then posture
      if (isTPoseFeedback(feedback)) {
        if (!feedback.left_arm.correct) {
          return { 
            message: feedback.left_arm.message,
            formPart: 'left_arm',
            isCorrect: false
          };
        }
        if (!feedback.right_arm.correct) {
          return { 
            message: feedback.right_arm.message,
            formPart: 'right_arm',
            isCorrect: false
          };
        }
        if (!feedback.posture.correct) {
          return { 
            message: feedback.posture.message,
            formPart: 'posture',
            isCorrect: false
          };
        }
      }
      break;
      
    case 'bicep_curl':
      // Check elbow angle first (most important), then arm position, then posture
      if (isBicepCurlFeedback(feedback)) {
        if (!feedback.elbow_angle.correct) {
          return { 
            message: feedback.elbow_angle.message,
            formPart: 'elbow_angle',
            isCorrect: false
          };
        }
        if (!feedback.arm_position.correct) {
          return { 
            message: feedback.arm_position.message,
            formPart: 'arm_position',
            isCorrect: false
          };
        }
        if (!feedback.posture.correct) {
          return { 
            message: feedback.posture.message,
            formPart: 'posture',
            isCorrect: false
          };
        }
      }
      break;
      
    case 'squat':
      // Check knee angle first, then hip position, then posture
      if (isSquatFeedback(feedback)) {
        if (!feedback.knee_angle.correct) {
          return { 
            message: feedback.knee_angle.message,
            formPart: 'knee_angle',
            isCorrect: false
          };
        }
        if (!feedback.hip_position.correct) {
          return { 
            message: feedback.hip_position.message,
            formPart: 'hip_position',
            isCorrect: false
          };
        }
        if (!feedback.posture.correct) {
          return { 
            message: feedback.posture.message,
            formPart: 'posture',
            isCorrect: false
          };
        }
      }
      break;
      
    case 'lateral_raise':
      // Check arm angle/symmetry first, then posture
      if (isLateralRaiseFeedback(feedback)) {
        if (!feedback.arm_angle.correct) {
          return { 
            message: feedback.arm_angle.message,
            formPart: 'arm_angle',
            isCorrect: false
          };
        }
        if (!feedback.arm_symmetry.correct) {
          return { 
            message: feedback.arm_symmetry.message,
            formPart: 'arm_symmetry',
            isCorrect: false
          };
        }
        if (!feedback.posture.correct) {
          return { 
            message: feedback.posture.message,
            formPart: 'posture',
            isCorrect: false
          };
        }
      }
      break;
      
    case 'plank':
      // Check body alignment and hip position
      if (isPlankFeedback(feedback)) {
        if (!feedback.body_alignment.correct) {
          return { 
            message: feedback.body_alignment.message,
            formPart: 'body_alignment',
            isCorrect: false
          };
        }
        if (!feedback.hip_position.correct) {
          return { 
            message: feedback.hip_position.message,
            formPart: 'hip_position',
            isCorrect: false
          };
        }
      }
      break;
  }
  
  // If no specific incorrect form feedback, return overall message
  return { 
    message: feedback.overall.message,
    formPart: 'overall',
    isCorrect: feedback.overall.correct
  };
}
  
  // Add this function to extract the most important feedback for each exercise type
const getExerciseSpecificFeedback = (feedback: any, exerciseMode: string) => {
  if (!feedback) return null;

  // Common case: if overall message indicates good form, use it
  if (feedback.overall.correct) {
    return { 
      message: feedback.overall.message,
      priority: 'low'  // Lower priority for positive feedback
    };
  }
  
  // Otherwise, find the most important correction to announce
  switch(exerciseMode) {
    case 'tpose':
      // For T-pose, prioritize arm position over posture
      if (!feedback.left_arm.correct) {
        return {
          message: feedback.left_arm.message,
          priority: 'high'
        };
      }
      if (!feedback.right_arm.correct) {
        return {
          message: feedback.right_arm.message,
          priority: 'high'
        };
      }
      if (!feedback.posture.correct) {
        return {
          message: feedback.posture.message,
          priority: 'medium'
        };
      }
      break;
      
    case 'bicep_curl':
      // For bicep curl, prioritize elbow angle
      if (!feedback.elbow_angle.correct) {
        return {
          message: feedback.elbow_angle.message,
          priority: 'high'
        };
      }
      if (!feedback.arm_position.correct) {
        return {
          message: feedback.arm_position.message, 
          priority: 'medium'
        };
      }
      if (!feedback.posture.correct) {
        return {
          message: feedback.posture.message,
          priority: 'low'
        };
      }
      break;
      
    case 'squat':
      // For squat, prioritize knee angle over hip position
      if (!feedback.knee_angle.correct) {
        return {
          message: feedback.knee_angle.message,
          priority: 'high'
        };
      }
      if (!feedback.hip_position.correct) {
        return {
          message: feedback.hip_position.message,
          priority: 'medium'
        };
      }
      if (!feedback.posture.correct) {
        return {
          message: feedback.posture.message,
          priority: 'medium'
        };
      }
      break;
      
    case 'lateral_raise':
      // For lateral raise, prioritize arm angles
      if (!feedback.arm_angle.correct) {
        return {
          message: feedback.arm_angle.message,
          priority: 'high'
        };
      }
      if (!feedback.arm_symmetry.correct) {
        return {
          message: feedback.arm_symmetry.message,
          priority: 'high'
        };
      }
      if (!feedback.posture.correct) {
        return {
          message: feedback.posture.message,
          priority: 'medium'
        };
      }
      break;
      
    case 'plank':
      // For plank, prioritize body alignment
      if (!feedback.body_alignment.correct) {
        return {
          message: feedback.body_alignment.message,
          priority: 'high'
        };
      }
      if (!feedback.hip_position.correct) {
        return {
          message: feedback.hip_position.message,
          priority: 'high'
        };
      }
      break;
      
    default:
      // Fallback to overall message
      return {
        message: feedback.overall.message,
        priority: 'medium'
      };
  }
  
  // If no specific issues found, use overall message
  return {
    message: feedback.overall.message,
    priority: 'medium'
  };
};

// Now modify the existing useEffect to use this function for more intelligent speech
useEffect(() => {
  if (!poseData || !poseData.feedback || !voiceEnabled) return;
  
  const feedback = poseData.feedback;
  const exerciseMode = poseData.exercise_mode;
  
  // Track when to speak rep counts or time
  const now = Date.now();
  const timeSinceLastSpoken = now - lastSpokenTime;
  
  // Get the most important feedback for the current exercise
  const specificFeedback = getExerciseSpecificFeedback(feedback, exerciseMode);
  
  // Initialize message to speak
  let messageToSpeak = '';
  let shouldSpeak = false;
  
  // Handle rep-based exercises announcements
  if (
    (exerciseMode === 'bicep_curl' || 
     exerciseMode === 'squat' || 
     exerciseMode === 'lateral_raise') && 
    'rep_phase' in feedback
  ) {
    const repPhase = feedback.rep_phase;
    
    // Announce milestone reps (every 5 reps)
    if (repPhase.count > 0 && repPhase.count % 5 === 0) {
      // Check if we haven't already announced this count
      const repCountMessage = `${repPhase.count} reps`;
      if (!lastSpokenMessage.includes(repCountMessage) && timeSinceLastSpoken > 2000) {
        messageToSpeak = `${repPhase.count} reps completed. Great work!`;
        shouldSpeak = true;
      }
    }
    
    // If not announcing reps and we have specific feedback, use it
    if (!shouldSpeak && specificFeedback) {
      // Only speak corrections every few seconds to avoid overwhelming the user
      if (specificFeedback.priority === 'high' && timeSinceLastSpoken > 3000) {
        messageToSpeak = specificFeedback.message;
        shouldSpeak = true;
      } else if (specificFeedback.priority === 'medium' && timeSinceLastSpoken > 5000) {
        messageToSpeak = specificFeedback.message;
        shouldSpeak = true;
      } else if (specificFeedback.priority === 'low' && timeSinceLastSpoken > 8000) {
        messageToSpeak = specificFeedback.message;
        shouldSpeak = true;
      }
    }
  }
  // Handle hold exercises (T-pose, plank)
  else if ((exerciseMode === 'tpose' || exerciseMode === 'plank') && 
          'stopwatch' in feedback) {
    const stopwatch = feedback.stopwatch;
    const seconds = Math.floor(stopwatch.time / 1000);
    
    // Announce time milestones if holding with good form
    if (stopwatch.isRunning && feedback.overall.correct) {
      // Every 5 seconds for the first 30 seconds, then every 10
      if ((seconds <= 30 && seconds % 5 === 0) || 
          (seconds > 30 && seconds % 10 === 0)) {
        // Check if we haven't announced this time already
        const timeMessage = `${seconds} seconds`;
        if (!lastSpokenMessage.includes(timeMessage) && timeSinceLastSpoken > 2000) {
          messageToSpeak = `${seconds} seconds. Keep holding!`;
          shouldSpeak = true;
        }
      }
      
      // Special milestone encouragements
      if (seconds === 15 && !lastSpokenMessage.includes('halfway')) {
        messageToSpeak = "You're halfway to 30 seconds!";
        shouldSpeak = true;
      } else if (seconds === 30 && !lastSpokenMessage.includes('30 seconds')) {
        messageToSpeak = "30 seconds achieved! Great work!";
        shouldSpeak = true;
      } else if (seconds === 60 && !lastSpokenMessage.includes('minute')) {
        messageToSpeak = "One minute hold! Outstanding!";
        shouldSpeak = true;
      }
    }
    
    // If not announcing time and we have specific feedback, use it
    if (!shouldSpeak && specificFeedback) {
      // Only speak corrections every few seconds
      if (specificFeedback.priority === 'high' && timeSinceLastSpoken > 3000) {
        messageToSpeak = specificFeedback.message;
        shouldSpeak = true;
      } else if (specificFeedback.priority === 'medium' && timeSinceLastSpoken > 5000) {
        messageToSpeak = specificFeedback.message;
        shouldSpeak = true;
      }
    }
  }
  
  // If we've determined we should speak, do it
  if (shouldSpeak && messageToSpeak) {
    speakMessage(messageToSpeak);
  }
}, [poseData, voiceEnabled, lastSpokenMessage, lastSpokenTime]);

// Add this function to announce exercise mode changes
const announceExerciseMode = (mode: string) => {
  if (!voiceEnabled) return;
  
  let modeName = "";
  switch(mode) {
    case 'tpose':
      modeName = "T-Pose Hold";
      break;
    case 'bicep_curl':
      modeName = "Bicep Curl";
      break;
    case 'squat':
      modeName = "Squat";
      break;
    case 'lateral_raise':
      modeName = "Lateral Raise";
      break;
    case 'plank':
      modeName = "Plank";
      break;
    default:
      modeName = mode;
  }
  
  speakMessage(`Switching to ${modeName} exercise`);
};



  
  // Lifecycle management - run once when component mounts
  useEffect(() => {
    console.log('FitnessCoach component mounted');
    setExerciseMode(initialExerciseMode);
    
    // Mark component as fully mounted after a short delay
    // This ensures all initialization is complete
    const mountTimer = setTimeout(() => {
      setIsFullyMounted(true);
      console.log('FitnessCoach component fully mounted');
    }, 500);

    setWorkoutStartTime(new Date());
    console.log('Workout start time initialized:', new Date());
    
    // Clean up everything when component unmounts
    return () => {
      console.log('FitnessCoach component unmounting');
      
      clearTimeout(mountTimer);
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect attempts
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
      
      // Stop video tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Cancel any pending animation frames
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
        requestAnimationRef.current = null;
      }
      
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [initialExerciseMode]);

  useEffect(() => {
    if (!poseData || !poseData.feedback) return;
    
    // Mark current exercise as performed
    setExercisePerformed(prev => ({
      ...prev,
      [poseData.exercise_mode]: true
    }));
    
    // Update exercise stats based on exercise type
    const currentMode = poseData.exercise_mode;
    const feedback = poseData.feedback;
    
    setExerciseStats(prev => {
      const updatedStats = { ...prev };
      
      // Update form score for current exercise
      updatedStats[currentMode].form = Math.max(
        updatedStats[currentMode].form, 
        feedback.overall.score || 0
      );
      
      // Update time/reps based on exercise type
      if (isTPoseFeedback(feedback)) {
        updatedStats.tpose.time = Math.round(feedback.stopwatch.time / 1000); // Convert to seconds
      } else if (isBicepCurlFeedback(feedback)) {
        updatedStats.bicep_curl.reps = feedback.rep_phase.count;
      } else if (isSquatFeedback(feedback)) {
        updatedStats.squat.reps = feedback.rep_phase.count;
      } else if (isLateralRaiseFeedback(feedback)) {
        updatedStats.lateral_raise.reps = feedback.rep_phase.count;
      } else if (isPlankFeedback(feedback)) {
        updatedStats.plank.time = Math.round(feedback.stopwatch.time / 1000); // Convert to seconds
      }
      
      return updatedStats;
    });
  }, [poseData]);
  
  // Function to handle finishing workout
  const handleFinishWorkout = () => {
    setShowCompletionModal(true);
  };

  // Function to close the completion modal
  const handleCloseModal = () => {
    setShowCompletionModal(false);
    setSubmitError(null);
    setSuccessMessage(null);
  };

// Function to submit workout data to MongoDB

  const submitWorkoutData = async () => {
    console.log('submitWorkoutData called');
    console.log('workoutStartTime:', workoutStartTime);
    
    // Validate email if provided
    // if (userEmail && !validateEmail(userEmail)) {
    //   setSubmitError('Please enter a valid email address');
    //   return;
    // }
    
    if (!workoutStartTime) {
      console.error('No workout start time available');
      setSubmitError('Unable to save: Workout start time not recorded');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);
    
    try {
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - workoutStartTime.getTime()) / 60000);
      
      console.log('Creating workout data with duration:', durationMinutes);
      console.log('Exercise performed status:', exercisePerformed);
      console.log('Exercise stats:', exerciseStats);

      const email = (user && user.email) ? user.email : 
                    userEmail ? userEmail : 
                    "anonymous@user.com";
      
      const workoutData = {
        user_email: email,
        date: endTime.toISOString(),
        start_time: workoutStartTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        // T-Pose data
        tpose_performed: exercisePerformed.tpose,
        tpose_hold_time_seconds: exerciseStats.tpose.time,
        tpose_form_score: exerciseStats.tpose.form,
        // Bicep Curl data
        bicep_curl_performed: exercisePerformed.bicep_curl,
        bicep_curl_reps: exerciseStats.bicep_curl.reps,
        bicep_curl_form_score: exerciseStats.bicep_curl.form,
        // Squat data
        squat_performed: exercisePerformed.squat,
        squat_reps: exerciseStats.squat.reps,
        squat_form_score: exerciseStats.squat.form,
        // Lateral Raise data
        lateral_raise_performed: exercisePerformed.lateral_raise,
        lateral_raise_reps: exerciseStats.lateral_raise.reps,
        lateral_raise_form_score: exerciseStats.lateral_raise.form,
        // Plank data
        plank_performed: exercisePerformed.plank,
        plank_hold_time_seconds: exerciseStats.plank.time,
        plank_form_score: exerciseStats.plank.form
      };
      
      console.log('Workout data prepared:', workoutData);
      
      // Create visual data display for debugging
      const dataDiv = document.createElement('div');
      dataDiv.style.position = 'fixed';
      dataDiv.style.bottom = '10px';
      dataDiv.style.right = '10px';
      dataDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      dataDiv.style.padding = '15px';
      dataDiv.style.borderRadius = '5px';
      dataDiv.style.color = 'white';
      dataDiv.style.maxWidth = '400px';
      dataDiv.style.maxHeight = '80vh';
      dataDiv.style.overflow = 'auto';
      dataDiv.style.fontSize = '12px';
      dataDiv.style.fontFamily = 'monospace';
      dataDiv.style.zIndex = '9999';
      dataDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      
      // Send data to the actual API endpoint
      try {
        console.log('Sending data to API...');
        
        // Get API key from environment or use fallback for development
        // In production, this should be set in your .env file and loaded properly
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || ""; 
        
        const response = await fetch('https://morphos-backend-service-1020595365432.us-central1.run.app/exercises', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify(workoutData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('API response:', responseData);
        
        // Update the data display with success info
        dataDiv.innerHTML = `
          <strong style="color: #4ade80; font-size: 14px; margin-bottom: 5px; display: block;">
            ✅ Workout Data Saved Successfully
          </strong>
          <div style="margin-bottom: 10px; font-size: 11px; color: #aaa;">
            API Response: ${JSON.stringify(responseData)}
          </div>
          <pre style="white-space: pre-wrap;">${JSON.stringify(workoutData, null, 2)}</pre>
        `;
      } catch (apiError) {
        console.error('API request failed:', apiError);
        
        // Update the data display with error info
        dataDiv.innerHTML = `
          <strong style="color: #f87171; font-size: 14px; margin-bottom: 5px; display: block;">
            ❌ API Error: ffshit
          </strong>
          <div style="margin: 10px 0; padding: 8px; background: rgba(239, 68, 68, 0.2); border-radius: 4px;">
            The data was valid but couldn't be sent to the server. 
            Check if the API key is correct and the server is running.
          </div>
          <pre style="white-space: pre-wrap;">${JSON.stringify(workoutData, null, 2)}</pre>
        `;
        
        throw apiError; // Re-throw to be caught by the outer catch block
      } finally {
        // Add a close button
        const closeButton = document.createElement('button');
        closeButton.innerText = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.padding = '2px 6px';
        closeButton.style.backgroundColor = '#374151';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => document.body.removeChild(dataDiv);
        dataDiv.appendChild(closeButton);
        
        document.body.appendChild(dataDiv);
        
        // Remove the log after 15 seconds
        setTimeout(() => {
          if (document.body.contains(dataDiv)) {
            document.body.removeChild(dataDiv);
          }
        }, 15000);
      }
      
      // Success! Show success message
      setSuccessMessage("Workout saved successfully!");
      console.log('Success message set');
      
      // Keep the modal open for a moment to show the success message
      setTimeout(() => {
        console.log('Closing modal and resetting data');
        setShowCompletionModal(false);
        setSuccessMessage(null);
        
        // Reset workout data
        setWorkoutStartTime(new Date());
        setExercisePerformed({
          tpose: false,
          bicep_curl: false,
          squat: false,
          lateral_raise: false,
          plank: false
        });
        setExerciseStats({
          tpose: { reps: 0, time: 0, form: 0 },
          bicep_curl: { reps: 0, time: 0, form: 0 },
          squat: { reps: 0, time: 0, form: 0 },
          lateral_raise: { reps: 0, time: 0, form: 0 },
          plank: { reps: 0, time: 0, form: 0 },
        });
      }, 2000); // Show success message for 2 seconds
      
    } catch (error) {
      console.error('Error submitting workout data:', error);
      setSubmitError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Failed to save workout data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the Workout Completion Modal
  const renderWorkoutCompletionModal = () => {
    if (!showCompletionModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Finish Workout</h2>
          
          {/* Display user's email instead of input field if we have it */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email (for tracking)</label>
            {user && user.email ? (
              <div className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                {user.email}
              </div>
            ) : (
              <input
                type="email"
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
              />
            )}
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Workout Summary</h3>
            <div className="bg-gray-700 rounded p-3 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span>Duration:</span>
                <span className="text-right font-medium">
                  {workoutStartTime 
                    ? `${Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000)} min` 
                    : '0 min'}
                </span>
              </div>
              
              {exercisePerformed.tpose && (
                <div className="grid grid-cols-2 gap-1">
                  <span>T-Pose Hold:</span>
                  <span className="text-right font-medium">
                    {exerciseStats.tpose.time} sec (Score: {Math.round(exerciseStats.tpose.form)}%)
                  </span>
                </div>
              )}
              
              {exercisePerformed.bicep_curl && (
                <div className="grid grid-cols-2 gap-1">
                  <span>Bicep Curls:</span>
                  <span className="text-right font-medium">
                    {exerciseStats.bicep_curl.reps} reps (Score: {Math.round(exerciseStats.bicep_curl.form)}%)
                  </span>
                </div>
              )}
              
              {exercisePerformed.squat && (
                <div className="grid grid-cols-2 gap-1">
                  <span>Squats:</span>
                  <span className="text-right font-medium">
                    {exerciseStats.squat.reps} reps (Score: {Math.round(exerciseStats.squat.form)}%)
                  </span>
                </div>
              )}
              
              {exercisePerformed.lateral_raise && (
                <div className="grid grid-cols-2 gap-1">
                  <span>Lateral Raises:</span>
                  <span className="text-right font-medium">
                    {exerciseStats.lateral_raise.reps} reps (Score: {Math.round(exerciseStats.lateral_raise.form)}%)
                  </span>
                </div>
              )}
              
              {exercisePerformed.plank && (
                <div className="grid grid-cols-2 gap-1">
                  <span>Plank Hold:</span>
                  <span className="text-right font-medium">
                    {exerciseStats.plank.time} sec (Score: {Math.round(exerciseStats.plank.form)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {submitError && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 rounded-lg text-sm text-red-200">
              {submitError}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-900 bg-opacity-50 rounded-lg text-sm text-green-200 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitWorkoutData}
              disabled={isSubmitting || successMessage !== null}
              className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center ${
                isSubmitting 
                  ? 'bg-indigo-700 cursor-not-allowed' 
                  : successMessage !== null
                  ? 'bg-green-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : successMessage !== null ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                'Save Workout'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  
  // Connect to WebSocket server
  useEffect(() => {
    if (!isFullyMounted) return;
    
    // State to track connection attempts
    let connectionAttempts = 0;
    const maxConnectionAttempts = 3;
    const reconnectDelay = 1500; // ms
    
    // Connection timeout tracker
    let connectionTimeoutId: NodeJS.Timeout | null = null;
    
    // Flag to track if component is mounted
    let isMounted = true;

    const connectWebSocket = () => {
      // Clear any existing timeout
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      
      // Don't try to connect if we've reached max attempts
      if (connectionAttempts >= maxConnectionAttempts) {
        if (isMounted) {
          setError(`Failed to connect after ${maxConnectionAttempts} attempts. Please refresh the page.`);
          setIsConnected(false);
        }
        return;
      }
      
      connectionAttempts++;
      console.log(`WebSocket connection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
      
      // Generate a new client ID for each connection attempt
      const clientId = connectionAttempts === 1 ? clientIdRef.current : uuidv4();
      clientIdRef.current = clientId;
      
      try {
        // Close existing connection if any
        if (wsRef.current) {
          wsRef.current.onclose = null; // Prevent onclose from triggering reconnect
          wsRef.current.close();
          wsRef.current = null;
        }
        
        // Determine the correct WebSocket URL based on the current environment
        // If running in a secure context (HTTPS), use WSS protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use the same hostname as the current page by default
        const host = window.location.hostname;
        // Use the explicit port where your backend is running
        const port = 5001; // Change this if your server runs on a different port
        
        const wsUrl = `${protocol}//${host}:${port}/ws/${clientId}`;
        console.log(`Attempting to connect to: ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        
        // Connection timeout (5 seconds)
        connectionTimeoutId = setTimeout(() => {
          console.log('WebSocket connection timeout. Retrying...');
          // Only retry if still mounted
          if (isMounted) {
            if (ws && ws.readyState !== WebSocket.CLOSED) {
              ws.close();
            }
            connectWebSocket();
          }
        }, 5000);
        
        ws.onopen = () => {
          console.log('Connected to WebSocket server');
          // Clear timeout since connection succeeded
          if (connectionTimeoutId) {
            clearTimeout(connectionTimeoutId);
            connectionTimeoutId = null;
          }
          
          if (isMounted) {
            setIsConnected(true);
            setError(null);
            connectionAttempts = 0; // Reset attempt counter on success
          }

          ws.send(JSON.stringify({ 
            command: 'set_mode', 
            mode: exerciseMode 
          }));
          console.log(`Sent exercise mode to server: ${exerciseMode}`);
        };
        
        ws.onmessage = (event) => {
          // Only process messages if component is still mounted
          if (!isMounted) return;
          
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'error') {
              console.error('Server error:', data.message);
              setError(data.message);
            } else if (data.type === 'pose_data') {
              setPoseData(data.data);
              // Update exercise mode from server
              setExerciseMode(data.data.exercise_mode);
              
              // Frame has been processed, ready for next one
              setProcessingFrame(false);
            } else if (data.type === 'mode_change') {
              if (data.success) {
                setExerciseMode(data.mode);
              }
            } else if (data.type === 'combined_data') {
              // Process combined data (pose + emotion + music)
              setPoseData(data.pose_data);
              setExerciseMode(data.pose_data.exercise_mode);
              
              // Update emotion data
              setCurrentEmotion(data.emotion_data.current_emotion);
              setStableEmotion(data.emotion_data.stable_emotion);
              
              // Update recommendations if available
              if (data.music_recommendations && data.music_recommendations.tracks) {
                setRecommendations(data.music_recommendations.tracks);
              }
              
              // Frame has been processed, ready for next one
              setProcessingFrame(false);
            } else if (data.type === 'music_recommendations') {
              // Update recommendations
              if (data.data && data.data.tracks) {
                setRecommendations(data.data.tracks);
              }
            } else {
              console.log('Received message of unknown type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.log('Raw message:', event.data);
            // Reset processing flag on error too
            setProcessingFrame(false);
          }
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket closed with code ${event.code}. Reason: ${event.reason || 'No reason provided'}`);
          
          // Only attempt reconnect if component is still mounted
          if (isMounted) {
            setIsConnected(false);
            
            // Don't show error for normal closure (code 1000)
            if (event.code !== 1000) {
              setError('Connection to server closed. Attempting to reconnect...');
              
              // Attempt to reconnect with delay
              setTimeout(() => {
                if (isMounted) {
                  connectWebSocket();
                }
              }, reconnectDelay);
            } else {
              setError('Connection closed. Please refresh to reconnect.');
            }
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          
          // Only update state if component is still mounted
          if (isMounted) {
            setIsConnected(false);
            setError('WebSocket connection error. Attempting to reconnect...');
            
            // Close the broken connection
            if (ws.readyState !== WebSocket.CLOSED) {
              ws.close();
            }
            
            // Attempt to reconnect with delay
            setTimeout(() => {
              if (isMounted) {
                connectWebSocket();
              }
            }, reconnectDelay);
          }
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        
        if (isMounted) {
          setError(`Failed to create WebSocket connection: . Please refresh the page.`);
          setIsConnected(false);
          
          // Attempt to reconnect with delay
          setTimeout(() => {
            if (isMounted) {
              connectWebSocket();
            }
          }, reconnectDelay);
        }
      }
    };
    
    // Initial connection
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      isMounted = false;
      
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
      }
      
      if (wsRef.current) {
        // Disable all event handlers to prevent any callbacks after unmount
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        
        // Close with normal closure code
        wsRef.current.close(1000, "Component unmounted");
      }
      
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
    };
  }, [isFullyMounted]);
  
  // Initialize webcam
  useEffect(() => {
    if (!isFullyMounted) return;
    
    const initializeCamera = async () => {
      try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          // Fallback for older browsers
          setError('Your browser doesn\'t support camera access. Please use a modern browser like Chrome, Firefox, or Edge.');
          console.error('mediaDevices API not supported in this browser');
          return;
        }
        
        // Request camera access with constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user' // Use front camera on mobile devices
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Make sure video starts playing
          try {
            await videoRef.current.play();
            console.log('Camera initialized successfully');
          } catch (playError) {
            console.error('Error playing video:', playError);
            setError('Could not start video playback. Please refresh and try again.');
          }
        }
      } catch (err: unknown) {
        console.error('Error accessing webcam:', err);
        
        // Type guard to check if the error is a DOMException or has a name property
        if (err && typeof err === 'object' && 'name' in err) {
          const mediaError = err as { name: string; message?: string };
          
          // Provide more specific error messages based on the error
          if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
            setError('Camera access denied. Please grant camera permissions and refresh.');
          } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
            setError('No camera detected. Please connect a camera and refresh.');
          } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
            setError('Camera is already in use by another application. Please close other apps using the camera.');
          } else if (mediaError.name === 'OverconstrainedError') {
            setError('Camera cannot satisfy the requested constraints. Trying with default settings...');
            // Retry with minimal constraints
            try {
              const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
              if (videoRef.current) {
                videoRef.current.srcObject = basicStream;
                videoRef.current.play();
              }
            } catch (retryErr) {
              setError('Could not access camera with default settings either. Please refresh and try again.');
            }
          } else {
            // Generic error with the message if available
            setError(`Could not access webcam: ${mediaError.message || 'Unknown error'}. Please refresh and try again.`);
          }
        } else {
          // Fallback for completely unknown error types
          setError('Could not access webcam due to an unknown error. Please refresh and try again.');
        }
      }
    };
    
    initializeCamera();
    
    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        
        tracks.forEach(track => {
          track.stop();
        });
      }
    };
  }, [isFullyMounted]);
  
  // Send frames to the server at regular intervals
  useEffect(() => {
    if (!isFullyMounted || !isConnected || !videoRef.current || !canvasRef.current) return;
    
    // Add readiness flags to ensure we only start processing when ready
    let videoReady = false;
    let processingActive = true;
    
    // Listen for when video can actually play
    const handleVideoReady = () => {
      console.log('Video is ready and has dimensions:', videoRef.current?.videoWidth, videoRef.current?.videoHeight);
      videoReady = true;
    };
    
    // Add event listeners to detect when video is truly ready
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
      // Also listen for the canplay event as a backup
      videoRef.current.addEventListener('canplay', handleVideoReady);
    }

    const processFrame = () => {
      if (!processingActive || !videoRef.current || !canvasRef.current) return;
      
      const now = performance.now();
      
      // Only process if video is actually ready and has dimensions
      if (!videoReady || 
          !videoRef.current.videoWidth || 
          !videoRef.current.videoHeight) {
        // Video not ready yet, request next frame and try again
        requestAnimationRef.current = requestAnimationFrame(processFrame);
        return;
      }
      
      // Calculate FPS for display
      const elapsed = now - lastFrameTime.current;
      if (lastFrameTime.current !== 0) {
        const currentFps = 1000 / elapsed;
        fpsBuffer.current.push(currentFps);
        if (fpsBuffer.current.length > 10) {
          fpsBuffer.current.shift();
        }
        
        // Calculate average FPS
        const avgFps = fpsBuffer.current.reduce((a, b) => a + b, 0) / fpsBuffer.current.length;
        setFps(Math.round(avgFps));
      }
      lastFrameTime.current = now;
      
      // Only send frames at specified interval and when not already processing
      const shouldSendFrame = !processingFrame && (now - lastFrameSentTime.current > frameInterval);
      
      if (shouldSendFrame && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setProcessingFrame(true);
        lastFrameSentTime.current = now;
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Reduce resolution for better performance
          const scale = 0.5; // Reduce to 50% of original size
          const scaledWidth = Math.floor(videoRef.current.videoWidth * scale);
          const scaledHeight = Math.floor(videoRef.current.videoHeight * scale);
          
          // Double-check dimensions before proceeding
          if (scaledWidth <= 0 || scaledHeight <= 0) {
            console.error("Video dimensions invalid:", scaledWidth, scaledHeight);
            setProcessingFrame(false);
            requestAnimationRef.current = requestAnimationFrame(processFrame);
            return;
          }
          
          // IMPORTANT: Set canvas dimensions to match the scaled size
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
          
          try {
            // Draw video frame to canvas at the correct size
            context.drawImage(videoRef.current, 0, 0, scaledWidth, scaledHeight);
            
            // Get frame as base64 data with higher compression
            const imageData = canvas.toDataURL('image/jpeg', 0.6);
            
            // Better validation of image data
            if (imageData && imageData.startsWith('data:image/jpeg') && imageData.length > 500) {
              // Send to WebSocket
              wsRef.current.send(JSON.stringify({ image: imageData }));
            } else {
              console.error("Generated empty or invalid image data, skipping frame");
              setProcessingFrame(false); // Reset the processing flag
            }
          } catch (err) {
            console.error("Error capturing video frame:", err);
            setProcessingFrame(false);
          }
        }
      }
      
      // Request next frame
      requestAnimationRef.current = requestAnimationFrame(processFrame);
    };

    requestAnimationRef.current = requestAnimationFrame(processFrame);
    
    return () => {
      processingActive = false;
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
      
      // Clean up event listeners
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleVideoReady);
        videoRef.current.removeEventListener('canplay', handleVideoReady);
      }
    };
  }, [isFullyMounted, isConnected, frameInterval]);
  
  // Handle exercise mode change
  // Modify the handleModeChange function to announce mode changes
const handleModeChange = (newMode: string) => {
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({ 
      command: 'set_mode', 
      mode: newMode 
    }));
    
    // Announce the mode change (only if different from current mode)
    if (newMode !== exerciseMode) {
      announceExerciseMode(newMode);
    }
  }
};

  // Toggle music panel
  const toggleMusicPanel = () => {
    setShowMusicPanel(!showMusicPanel);
  };

  // Play preview function
  const playPreview = (track: SpotifyTrack) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Only play if preview URL is available
    if (track.preview_url) {
      const audio = new Audio(track.preview_url);
      audio.volume = 0.5;
      audio.play().then(() => {
        setCurrentPlayingTrack(track.id);
        audio.onended = () => {
          setCurrentPlayingTrack(null);
        };
        audioRef.current = audio;
      }).catch(err => {
        console.error('Error playing preview:', err);
        setCurrentPlayingTrack(null);
      });
    } else {
      // No preview available
      console.log('No preview available for this track');
    }
  };

  // Open Spotify link
  const openSpotifyLink = (url: string) => {
    window.open(url, '_blank');
  };

  // Handle frame rate change
  const handleFrameRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setFrameInterval(1000 / value); // Convert fps to interval in ms
  };
  
  // Format emotion for display
  const formatEmotion = (emotion: EmotionType | null): string => {
    if (!emotion) return 'Analyzing...';
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };
  
  // Get emoji for emotion
  const getEmotionEmoji = (emotion: EmotionType | null): string => {
    if (!emotion) return '🔍';
    return EMOTION_EMOJIS[emotion] || '❓';
  };
  
  // Get color for emotion
  const getEmotionColor = (emotion: EmotionType | null): string => {
    if (!emotion || emotion === 'detecting...' || emotion === 'No face detected' || emotion === 'unknown') {
      return COLORS.neutral;
    }
    // return COLORS[emotion] || COLORS.neutral;
    return COLORS.neutral
  };
  
  // Draw skeleton on canvas overlay
  // Draw skeleton on canvas overlay
useEffect(() => {
  if (!poseData || !poseData.keypoints || poseData.keypoints.length === 0) return;
  
  const drawSkeleton = () => {
    const overlayCanvas = document.getElementById('skeleton-overlay') as HTMLCanvasElement;
    if (!overlayCanvas || !videoRef.current || !poseData || !poseData.keypoints || poseData.keypoints.length === 0) return;
    
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;
    
    // Get the actual video dimensions and display dimensions
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    const videoBounds = videoRef.current.getBoundingClientRect();
    
    // Set canvas to match video container dimensions
    overlayCanvas.width = videoBounds.width;
    overlayCanvas.height = videoBounds.height;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Keypoint indices for reference
    const LEFT_SHOULDER = 5;
    const RIGHT_SHOULDER = 6;
    const LEFT_ELBOW = 7;
    const RIGHT_ELBOW = 8;
    const LEFT_WRIST = 9;
    const RIGHT_WRIST = 10;
    const LEFT_HIP = 11;
    const RIGHT_HIP = 12;
    const LEFT_KNEE = 13;
    const RIGHT_KNEE = 14;
    const LEFT_ANKLE = 15;
    const RIGHT_ANKLE = 16;
    
    // Define required keypoints based on exercise mode
    let requiredKeypoints: number[] = [];
    const mode = poseData.exercise_mode;
    
    if (mode === 'tpose') {
      // For T-Pose, we need shoulders, elbows, wrists, and hips
      requiredKeypoints = [
        LEFT_SHOULDER, RIGHT_SHOULDER, 
        LEFT_ELBOW, RIGHT_ELBOW, 
        LEFT_WRIST, RIGHT_WRIST,
        LEFT_HIP, RIGHT_HIP
      ];
    } else if (mode === 'bicep_curl') {
      // For Bicep Curl, we need shoulders, elbows, wrists, and hips
      requiredKeypoints = [
        LEFT_SHOULDER, RIGHT_SHOULDER, 
        LEFT_ELBOW, RIGHT_ELBOW, 
        LEFT_WRIST, RIGHT_WRIST,
        LEFT_HIP, RIGHT_HIP
      ];
    } else if (mode === 'squat') {
      // For Squat, we need shoulders, hips, knees, and ankles
      requiredKeypoints = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_HIP, RIGHT_HIP,
        LEFT_KNEE, RIGHT_KNEE,
        LEFT_ANKLE, RIGHT_ANKLE
      ];
    } else if (mode === 'lateral_raise') {
      // For Lateral Raise, we need shoulders, elbows, wrists, and hips
      requiredKeypoints = [
        LEFT_SHOULDER, RIGHT_SHOULDER, 
        LEFT_ELBOW, RIGHT_ELBOW, 
        LEFT_WRIST, RIGHT_WRIST,
        LEFT_HIP, RIGHT_HIP
      ];
    } else if (mode === 'plank') {
      // For Plank, we need all points for proper alignment
      requiredKeypoints = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_ELBOW, RIGHT_ELBOW,
        LEFT_HIP, RIGHT_HIP,
        LEFT_KNEE, RIGHT_KNEE,
        LEFT_ANKLE, RIGHT_ANKLE
      ];
    }
    
    // Check if all required keypoints are valid
    const areAllKeypointsValid = requiredKeypoints.every(index => {
      // Check if keypoint exists and is not null/undefined
      if (!poseData.keypoints[index] || poseData.keypoints[index].length < 2) {
        return false;
      }
      
      // Check if the keypoint coordinates are valid numbers
      const [x, y] = poseData.keypoints[index];
      return (
        typeof x === 'number' && 
        typeof y === 'number' && 
        !isNaN(x) && 
        !isNaN(y) && 
        x > 0 && 
        y > 0
      );
    });
    
    // Only proceed with drawing if all required keypoints are valid
    if (!areAllKeypointsValid) {
      // If keypoints are missing, clear the canvas and return
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      return;
    }
    
    // Get the actual display aspect ratio and video aspect ratio
    const displayAspect = videoBounds.width / videoBounds.height;
    const videoAspect = videoWidth / videoHeight;
    
    // Calculate the visible dimensions within the container
    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;
    
    if (displayAspect > videoAspect) {
      // Container is wider than video - video is height-constrained
      displayHeight = videoBounds.height;
      displayWidth = displayHeight * videoAspect;
      offsetX = (videoBounds.width - displayWidth) / 2; // Center horizontally
    } else {
      // Container is taller than video - video is width-constrained
      displayWidth = videoBounds.width;
      displayHeight = displayWidth / videoAspect;
      offsetY = (videoBounds.height - displayHeight) / 2; // Center vertically
    }
    
    // Calculate scaling ratios from 50% scaled keypoints to displayed size
    const scaleX = displayWidth / (videoWidth * 0.5);
    const scaleY = displayHeight / (videoHeight * 0.5);
    
    // Transform keypoints to match display coordinates with mirroring
    const transformedKeypoints = poseData.keypoints.map(point => {
      if (!point || point.length < 2) return [0, 0];
      
      // Flip the X coordinate to match the mirrored video display
      // We mirror around the center of the display width
      const mirroredX = videoBounds.width - (point[0] * scaleX + offsetX);
      
      return [
        mirroredX,
        point[1] * scaleY + offsetY
      ];
    });
    
    // Draw connections between keypoints
    const drawConnection = (p1Idx: number, p2Idx: number, color: string, thickness: number) => {
      if (p1Idx >= transformedKeypoints.length || p2Idx >= transformedKeypoints.length) return;
      
      const p1 = transformedKeypoints[p1Idx];
      const p2 = transformedKeypoints[p2Idx];
      
      // Draw glow effect
      ctx.lineWidth = thickness + 4;
      ctx.strokeStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
      
      // Draw main line
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    };
    
    // Draw skeleton based on exercise mode
    const feedback = poseData.feedback;
    
    if (mode === 'tpose' && isTPoseFeedback(feedback)) {
      // Draw arms
      const leftArmColor = feedback.left_arm.correct ? COLORS.correct : COLORS.incorrect;
      const rightArmColor = feedback.right_arm.correct ? COLORS.correct : COLORS.incorrect;
      
      drawConnection(LEFT_SHOULDER, LEFT_ELBOW, leftArmColor, 3);
      drawConnection(LEFT_ELBOW, LEFT_WRIST, leftArmColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_ELBOW, rightArmColor, 3);
      drawConnection(RIGHT_ELBOW, RIGHT_WRIST, rightArmColor, 3);
      
      // Draw posture
      const postureColor = feedback.posture.correct ? COLORS.correct : COLORS.incorrect;
      drawConnection(LEFT_SHOULDER, RIGHT_SHOULDER, postureColor, 3);
      drawConnection(LEFT_HIP, RIGHT_HIP, postureColor, 3);
      drawConnection(LEFT_SHOULDER, LEFT_HIP, postureColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_HIP, postureColor, 3);
    
    } else if (mode === 'bicep_curl' && isBicepCurlFeedback(feedback)) {
      // For bicep curl mode
      // Draw posture
      const postureColor = feedback.posture.correct ? COLORS.correct : COLORS.incorrect;
      drawConnection(LEFT_SHOULDER, RIGHT_SHOULDER, postureColor, 3);
      drawConnection(LEFT_HIP, RIGHT_HIP, postureColor, 3);
      drawConnection(LEFT_SHOULDER, LEFT_HIP, postureColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_HIP, postureColor, 3);
      
      // Draw arms (highlight the curling arm)
      const elbowColor = feedback.elbow_angle.correct ? COLORS.correct : COLORS.incorrect;
      const armColor = feedback.arm_position.correct ? COLORS.correct : COLORS.incorrect;
      
      drawConnection(LEFT_SHOULDER, LEFT_ELBOW, armColor, 3);
      drawConnection(LEFT_ELBOW, LEFT_WRIST, elbowColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_ELBOW, armColor, 3);
      drawConnection(RIGHT_ELBOW, RIGHT_WRIST, elbowColor, 3);
    } else if (mode === 'squat' && isSquatFeedback(feedback)) {
      // For squat mode
      // Draw posture
      const postureColor = feedback.posture.correct ? COLORS.correct : COLORS.incorrect;
      drawConnection(LEFT_SHOULDER, RIGHT_SHOULDER, postureColor, 3);
      drawConnection(LEFT_SHOULDER, LEFT_HIP, postureColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_HIP, postureColor, 3);
      
      // Draw legs
      const kneeColor = feedback.knee_angle.correct ? COLORS.correct : COLORS.incorrect;
      const hipColor = feedback.hip_position.correct ? COLORS.correct : COLORS.incorrect;
      
      // Hip connections
      drawConnection(LEFT_HIP, RIGHT_HIP, hipColor, 3);
      
      // Leg connections
      drawConnection(LEFT_HIP, LEFT_KNEE, kneeColor, 3);
      drawConnection(LEFT_KNEE, LEFT_ANKLE, kneeColor, 3);
      drawConnection(RIGHT_HIP, RIGHT_KNEE, kneeColor, 3);
      drawConnection(RIGHT_KNEE, RIGHT_ANKLE, kneeColor, 3);

    } else if (mode === 'lateral_raise' && isLateralRaiseFeedback(feedback)) {
      // For lateral raise mode
      // Draw posture
      const postureColor = feedback.posture.correct ? COLORS.correct : COLORS.incorrect;
      drawConnection(LEFT_SHOULDER, RIGHT_SHOULDER, postureColor, 3);
      drawConnection(LEFT_HIP, RIGHT_HIP, postureColor, 3);
      drawConnection(LEFT_SHOULDER, LEFT_HIP, postureColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_HIP, postureColor, 3);
      
      // Draw arms
      const armColor = feedback.arm_angle.correct ? COLORS.correct : COLORS.incorrect;
      const symmetryColor = feedback.arm_symmetry.correct ? COLORS.correct : COLORS.incorrect;
      
      // Color the connections based on symmetry
      const leftArmColor = symmetryColor === COLORS.correct ? armColor : COLORS.incorrect;
      const rightArmColor = symmetryColor === COLORS.correct ? armColor : COLORS.incorrect;
      
      drawConnection(LEFT_SHOULDER, LEFT_ELBOW, leftArmColor, 3);
      drawConnection(LEFT_ELBOW, LEFT_WRIST, leftArmColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_ELBOW, rightArmColor, 3);
      drawConnection(RIGHT_ELBOW, RIGHT_WRIST, rightArmColor, 3);

    } else if (mode === 'plank' && isPlankFeedback(feedback)) {
      // For plank mode
      // Draw body alignment (shoulder to ankle line)
      const alignmentColor = feedback.body_alignment.correct ? COLORS.correct : COLORS.incorrect;
      const hipColor = feedback.hip_position.correct ? COLORS.correct : COLORS.incorrect;
      
      // Draw upper body
      drawConnection(LEFT_SHOULDER, RIGHT_SHOULDER, alignmentColor, 3);
      
      // Draw body alignment line
      drawConnection(LEFT_SHOULDER, LEFT_HIP, alignmentColor, 3);
      drawConnection(RIGHT_SHOULDER, RIGHT_HIP, alignmentColor, 3);
      
      // Draw hips
      drawConnection(LEFT_HIP, RIGHT_HIP, hipColor, 3);
      
      // Draw legs
      drawConnection(LEFT_HIP, LEFT_KNEE, alignmentColor, 3);
      drawConnection(LEFT_KNEE, LEFT_ANKLE, alignmentColor, 3);
      drawConnection(RIGHT_HIP, RIGHT_KNEE, alignmentColor, 3);
      drawConnection(RIGHT_KNEE, RIGHT_ANKLE, alignmentColor, 3);
    }
    
    // Draw keypoints
    transformedKeypoints.forEach((point, i) => {
      // Only draw keypoints that are part of the required set
      if (!requiredKeypoints.includes(i)) return;
      
      // Determine joint color based on body part and exercise mode
      let color = COLORS.neutral;
      
      if (mode === 'tpose' && isTPoseFeedback(feedback)) {
        if (i === LEFT_SHOULDER || i === LEFT_ELBOW || i === LEFT_WRIST) {
          color = feedback.left_arm.correct ? COLORS.correct : COLORS.incorrect;
        } else if (i === RIGHT_SHOULDER || i === RIGHT_ELBOW || i === RIGHT_WRIST) {
          color = feedback.right_arm.correct ? COLORS.correct : COLORS.incorrect;
        } else if (i === LEFT_HIP || i === RIGHT_HIP) {
          color = feedback.posture.correct ? COLORS.correct : COLORS.incorrect;
        }
      } else if (mode === 'bicep_curl' && isBicepCurlFeedback(feedback)) {
        if (i === LEFT_ELBOW || i === RIGHT_ELBOW) {
          color = feedback.elbow_angle.correct ? COLORS.highlight : COLORS.incorrect;
        } else if (i === LEFT_SHOULDER || i === RIGHT_SHOULDER || 
                  i === LEFT_WRIST || i === RIGHT_WRIST) {
          color = feedback.arm_position.correct ? COLORS.correct : COLORS.incorrect;
        } else if (i === LEFT_HIP || i === RIGHT_HIP) {
          color = feedback.posture.correct ? COLORS.correct : COLORS.incorrect;
        }
      }
      
      // Draw joint with glow effect
      const radius = 6;
      ctx.beginPath();
      ctx.arc(point[0], point[1], radius + 2, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.shadow;
      ctx.fill();
      
      // Draw joint
      ctx.beginPath();
      ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Draw highlight
      ctx.beginPath();
      ctx.arc(point[0] - 1, point[1] - 1, radius / 2, 0, 2 * Math.PI);
      
      // Make highlight color lighter
      const lighterColor = color === COLORS.correct ? 'rgb(150, 255, 150)' : 
                          color === COLORS.incorrect ? 'rgb(255, 150, 150)' :
                          color === COLORS.highlight ? 'rgb(255, 240, 150)' : 'rgb(220, 220, 220)';
      
      ctx.fillStyle = lighterColor;
      ctx.fill();
    });
  };
  
  drawSkeleton();
}, [poseData]);
  
  // Render progress bar component
  const ProgressBar: React.FC<{ value: number, color: string, label?: string }> = ({ value, color, label }) => {
    return (
      <div className="relative h-3 bg-gray-700 w-full rounded overflow-hidden">
        <div 
          className="h-full rounded transition-all duration-300 ease-out"
          style={{ 
            width: `${value}%`, 
            backgroundColor: color 
          }}
        />
        {label && (
          <div className="absolute right-2 top-0 text-xs text-white font-bold">
            {`${Math.round(value)}%`}
          </div>
        )}
      </div>
    );
  };
  
  // Feedback section component
  const FeedbackSection: React.FC<{ label: string, data: FeedbackItem }> = ({ label, data }) => {
    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <h4 className="text-sm font-bold">{label}:</h4>
          <span className="text-xs">
            {data.message}
          </span>
        </div>
        <ProgressBar 
          value={data.score} 
          color={data.correct ? COLORS.correct : COLORS.incorrect}
          label="score"
        />
      </div>
    );
  };
  
  // Render feedback sections based on the current exercise mode
  const renderFeedbackSections = () => {
    if (!poseData || !poseData.feedback) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Waiting for pose detection...</p>
        </div>
      );
    }

    return (
      <>
        {/* Overall Status - Common to all feedback types */}
        <div className="mb-6 text-center">
          <div 
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-2
              ${poseData.feedback.overall.correct ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          >
            {poseData.feedback.overall.correct ? (
              <span className="text-2xl">✓</span>
            ) : (
              <span className="text-xl">!</span>
            )}
          </div>
          <h3 className={`text-xl font-bold ${
            poseData.feedback.overall.correct ? 'text-green-400' : 'text-red-400'
          }`}>
            {poseData.feedback.overall.message}
          </h3>
        </div>
        
        {/* Overall Progress - Common to all feedback types */}
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-1">Overall Progress:</h4>
          <ProgressBar 
            value={poseData.feedback.overall.score} 
            color={
              poseData.feedback.overall.score >= 75 ? COLORS.correct :
              poseData.feedback.overall.score >= 60 ? 'rgb(0, 255, 255)' :
              poseData.feedback.overall.score >= 40 ? 'rgb(0, 165, 255)' : COLORS.incorrect
            }
            label="score"
          />
        </div>
        
        {/* Conditional feedback sections based on exercise type */}
        {isTPoseFeedback(poseData.feedback) ? (
          // T-Pose feedback
          <>
            <div className="mb-6 bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-yellow-400">HOLD TIME</span>
                <span className="text-3xl font-bold">
                  {formatTime(poseData.feedback.stopwatch.time)}
                </span>
              </div>
              <div className="text-center mt-2 font-bold text-sm">
                <span className={`
                  ${poseData.feedback.stopwatch.isRunning ? 'text-green-400' : 'text-gray-400'}
                `}>
                  {poseData.feedback.stopwatch.isRunning ? 'HOLDING' : 'NOT HOLDING'}
                </span>
              </div>
            </div>
            <FeedbackSection 
              label="Left Arm" 
              data={poseData.feedback.left_arm} 
            />
            <FeedbackSection 
              label="Right Arm" 
              data={poseData.feedback.right_arm} 
            />
            <FeedbackSection 
              label="Posture" 
              data={poseData.feedback.posture} 
            />
          </>
        ) : isBicepCurlFeedback(poseData.feedback) ? (
          // Bicep curl feedback
          <>
            {/* Rep Counter */}
            <div className="mb-6 bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-yellow-400">REPS</span>
                <span className="text-3xl font-bold">{poseData.feedback.rep_phase.count}</span>
              </div>
              <div className="text-center mt-2 font-bold text-sm">
                <span className={`
                  ${poseData.feedback.rep_phase.status === 'up' ? 'text-yellow-400' :
                    poseData.feedback.rep_phase.status === 'down' ? 'text-green-400' : 'text-cyan-400'}
                `}>
                  {poseData.feedback.rep_phase.status === 'up' ? 'CURLED' :
                    poseData.feedback.rep_phase.status === 'down' ? 'EXTENDED' : 'MOVING'}
                </span>
              </div>
            </div>
            
            <FeedbackSection 
              label="Elbow Angle" 
              data={poseData.feedback.elbow_angle} 
            />
            <FeedbackSection 
              label="Arm Position" 
              data={poseData.feedback.arm_position} 
            />
            <FeedbackSection 
              label="Posture" 
              data={poseData.feedback.posture} 
            />
          </>
          ) : isSquatFeedback(poseData.feedback) ? (
            // Squat feedback
            <>
              {/* Rep Counter */}
              <div className="mb-6 bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-yellow-400">REPS</span>
                  <span className="text-3xl font-bold">{poseData.feedback.rep_phase.count}</span>
                </div>
                <div className="text-center mt-2 font-bold text-sm">
                  <span className={`
                    ${poseData.feedback.rep_phase.status === 'up' ? 'text-yellow-400' :
                      poseData.feedback.rep_phase.status === 'down' ? 'text-green-400' : 'text-cyan-400'}
                  `}>
                    {poseData.feedback.rep_phase.status === 'up' ? 'STANDING' :
                      poseData.feedback.rep_phase.status === 'down' ? 'SQUATTING' : 'MOVING'}
                  </span>
                </div>
              </div>
              
              <FeedbackSection 
                label="Knee Angle" 
                data={poseData.feedback.knee_angle} 
              />
              <FeedbackSection 
                label="Hip Position" 
                data={poseData.feedback.hip_position} 
              />
              <FeedbackSection 
                label="Posture" 
                data={poseData.feedback.posture} 
              />
            </>
          ) : isLateralRaiseFeedback(poseData.feedback) ? (
            // Lateral raise feedback
            <>
              {/* Rep Counter */}
              <div className="mb-6 bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-yellow-400">REPS</span>
                  <span className="text-3xl font-bold">{poseData.feedback.rep_phase.count}</span>
                </div>
                <div className="text-center mt-2 font-bold text-sm">
                  <span className={`
                    ${poseData.feedback.rep_phase.status === 'up' ? 'text-yellow-400' :
                      poseData.feedback.rep_phase.status === 'down' ? 'text-green-400' : 'text-cyan-400'}
                  `}>
                    {poseData.feedback.rep_phase.status === 'up' ? 'RAISED' :
                      poseData.feedback.rep_phase.status === 'down' ? 'LOWERED' : 'MOVING'}
                  </span>
                </div>
              </div>
              
              <FeedbackSection 
                label="Arm Height" 
                data={poseData.feedback.arm_angle} 
              />
              <FeedbackSection 
                label="Arm Symmetry" 
                data={poseData.feedback.arm_symmetry} 
              />
              <FeedbackSection 
                label="Posture" 
                data={poseData.feedback.posture} 
              />
            </>
          ) : isPlankFeedback(poseData.feedback) ? (
            // Plank feedback
            <>
              <div className="mb-6 bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-yellow-400">HOLD TIME</span>
                  <span className="text-3xl font-bold">
                    {formatTime(poseData.feedback.stopwatch.time)}
                  </span>
                </div>
                <div className="text-center mt-2 font-bold text-sm">
                  <span className={`
                    ${poseData.feedback.stopwatch.isRunning ? 'text-green-400' : 'text-gray-400'}
                  `}>
                    {poseData.feedback.stopwatch.isRunning ? 'HOLDING' : 'NOT HOLDING'}
                  </span>
                </div>
              </div>
              <FeedbackSection 
                label="Body Alignment" 
                data={poseData.feedback.body_alignment} 
              />
              <FeedbackSection 
                label="Hip Position" 
                data={poseData.feedback.hip_position} 
              />
              {/* <FeedbackSection 
                label="Head Position" 
                data={poseData.feedback.head_position} 
              /> */}
            </>
        ) : (
          // Fallback for unknown feedback type
          <div className="text-center text-red-400">
            Unknown feedback type received
          </div>
        )}
      </>
    );
  };

  const refreshMusicRecommendations = () => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setCurrentPlayingTrack(null);
    }
    
    // Only request if connected to websocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Requesting fresh music recommendations');
      setIsRefreshingMusic(true);
      
      // Show loading state
      setRecommendations([]);
      
      // Send explicit refresh_music command to server
      wsRef.current.send(JSON.stringify({ 
        command: 'get_recommendations', 
        emotion: stableEmotion || currentEmotion || 'neutral',
        limit: 6  // Request more tracks for variety
      }));
      
      // Update last refresh time
      setLastRefreshTime(Date.now());
    }
  };

  useEffect(() => {
    if (showMusicPanel) {
      // If it's been at least 10 seconds since last refresh, or if we have no recommendations
      const now = Date.now();
      if (recommendations.length === 0 || now - lastRefreshTime > 10000) {
        refreshMusicRecommendations();
      }
    }
  }, [showMusicPanel]);

  useEffect(() => {
    // Only refresh if music panel is open, we have a stable emotion, and it's been a while
    if (showMusicPanel && stableEmotion) {
      const now = Date.now();
      // Avoid too frequent refreshes (minimum 30 seconds between emotion-triggered refreshes)
      if (now - lastRefreshTime > 30000) {
        refreshMusicRecommendations();
      }
    }
  }, [stableEmotion]);

  // Render music recommendations
  const renderMusicRecommendations = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            Music For Your Workout <span className="ml-2">{getEmotionEmoji(currentEmotion)}</span> {formatEmotion(currentEmotion)}
          </h3>
          <div className="flex space-x-2">
            <button 
              onClick={refreshMusicRecommendations}
              className="px-2 py-1 bg-purple-600 rounded text-sm flex items-center"
            >
              <span className="mr-1">↻</span> Refresh
            </button>
            <a 
              href="https://open.spotify.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-2 py-1 bg-green-600 rounded text-sm flex items-center"
            >
              <span className="mr-1">🎧</span> Spotify
            </a>
            <button 
              onClick={toggleMusicPanel}
              className="px-2 py-1 bg-gray-700 rounded text-sm"
            >
              Hide
            </button>
          </div>
        </div>
        
        {/* Music tracks as embeds instead of text */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.slice(0, 3).map((track, index) => (
            <div key={index} className="bg-gray-900 rounded-lg overflow-hidden">
              <iframe 
                style={{ borderRadius: "12px" }}
                src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator`}
                width="100%" 
                height="80" // Reduced height from 352
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
              ></iframe>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExerciseModeSelector = () => {
    return (
      <div className="p-4 bg-gray-700">
        <label className="block text-sm font-medium mb-2">Exercise Mode</label>
        <div className="grid grid-cols-1 gap-2">
          <select
            className="w-full p-2 bg-gray-800 rounded border border-gray-600 text-white"
            value={exerciseMode}
            onChange={(e) => handleModeChange(e.target.value)}
          >
            <option value="tpose">T-Pose (Hold)</option>
            <option value="bicep_curl">Bicep Curl (Reps)</option>
            <option value="squat">Squat (Reps)</option>
            <option value="lateral_raise">Lateral Raise (Reps)</option>
            <option value="plank">Plank (Hold)</option>
          </select>
          
          {/* Finish Workout Button */}
          <button
            onClick={handleFinishWorkout}
            className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Finish Workout
          </button>
        </div>
      </div>
    );
  };

  // Render loading state when not fully initialized
  if (!isFullyMounted || !isConnected) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white p-4 items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md text-center shadow-lg">
          <div className="animate-spin mx-auto mb-4 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <h2 className="text-xl font-bold mb-2">Initializing Fitness Coach</h2>
          <p className="text-gray-400">
            {!isFullyMounted ? 'Loading application...' : 
            !isConnected ? 'Connecting to pose detection server...' : 
            'Preparing camera...'}
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-900 bg-opacity-50 rounded-lg">
              <p className="text-red-200">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular render when everything is initialized
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Top section with video and sidebar */}
      <div className="flex flex-col md:flex-row flex-1 p-4 overflow-hidden">
        {/* Camera View and Skeleton */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black rounded-lg">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform scale-x-[-1]"
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="hidden" // Hidden, just used for processing
          />
          <canvas
            id="skeleton-overlay"
            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
          />
          
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex justify-between items-center">
            {/* FPS Counter and Voice Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm">FPS: {fps}</span>
              
              {/* Voice Coach Toggle Button */}
              <button
                onClick={toggleVoiceEnabled}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                  voiceEnabled 
                    ? 'bg-green-700 hover:bg-green-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={voiceEnabled ? "Turn off voice coaching" : "Turn on voice coaching"}
              >
                <span role="img" aria-label="voice">
                  {voiceEnabled ? '🔊' : '🔈'}
                </span>
                <span className="text-xs sm:text-sm">Voice</span>
              </button>
              
              {/* Emotion Display */}
              <div 
                className="flex items-center space-x-1 px-2 py-1 rounded"
                style={{ backgroundColor: `${getEmotionColor(currentEmotion)}30` }}
              >
                <span className="text-lg" role="img" aria-label={currentEmotion || 'unknown'}>
                  {getEmotionEmoji(currentEmotion)}
                </span>
                <span className="text-sm font-medium">{formatEmotion(currentEmotion)}</span>
              </div>
            </div>
            
            {/* Music Toggle Button */}
            <button
              onClick={toggleMusicPanel}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <span role="img" aria-label="music">🎵</span>
              <span className="text-sm">{showMusicPanel ? 'Hide Music' : 'Show Music'}</span>
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 bg-opacity-90 p-4 rounded-lg max-w-md text-center">
              <h3 className="font-bold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          )}
        </div>
        
        {/* Feedback Panel */}
        <div className="w-full md:w-64 lg:w-80 bg-gray-800 rounded-lg overflow-hidden mt-4 md:mt-0 md:ml-4 flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 p-4">
            <h2 className="text-xl font-bold text-center">POSE COACH</h2>
            <p className="text-center text-sm mt-1">
              {exerciseMode === 'tpose' ? 'T-Pose Hold' : 
               exerciseMode === 'bicep_curl' ? 'Bicep Curl Reps' :
               exerciseMode === 'squat' ? 'Squat Reps' :
               exerciseMode === 'lateral_raise' ? 'Lateral Raise Reps' :
               'Plank Hold'}
            </p>
          </div>
          
          {/* Status and Feedback */}
          <div className="p-4 flex-1 overflow-y-auto">
            {renderFeedbackSections()}
          </div>
          
          {/* Exercise Mode Selector */}
          {renderExerciseModeSelector()}
        </div>
      </div>
      
      {/* Music Recommendations Panel - with refresh functionality */}
      {showMusicPanel && (
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          {renderMusicRecommendations()}
        </div>
      )}
      
      {/* Workout Completion Modal */}
      {renderWorkoutCompletionModal()}
    </div>
  );
};

export default FitnessCoach;