import { ProfileStub } from "../components/ProfileStub";

export default function DeveloperHome() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Upcoming Registered Events</h2>
          {/* Empty state if teams API is unavailable */}
          <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-white">
            <p className="text-lg">You haven't registered for any upcoming events yet.</p>
            <p className="text-sm mt-2 text-gray-400">Find an event to join and form a team!</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition">
              Browse Events
            </button>
            <button className="px-6 py-2 bg-white border border-gray-300 font-medium rounded hover:bg-gray-50 transition">
              Update Profile
            </button>
          </div>
        </section>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Your Profile</h2>
        <ProfileStub />
      </div>
    </div>
  );
}
