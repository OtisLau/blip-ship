export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Blip Ship</h1>
        <p className="text-gray-400 mb-8">Autonomous CRO Agent</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/store"
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            View Demo Store
          </a>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            Open Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
