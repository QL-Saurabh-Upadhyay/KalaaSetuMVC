"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SideDrawer() {
  const pathname = usePathname();

  return (
    <aside className="w-72 min-h-screen bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-gray-200 dark:border-gray-800 flex flex-col gap-6 py-6 z-10 border border-gray-300 dark:border-gray-700">
      <div className="text-center mb-6 border-b border-gray-300 dark:border-gray-700 pb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-pink-400 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/40 dark:border-gray-800">
          <span className="text-lg font-bold text-white">🎨</span>
        </div>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-500 tracking-tight mb-1">Kalaa-Setu</h2>
        <h3 className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">AI-powered Visual Generation Tools</h3>
      </div>
      <nav className="flex flex-col gap-3 px-3">
        
        <Link 
          href="/infographic"
          className={`py-2.5 px-4 rounded-lg font-semibold text-base transition-all duration-200 text-left ${
            pathname === "/infographic"
              ? "bg-gradient-to-r from-indigo-200 to-blue-200 dark:from-indigo-800 dark:to-blue-800 text-indigo-800 dark:text-indigo-200 shadow-lg"
              : "bg-gradient-to-r from-indigo-100/80 to-blue-100/80 dark:from-indigo-900/40 dark:to-blue-900/40 hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r hover:from-indigo-200 hover:to-blue-200 dark:hover:from-indigo-800 dark:hover:to-blue-800 text-indigo-700 dark:text-indigo-200"
          } focus:outline-none focus:ring-2 focus:ring-indigo-400`}
        >
          Text to Infographic & Graphs
        </Link>
        <Link 
          href="/illustration"
          className={`py-2.5 px-4 rounded-lg font-semibold text-base transition-all duration-200 text-left ${
            pathname === "/illustration"
              ? "bg-gradient-to-r from-pink-200 to-yellow-200 dark:from-pink-800 dark:to-yellow-800 text-pink-800 dark:text-pink-200 shadow-lg"
              : "bg-gradient-to-r from-pink-100/80 to-yellow-100/80 dark:from-pink-900/40 dark:to-yellow-900/40 hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r hover:from-pink-200 hover:to-yellow-200 dark:hover:from-pink-800 dark:hover:to-yellow-800 text-pink-700 dark:text-pink-200"
          } focus:outline-none focus:ring-2 focus:ring-pink-400`}
        >
          Text to Illustration & Storyboard
        </Link>
        <Link 
          href="/audio"
          className={`py-2.5 px-4 rounded-lg font-semibold text-base transition-all duration-200 text-left ${
            pathname === "/audio"
              ? "bg-gradient-to-r from-green-200 to-teal-200 dark:from-green-800 dark:to-teal-800 text-green-800 dark:text-green-200 shadow-lg"
              : "bg-gradient-to-r from-green-100/80 to-teal-100/80 dark:from-green-900/40 dark:to-teal-900/40 hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r hover:from-green-200 hover:to-teal-200 dark:hover:from-green-800 dark:hover:to-teal-800 text-green-700 dark:text-green-200"
          } focus:outline-none focus:ring-2 focus:ring-green-400`}
        >
          Text to Audio
        </Link>
        <Link 
          href="/video"
          className={`py-2.5 px-4 rounded-lg font-semibold text-base transition-all duration-200 text-left ${
            pathname === "/video"
              ? "bg-gradient-to-r from-indigo-200 to-blue-200 dark:from-indigo-800 dark:to-blue-800 text-indigo-800 dark:text-indigo-200 shadow-lg"
              : "bg-gradient-to-r from-indigo-100/80 to-blue-100/80 dark:from-indigo-900/40 dark:to-blue-900/40 hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r hover:from-indigo-200 hover:to-blue-200 dark:hover:from-indigo-800 dark:hover:to-blue-800 text-indigo-700 dark:text-indigo-200"
          } focus:outline-none focus:ring-2 focus:ring-indigo-400`}
        >
          Text to Video
        </Link>
        <Link 
          href="/settings"
          className={`py-2.5 px-4 rounded-lg font-semibold text-base transition-all duration-200 text-left ${
            pathname === "/settings"
              ? "bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 shadow-lg"
              : "bg-gradient-to-r from-gray-100/80 to-gray-200/80 dark:from-gray-800/40 dark:to-gray-700/40 hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 text-gray-700 dark:text-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-gray-400`}
        >
          Settings
        </Link>
      </nav>
    </aside>
  );
}