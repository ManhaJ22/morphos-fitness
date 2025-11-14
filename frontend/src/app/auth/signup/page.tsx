"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { UserSignUp, signUp } from '@/backend/userApiCalls';
import { useRouter } from 'next/navigation';
import { useUser } from '@/backend/userProvider';

const SignupPage = () => {
  // State for current step
  const [currentStep, setCurrentStep] = useState(0);
  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  // State for submission error
  const [submitError, setSubmitError] = useState('');

  const { setUser } = useUser();
  const router = useRouter();

  // Form data state
  const [formData, setFormData] = useState<UserSignUp>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    height: '',
    weight: '',
    fitnessLevel: 'beginner',
    workoutDuration: '45',
    workoutFrequency: '4',
    fitnessGoals: [],
    equipment: []
  });

  // State for errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      const arrayField = name === 'equipment' ? 'equipment' : 'fitnessGoals';
      if (checked) {
        setFormData({
          ...formData,
          [arrayField]: [...formData[arrayField], value]
        });
      } else {
        setFormData({
          ...formData,
          [arrayField]: formData[arrayField].filter(item => item !== value)
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

    // Check password match when either password field changes
    if (name === 'password' || name === 'confirmPassword') {
      if (name === 'password' && formData.confirmPassword && value !== formData.confirmPassword) {
        setErrors({
          ...errors,
          confirmPassword: 'Passwords do not match'
        });
      } else if (name === 'confirmPassword' && value !== formData.password) {
        setErrors({
          ...errors,
          confirmPassword: 'Passwords do not match'
        });
      } else if (name === 'confirmPassword' && value === formData.password) {
        setErrors({
          ...errors,
          confirmPassword: ''
        });
      }
    }
  };

  // Validate step 0 (account details)
  const validateAccountDetails = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  // Validate step 1 (physical info)
  const validatePhysicalInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age) < 13 || parseInt(formData.age) > 100) {
      newErrors.age = 'Age must be between 13 and 100';
    }

    if (!formData.height) {
      newErrors.height = 'Height is required';
    } else if (parseInt(formData.height) < 120 || parseInt(formData.height) > 220) {
      newErrors.height = 'Height must be between 120 and 220 cm';
    }

    if (!formData.weight) {
      newErrors.weight = 'Weight is required';
    } else if (parseInt(formData.weight) < 30 || parseInt(formData.weight) > 200) {
      newErrors.weight = 'Weight must be between 30 and 200 kg';
    }

    return newErrors;
  };

  // Validate step 2 (fitness goals)
  const validateFitnessGoals = () => {
    const newErrors: Record<string, string> = {};

    if (formData.fitnessGoals.length === 0) {
      newErrors.fitnessGoals = 'Please select at least one fitness goal';
    }

    if (parseInt(formData.workoutDuration) < 10 || parseInt(formData.workoutDuration) > 120) {
      newErrors.workoutDuration = 'Workout duration must be between 10 and 120 minutes';
    }

    if (parseInt(formData.workoutFrequency) < 1 || parseInt(formData.workoutFrequency) > 7) {
      newErrors.workoutFrequency = 'Workout frequency must be between 1 and 7 days per week';
    }

    return newErrors;
  };

  // Validate step 3 (equipment)
  const validateEquipment = () => {
    const newErrors: Record<string, string> = {};

    if (formData.equipment.length === 0) {
      newErrors.equipment = 'Please select at least one equipment option (or "none")';
    }

    return newErrors;
  };

  // Validate current step
  const validateStep = () => {
    let newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0:
        newErrors = validateAccountDetails();
        break;
      case 1:
        newErrors = validatePhysicalInfo();
        break;
      case 2:
        newErrors = validateFitnessGoals();
        break;
      case 3:
        newErrors = validateEquipment();
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Go to next step
  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Go to previous step
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateStep()) {
      setIsLoading(true);
      setSubmitError('');

      try {
        // Submit to backend
        console.log('Submitting form data:', formData);
        const response = await signUp(formData);

        if (!response || response.status !== 200) {
          setSubmitError('Failed to create account. Please try again.');
          setIsLoading(false);
          return;
        }

        // Extract user data from form data
        const userData = {
          name: formData.name,
          email: formData.email,
          age: formData.age,
          height: formData.height,
          weight: formData.weight,
          fitnessLevel: formData.fitnessLevel,
          workoutDuration: formData.workoutDuration,
          workoutFrequency: formData.workoutFrequency,
          fitnessGoals: formData.fitnessGoals,
          equipment: formData.equipment
        };

        // Store JWT token if one is provided
        if (response.data.token) {
          document.cookie = `authToken=${response.data.token}; path=/; max-age=604800`; // 7 days expiry
        }

        // Set user email in cookie and user data in context
        document.cookie = `userEmail=${formData.email}; path=/; max-age=604800`; // 7 days expiry
        setUser(userData);

        // Redirect to homepage
        router.push("/homepage");
      } catch (error: any) {
        console.error("Signup error:", error);
        if (error.response?.data?.message) {
          setSubmitError(error.response.data.message);
        } else {
          setSubmitError('An error occurred during signup. Please try again.');
        }
        setIsLoading(false);
      }
    }
  };

  // Special handler for equipment checkbox to handle "none" logic
  const handleEquipmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    let newEquipment = [...formData.equipment];

    if (value === 'none' && checked) {
      // If "none" is selected, clear all other selections
      newEquipment = ['none'];
    } else if (checked) {
      // If any other equipment is selected, remove "none" if it exists
      newEquipment = newEquipment.filter(item => item !== 'none');
      newEquipment.push(value);
    } else {
      // If unchecking, just remove that item
      newEquipment = newEquipment.filter(item => item !== value);
    }

    setFormData({
      ...formData,
      equipment: newEquipment
    });

    // Clear any equipment error
    if (errors.equipment) {
      setErrors({
        ...errors,
        equipment: ''
      });
    }
  };

  // Calculate BMI if height and weight are available
  const calculateBMI = () => {
    if (formData.height && formData.weight) {
      const heightInMeters = parseInt(formData.height) / 100;
      const weightInKg = parseInt(formData.weight);
      return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#161b2b] flex items-center justify-center p-4">
      <div className="bg-[#1a2235] rounded-xl shadow-lg w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-8 text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">Morphos</h1>
          <p className="text-white opacity-90">AI-powered fitness coaching with real-time pose tracking</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#212a3e] px-8 py-8">
          <div className="relative flex justify-between mb-6">
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#2c354a] -translate-y-1/2"></div>
            {/* Progress fill */}
            <div
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 -translate-y-1/2 transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>

            {/* Step indicators */}
            {[0, 1, 2, 3].map((step, index) => (
              <div
                key={index}
                className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full font-semibold transition-all duration-300 ${currentStep >= step
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-[#2c354a] text-gray-400'
                  }`}
              >
                {step + 1}
                <span className="absolute top-16 text-sm text-[#8c9cb8] w-max" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                  {['Account', 'Profile', 'Goals', 'Equipment'][step]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="px-8 py-6">
          {submitError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-200 text-sm">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account Setup */}
            {currentStep === 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-1 text-white">Create Your Account</h2>
                <p className="text-[#8c9cb8] text-sm mb-6">Join our AI-powered fitness community</p>

                <div className="mb-5">
                  <label htmlFor="name" className="block text-[#c5d0e6] font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full bg-[#212a3e] border ${errors.name ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div className="mb-5">
                  <label htmlFor="email" className="block text-[#c5d0e6] font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full bg-[#212a3e] border ${errors.email ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div className="mb-5">
                  <label htmlFor="password" className="block text-[#c5d0e6] font-semibold mb-2">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full bg-[#212a3e] border ${errors.password ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.password
                    ? <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                    : <p className="text-[#8c9cb8] text-xs mt-1.5">Use at least 8 characters with a mix of letters, numbers, and symbols</p>
                  }
                </div>

                <div className="mb-5">
                  <label htmlFor="confirmPassword" className="block text-[#c5d0e6] font-semibold mb-2">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full bg-[#212a3e] border ${errors.confirmPassword ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 px-6 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Physical Info */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-1 text-white">Physical Information</h2>
                <p className="text-[#8c9cb8] text-sm mb-6">This helps us personalize your workout experience</p>

                <div className="mb-5">
                  <label htmlFor="age" className="block text-[#c5d0e6] font-semibold mb-2">Age</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    min="13"
                    max="100"
                    value={formData.age}
                    onChange={handleInputChange}
                    className={`w-full bg-[#212a3e] border ${errors.age ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.age
                    ? <p className="text-red-500 text-xs mt-1">{errors.age}</p>
                    : <p className="text-[#8c9cb8] text-xs mt-1.5">Range: 13-100 years</p>
                  }
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label htmlFor="height" className="block text-[#c5d0e6] font-semibold mb-2">Height (cm)</label>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      min="120"
                      max="220"
                      value={formData.height}
                      onChange={handleInputChange}
                      className={`w-full bg-[#212a3e] border ${errors.height ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {errors.height
                      ? <p className="text-red-500 text-xs mt-1">{errors.height}</p>
                      : <p className="text-[#8c9cb8] text-xs mt-1.5">Range: 120-220 cm</p>
                    }
                  </div>

                  <div>
                    <label htmlFor="weight" className="block text-[#c5d0e6] font-semibold mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      min="30"
                      max="200"
                      value={formData.weight}
                      onChange={handleInputChange}
                      className={`w-full bg-[#212a3e] border ${errors.weight ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {errors.weight
                      ? <p className="text-red-500 text-xs mt-1">{errors.weight}</p>
                      : <p className="text-[#8c9cb8] text-xs mt-1.5">Range: 30-200 kg</p>
                    }
                  </div>
                </div>

                {calculateBMI() && (
                  <div className="bg-[#212a3e] rounded-lg p-4 text-center font-semibold mb-5 border-l-4 border-purple-500">
                    Your BMI: {calculateBMI()}
                  </div>
                )}

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="rounded-full bg-[#2c354a] hover:bg-[#3a455f] px-6 py-3.5 font-semibold text-white transition-all duration-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 px-6 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Fitness Goals */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-semibold mb-1 text-white">Fitness Goals</h2>
                <p className="text-[#8c9cb8] text-sm mb-6">Tell us about your experience and goals</p>

                <div className="mb-5">
                  <label htmlFor="fitnessLevel" className="block text-[#c5d0e6] font-semibold mb-2">Your Fitness Level</label>
                  <select
                    id="fitnessLevel"
                    name="fitnessLevel"
                    value={formData.fitnessLevel}
                    onChange={handleInputChange}
                    className="w-full bg-[#212a3e] border border-[#2c354a] rounded-lg p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label htmlFor="workoutDuration" className="block text-[#c5d0e6] font-semibold mb-2">Workout Duration (min)</label>
                    <input
                      type="number"
                      id="workoutDuration"
                      name="workoutDuration"
                      min="10"
                      max="120"
                      value={formData.workoutDuration}
                      onChange={handleInputChange}
                      className={`w-full bg-[#212a3e] border ${errors.workoutDuration ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {errors.workoutDuration
                      ? <p className="text-red-500 text-xs mt-1">{errors.workoutDuration}</p>
                      : <p className="text-[#8c9cb8] text-xs mt-1.5">Range: 10-120 minutes</p>
                    }
                  </div>

                  <div>
                    <label htmlFor="workoutFrequency" className="block text-[#c5d0e6] font-semibold mb-2">Workouts per Week</label>
                    <input
                      type="number"
                      id="workoutFrequency"
                      name="workoutFrequency"
                      min="1"
                      max="7"
                      value={formData.workoutFrequency}
                      onChange={handleInputChange}
                      className={`w-full bg-[#212a3e] border ${errors.workoutFrequency ? 'border-red-500' : 'border-[#2c354a]'} rounded-lg p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {errors.workoutFrequency
                      ? <p className="text-red-500 text-xs mt-1">{errors.workoutFrequency}</p>
                      : <p className="text-[#8c9cb8] text-xs mt-1.5">Range: 1-7 days</p>
                    }
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[#c5d0e6] font-semibold mb-2">Fitness Goals (Select all that apply)</label>
                  {errors.fitnessGoals && <p className="text-red-500 text-xs mt-1 mb-2">{errors.fitnessGoals}</p>}
                  <div className="space-y-2.5 mt-2">
                    {[
                      { id: 'goalMuscle', value: 'buildMuscle', label: 'Build muscle' },
                      { id: 'goalWeight', value: 'loseWeight', label: 'Lose weight' },
                      { id: 'goalFlexibility', value: 'improveFlexibility', label: 'Improve flexibility' },
                      { id: 'goalEndurance', value: 'increaseEndurance', label: 'Increase endurance' },
                      { id: 'goalGeneral', value: 'generalFitness', label: 'General fitness' }
                    ].map(goal => (
                      <div key={goal.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={goal.id}
                          name="fitnessGoals"
                          value={goal.value}
                          checked={formData.fitnessGoals.includes(goal.value)}
                          onChange={handleInputChange}
                          className="w-4 h-4 accent-purple-500 mr-3"
                        />
                        <label htmlFor={goal.id} className="text-[#c5d0e6]">{goal.label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="rounded-full bg-[#2c354a] hover:bg-[#3a455f] px-6 py-3.5 font-semibold text-white transition-all duration-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 px-6 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Equipment */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-xl font-semibold mb-1 text-white">Available Equipment</h2>
                <p className="text-[#8c9cb8] text-sm mb-6">Select the equipment you have access to</p>

                <div className="mb-5">
                  <label className="block text-[#c5d0e6] font-semibold mb-2">Equipment (Select all that apply)</label>
                  {errors.equipment && <p className="text-red-500 text-xs mt-1 mb-2">{errors.equipment}</p>}
                  <div className="space-y-2.5 mt-2">
                    {[
                      { id: 'equipNone', value: 'none', label: 'None' },
                      { id: 'equipDumbbells', value: 'dumbbells', label: 'Dumbbells' },
                      { id: 'equipBands', value: 'resistanceBands', label: 'Resistance bands' },
                      { id: 'equipBarbell', value: 'barbell', label: 'Barbell' },
                      { id: 'equipKettlebell', value: 'kettlebell', label: 'Kettlebell' },
                      { id: 'equipPullup', value: 'pullUpBar', label: 'Pull-up bar' },
                      { id: 'equipBike', value: 'exerciseBike', label: 'Exercise bike' },
                      { id: 'equipTreadmill', value: 'treadmill', label: 'Treadmill' }
                    ].map(item => (
                      <div key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={item.id}
                          name="equipment"
                          value={item.value}
                          checked={formData.equipment.includes(item.value)}
                          onChange={handleEquipmentChange}
                          disabled={item.id !== 'equipNone' && formData.equipment.includes('none')}
                          className="w-4 h-4 accent-purple-500 mr-3"
                        />
                        <label htmlFor={item.id} className="text-[#c5d0e6]">{item.label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#212a3e] rounded-lg p-5 grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-[#8c9cb8] text-sm mb-1">Workout Streak</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">0</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#8c9cb8] text-sm mb-1">Total Workouts</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">0</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#8c9cb8] text-sm mb-1">Calories</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">0</div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="rounded-full bg-[#2c354a] hover:bg-[#3a455f] px-6 py-3.5 font-semibold text-white transition-all duration-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`rounded-full bg-gradient-to-r from-blue-500 to-purple-500 ${isLoading ? 'opacity-70' : 'hover:opacity-90'} px-6 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </div>
                    ) : (
                      'Complete Sign Up'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;