"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSuccess = () => {
    router.push("/admin");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Form section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-8 text-center">Event Host Portal</h1>
          <AuthForm onLoginSuccess={handleLoginSuccess} isLoading={isLoading} setIsLoading={setIsLoading} />
        </div>
      </div>

      {/* Hero section */}
      <div className="w-full md:w-1/2 bg-blue-600 text-white p-8 flex flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-4">Visitor Sign-In System</h2>
          <p className="text-xl mb-6">
            Welcome to our visitor management platform. Easily manage events and track attendees.
          </p>
          <ul className="space-y-4 mb-8">
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Generate QR codes for easy visitor sign-in</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>View real-time event attendance data</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Customize your branding and social media links</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
