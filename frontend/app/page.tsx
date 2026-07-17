"use client"; // This tells Next.js this component runs in the browser

import { useState, useEffect } from "react";

export default function Home() {
  // We set up a state variable to hold the profile data once it loads
  const [profile, setProfile] = useState(null);

  // useEffect runs automatically when the page loads
  useEffect(() => {
    // We tell the browser to fetch the data from your Python backend
    fetch("http://127.0.0.1:8000/api/user/profile")
      .then((response) => response.json())
      .then((data) => setProfile(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <main className="min-h-screen p-10 bg-slate-900 text-white font-sans">
      <div className="max-w-xl mx-auto mt-10 p-6 bg-slate-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-emerald-400">Fitness Dashboard</h1>
        
        {/* If the profile hasn't loaded yet, show a loading message */}
        {!profile ? (
          <p>Connecting to backend...</p>
        ) : (
          // Once the profile loads, display the data!
          <div className="space-y-2 text-lg">
            <p><span className="font-semibold text-gray-400">Current Weight:</span> {profile.weight_kg} kg</p>
            <p><span className="font-semibold text-gray-400">Height:</span> {profile.height_cm} cm</p>
            <p><span className="font-semibold text-gray-400">Phase:</span> <span className="uppercase text-emerald-300">{profile.goal}</span></p>
          </div>
        )}
      </div>
    </main>
  );
}