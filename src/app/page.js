import Link from "next/link";

const pages = [
  {
    title: "Personal Finance Assistant",
    path: "/finance",
    description: "A personal finance assistant that helps you manage your finances effectively.",
  },
  {
    title: "Resume AI Search Boost (HR Assistant)",
    path: "/resume-ai-search-boost",
    description: "An AI-powered tool to enhance your resume and boost your job search.",
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
