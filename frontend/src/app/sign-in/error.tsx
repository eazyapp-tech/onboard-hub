'use client'

export default function SignInError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="glass rounded-2xl p-8 text-center max-w-md w-full shadow-xl">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Sign In Error</h2>
        <p className="text-gray-600 mb-6">
          There was an issue with the sign-in process.
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors w-full mb-4"
        >
          Try Again
        </button>
        <a
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Go to Home
        </a>
      </div>
    </div>
  )
}
