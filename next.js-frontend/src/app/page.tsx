"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the auth page as the default landing page
    router.push("/auth");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Visitor Sign-In System</h1>
        <p className="text-xl mb-8">Redirecting to login...</p>
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}
