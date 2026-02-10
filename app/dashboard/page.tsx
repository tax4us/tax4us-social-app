import { TopicManager } from "@/lib/pipeline/topic-manager";
import { Topic } from "@/lib/types/pipeline";

export default async function DashboardPage() {
    const manager = new TopicManager();
    const topics = await manager.fetchReadyTopics();

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-12">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Tax4Us Content Pipeline
                </h1>
                <p className="text-gray-400 mt-2">Manage and monitor your automated content generation.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                ))}
            </div>

            {topics.length === 0 && (
                <div className="text-center py-20 bg-gray-800 rounded-xl border border-gray-700">
                    <p className="text-gray-400">No ready topics found in Airtable.</p>
                </div>
            )}
        </div>
    );
}

function TopicCard({ topic }: { topic: Topic }) {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${topic.status === 'ready' ? 'bg-blue-900 text-blue-200' : 'bg-green-900 text-green-200'
                    }`}>
                    {topic.status.toUpperCase()}
                </span>
                <span className="text-gray-500 text-xs">{topic.type}</span>
            </div>

            <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                {topic.title || topic.topic}
            </h3>

            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {topic.outline || "No outline generated yet. Research pending."}
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
                {topic.keywords?.slice(0, 3).map((kw) => (
                    <span key={kw} className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px]">
                        {kw}
                    </span>
                ))}
            </div>

            <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                    Run Pipeline
                </button>
                <button className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                    Edit
                </button>
            </div>
        </div>
    );
}
