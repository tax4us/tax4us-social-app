"use client";

import { StoryViewer } from "@/components/ui/story-viewer";

const demoStories = [
  {
    id: "1",
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=600&fit=crop",
    duration: 5000,
  },
  {
    id: "2", 
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=600&fit=crop",
    duration: 4000,
  },
  {
    id: "3",
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=600&fit=crop", 
    duration: 6000,
  },
];

export default function StoryDemoPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Story Viewer Demo</h1>
      
      <div className="max-w-sm">
        <StoryViewer
          stories={demoStories}
          username="tax4us_official"
          avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
          timestamp="2h"
          onStoryView={(storyId) => console.log("Viewed story:", storyId)}
          onAllStoriesViewed={() => console.log("All stories viewed")}
        />
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Test Instructions:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Click the story thumbnail to open the viewer</li>
          <li>Stories auto-advance after their duration</li>
          <li>Click left/right sides to navigate manually</li>
          <li>Press ESC or click outside to close</li>
          <li>Check browser console for event logging</li>
        </ul>
      </div>
    </div>
  );
}