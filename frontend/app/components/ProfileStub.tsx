"use client";

import { useEffect, useState } from "react";

export function ProfileStub() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // In a real app we'd pass auth headers
    fetch("/api/me", { headers: { Authorization: "Bearer DEVELOPER" } })
      .then(res => res.json())
      .then(setUser)
      .catch(console.error);

    fetch("/api/me/profile", { headers: { Authorization: "Bearer DEVELOPER" } })
      .then(res => res.json())
      .then(setProfile)
      .catch(console.error);
  }, []);

  if (!user || !profile) return <div className="p-4 border rounded animate-pulse bg-gray-100">Loading profile...</div>;

  return (
    <div className="p-6 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-bold">{user.name || "Anonymous Developer"}</h2>
      <p className="text-gray-600">@{user.githubHandle || "No GitHub handle"}</p>
      <div className="mt-4 flex gap-4">
        <div className="text-sm">
          <span className="font-bold text-blue-600">{profile.winCount}</span> Wins
        </div>
        <div className="text-sm">
          <span className="font-bold text-green-600">{profile.eventCount}</span> Events
        </div>
      </div>
    </div>
  );
}
