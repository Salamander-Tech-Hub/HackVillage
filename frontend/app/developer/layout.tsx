import React from "react";

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow p-4 border-b">
        <h1 className="text-lg font-bold text-blue-800">HackVillage Developer Portal</h1>
      </header>
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
