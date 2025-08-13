import Link from "next/link";

const pages = [
  {
    title: "Personal Finance Assistant",
    path: "/finance",
    description: "A personal finance assistant that helps you manage your finances effectively.",
    tech: "Next.js, React, Node.js, MongoDB",
    Ai: "OpenAI, openai/gpt-oss-120b",
  },
  {
    title: "Resume AI Search Boost (HR Assistant)",
    path: "/resume-ai-search-boost",
    description: "An AI-powered tool to enhance your resume and boost your job search.",
    tech: "Next.js, React, Node.js, MongoDB",
    Ai: "OpenAI, meta-llama/llama-prompt-guard-2-22m",

  },
  {
    title: "PDF Based Chat Support",
    path: "/pdf-Management",
    description: "An AI-powered tool to enhance your resume and boost your job search.",
    tech: "Next.js, React, Node.js, PostgreSQL",
    Ai: "OpenAI, meta-llama/llama-prompt-guard-2-22m",
  },
  {
    title: "Mystical Astrology",
    path: "/mystical-astrology",
    description: "An AI-powered tool to explore astrological insights and predictions.",
    tech: "Next.js, React, Node.js, PostgreSQL",
    Ai: "OpenAI, meta-llama/llama-prompt-guard-2-22m",
  },
  // Add more pages here as needed
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to Dynamicdreamz Ai/MERN Stack Projects List</h1>
      <table className="min-w-[320px] border border-gray-300 rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-900">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Title</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Path</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Tech Stack</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">AI Modal</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.path} className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-6 py-4">
                <Link href={page.path} className="text-blue-600 hover:underline">
                  {page.title}
                </Link>
              </td>
              <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                {page.description || "No description available"}
              </td>
              <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                {page.tech || "No tech stack available"}
              </td>
              <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                {page.Ai || "No AI tools available"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
