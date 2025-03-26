"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Tiptap from "@/components/Tiptap";

const GamifiedCourse: React.FC = () => {
  const searchParams = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialCategory = searchParams.get("category") || "";

  // State for course metadata
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState("");

  // State for course content (lessons)
  const [lessons, setLessons] = useState([{ title: "", content: "", points: 10 }]);

  // State for gamification settings (badges)
  const [badges, setBadges] = useState([""]);

  // State for modal
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null);

  // Handlers for lessons
  const handleAddLesson = () => {
    setLessons([...lessons, { title: "", content: "", points: 10 }]);
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const handleLessonChange = (index: number, field: string, value: string | number) => {
    const newLessons = [...lessons];
    newLessons[index] = { ...newLessons[index], [field]: value };
    setLessons(newLessons);
  };

  const handleOpenEditor = (index: number) => {
    setEditingLessonIndex(index);
  };

  const handleSaveContent = (newContent: string) => {
    if (editingLessonIndex !== null) {
      const newLessons = [...lessons];
      newLessons[editingLessonIndex].content = newContent;
      setLessons(newLessons);
      setEditingLessonIndex(null);
    }
  };

  // Handlers for badges
  const handleAddBadge = () => {
    setBadges([...badges, ""]);
  };

  const handleRemoveBadge = (index: number) => {
    setBadges(badges.filter((_, i) => i !== index));
  };

  const handleBadgeChange = (index: number, value: string) => {
    const newBadges = [...badges];
    newBadges[index] = value;
    setBadges(newBadges);
  };

  // Handler for saving the course
  const handleSaveCourse = () => {
    const courseData = { title, category, description, lessons, badges };
    console.log("Saving course:", courseData);
    // Future implementation: Send courseData to backend API
  };

  return (
    <div className="pt-[100px] bg-[#6016a7] text-[#E6F1FF] min-h-screen">
      <div className="container mx-auto px-4 pb-16">
        <h1 className="text-3xl font-bold text-[aqua] mb-8 font-mono">Create New Course</h1>

        {/* Course Information Section */}
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
          <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Course Information</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#8892B0]">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#8892B0]">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#8892B0]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3"
              rows={4}
            />
          </div>
        </div>

        {/* Course Content Section */}
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
          <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Course Content</h2>
          {lessons.map((lesson, index) => (
            <div key={index} className="bg-[#2f235a] border-2 border-black rounded-md p-4 mb-4">
              <div className="flex items-center mb-2">
                <label className="text-sm font-medium text-[#8892B0] mr-2">Lesson Title:</label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => handleLessonChange(index, "title", e.target.value)}
                  className="flex-1 border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md p-2"
                />
              </div>
              <div className="flex items-center mb-2">
                <label className="text-sm font-medium text-[#8892B0] mr-2">Points:</label>
                <input
                  type="number"
                  value={lesson.points}
                  onChange={(e) => handleLessonChange(index, "points", parseInt(e.target.value) || 0)}
                  className="w-20 border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md p-2"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenEditor(index)}
                  className="p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
                >
                  Edit Content
                </button>
                <button
                  onClick={() => handleRemoveLesson(index)}
                  className="p-2 text-white bg-[#FF4D4D] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#E63939] transition-all duration-200"
                >
                  Remove Lesson
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddLesson}
            className="mt-4 p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
          >
            Add Lesson
          </button>
        </div>

        {/* Gamification Settings Section */}
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
          <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">Gamification Settings</h2>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-[#E6F1FF] mb-2">Badges</h3>
            {badges.map((badge, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => handleBadgeChange(index, e.target.value)}
                  placeholder="Badge Name"
                  className="flex-1 border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md p-2"
                />
                <button
                  onClick={() => handleRemoveBadge(index)}
                  className="ml-2 p-2 text-white bg-[#FF4D4D] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#E63939] transition-all duration-200"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleAddBadge}
              className="mt-2 p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
            >
              Add Badge
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleSaveCourse}
            className="p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#555555] transition-all duration-200"
          >
            Save Draft
          </button>
          <button
            onClick={handleSaveCourse}
            className="p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
          >
            Publish Course
          </button>
        </div>

        {/* Lesson Content Modal */}
        {editingLessonIndex !== null && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#00000080] z-[999]">
            <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] w-3/4 max-w-4xl max-h-[80vh] overflow-hidden">
              <h3 className="text-xl font-bold text-[#E6F1FF] mb-4 font-mono">Edit Lesson Content</h3>
              <div className="max-h-[60vh] overflow-y-auto mb-4">
                <Tiptap
                  content={lessons[editingLessonIndex].content}
                  onChange={(newContent) => handleLessonChange(editingLessonIndex, "content", newContent)}
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setEditingLessonIndex(null)}
                  className="p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#555555] transition-all duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => handleSaveContent(lessons[editingLessonIndex].content)}
                  className="p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
                >
                  Save Content
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamifiedCourse;