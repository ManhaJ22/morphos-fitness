// app/landing/page.tsx
"use client";

import { useState, useEffect } from 'react';
//import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-4 md:px-8">
        <div className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Morphos 
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
              Fitness
            </span>
          </h1>

          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 text-gray-300">
            AI-powered fitness coaching with real-time pose tracking and emotion-based motivation
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full font-medium hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition duration-300 transform hover:-translate-y-1">
                Sign In
              </button>
            </Link>
            <button
              onClick={() => window.open("http://youtube.com/watch?v=uruMzYHK6UE", "_blank")}
              className="px-8 py-3 bg-transparent border-2 border-gray-400 rounded-full font-medium hover:border-white transition duration-300"
            >
              Watch Demo
            </button>
          </div>
        </div>

        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-0 left-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How Morphos Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl transform transition duration-300 hover:scale-105">
              <div className="bg-blue-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Live Pose Estimation</h3>
              <p className="text-gray-400">
                Your personal AI trainer tracks your movements in real-time, counts your reps, and provides feedback on your form to ensure optimal results.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl transform transition duration-300 hover:scale-105">
              <div className="bg-purple-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Emotion Tracking</h3>
              <p className="text-gray-400">
                Our advanced AI detects your emotional state and adapts music and motivation to keep you engaged and push through challenging moments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl transform transition duration-300 hover:scale-105">
              <div className="bg-pink-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Analytics</h3>
              <p className="text-gray-400">
                Track your progress with detailed insights on reps, sets, time under tension, emotional patterns, and personalized improvement suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Preview Section */}
      <section className="py-20 px-4 md:px-8 bg-gray-900 bg-opacity-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">See Morphos in Action</h2>
              <p className="text-gray-400 text-lg mb-8">
                Experience how our AI coach monitors your form, counts reps, and adjusts to your energy level - all in real-time through your device camera.
              </p>
              <ul className="space-y-4">
                {[
                  'Real-time form correction with visual guides',
                  'Personalized workout plans based on your goals',
                  'Adaptive music that matches your energy',
                  'Voice coaching that responds to your emotions'
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-1 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:w-1/2 rounded-2xl overflow-hidden border-4 border-gray-800 shadow-2xl">
              <div className="aspect-video relative">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/uruMzYHK6UE?si=vzD7UYuZFLZb-sGV"
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mr-2">
                Morphos Fitness
              </span>
              <span className="text-gray-500">© 2025. All rights reserved.</span>
            </div>
            <div className="flex space-x-6">
              {['Terms', 'Privacy', 'Cookies'].map((item, index) => (
                <a key={index} href="#" className="text-gray-500 hover:text-gray-300 transition">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Add these styles to your global CSS file */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}