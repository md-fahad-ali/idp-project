"use client";

import { useState, useEffect, lazy, Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { useDashboard } from "../../provider";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";

// Lazy load the Tiptap component as it's heavy
const Tiptap = lazy(() => import("@/components/Tiptap"));

const GamifiedCourse: React.FC = () => {
  const searchParams = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialCategory = searchParams.get("category") || "";

  const { token } = useDashboard();
  const router = useRouter();
  
  // Remove unnecessary API calls and simplify state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Course form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [lessons, setLessons] = useState([
    { title: "", content: "", points: 10 },
  ]);
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null);

  useEffect(() => {
    // Early return and redirect if no token
    if (!token) {
      console.log("No token available");
      setLoading(false);
      router.push('/auth/login');
      return;
    }
    
    // Set initial values directly without fetching all courses
    const formatTitle = (slug: string) => {
      return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };
    
    setTitle(initialTitle ? formatTitle(initialTitle) : "");
    setCategory(initialCategory || "");
    
    // Finish loading immediately without API call
    setLoading(false);
    
  }, [initialTitle, initialCategory, token, router]);

  // Prevent flash of content when redirecting
  if (!token) {
    return null;
  }

  // Add loading screen
  if (loading) {
    return <Loading />;
  }

  // Handlers for lessons
  const handleAddLesson = () => {
    setLessons([...lessons, { title: "", content: "", points: 10 }]);
  };

  const handleRemoveLesson = (index: number) => {
    const newLessons = [...lessons];
    newLessons.splice(index, 1);
    setLessons(newLessons);
  };

  const handleLessonChange = (
    index: number,
    field: keyof typeof lessons[0],
    value: string | number
  ) => {
    const updatedLessons = lessons.map((lesson, i) => {
      if (i === index) {
        return { ...lesson, [field]: value };
      }
      return lesson;
    });
    setLessons(updatedLessons);
  };

  const handleOpenEditor = (index: number) => {
    setEditingLessonIndex(index);
  };

  // Handler for saving the course
  const handleSaveCourse = async () => {
    // Ensure all lessons have their content properly updated
    const updatedLessons = lessons.map((lesson, index) => {
      if (editingLessonIndex === index) {
        return { ...lesson, content: lesson.content || "" };
      }
      return lesson;
    });

    const courseData = {
      title,
      category,
      description,
      lessons: updatedLessons,
    };

    // Validate form data
    if (!title || !category || !description) {
      alert("Please fill in all course details (title, category, and description).");
      return;
    }

    if (courseData.lessons.length === 0) {
      alert("Please add at least one lesson.");
      return;
    }

    const emptyLessons = courseData.lessons.filter(
      lesson => !lesson.title || !lesson.content || lesson.content.length < 10
    );
    
    if (emptyLessons.length > 0) {
      alert("Please ensure all lessons have titles and sufficient content.");
      return;
    }

    // Show loading state
    setSaving(true);

    try {
      const response = await fetch("/api/course/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        const result = await response.json();
        alert("Course saved successfully!");
        router.push("/dashboard");
      } else {
        const error = await response.json();
        alert("Failed to save course: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-[100px] bg-[#6016a7] text-[#E6F1FF] min-h-screen">
      <div className="container mx-auto px-4 pb-16">
        <h1 className="text-3xl font-bold text-[aqua] mb-8 font-mono">
          Create New Course
        </h1>

        {/* Course Information Section */}
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
          <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">
            Course Information
          </h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#8892B0]">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#8892B0]">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md shadow-[2px_2px_0px_0px_#000000] p-3"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#8892B0]">
              Description
            </label>
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
          <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">
            Course Content
          </h2>
          {lessons.map((lesson, index) => (
            <div
              key={index}
              className="bg-[#2f235a] border-2 border-black rounded-md p-4 mb-4"
            >
              <div className="flex items-center mb-2">
                <label className="text-sm font-medium text-[#8892B0] mr-2">
                  Lesson Title:
                </label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) =>
                    handleLessonChange(index, "title", e.target.value)
                  }
                  className="flex-1 border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md p-2"
                />
              </div>
              <div className="flex items-center mb-2">
                <label className="text-sm font-medium text-[#8892B0] mr-2">
                  Points:
                </label>
                <input
                  type="number"
                  value={lesson.points}
                  onChange={(e) =>
                    handleLessonChange(
                      index,
                      "points",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-20 border-2 border-black bg-[#2A3A4A] text-[#E6F1FF] rounded-md p-2"
                />
              </div>
              <div className="mb-2">
                <label className="text-sm font-medium text-[#8892B0]">
                  Content:
                </label>
                {editingLessonIndex === index ? (
                  <div className="mt-2">
                    <Suspense fallback={<Loading />}>
                      <Tiptap
                        content={lesson.content}
                        onChange={(newContent) =>
                          handleLessonChange(index, "content", newContent)
                        }
                      />
                    </Suspense>
                    <button
                      onClick={() => setEditingLessonIndex(null)}
                      className="mt-2 p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#555555] transition-all duration-200"
                    >
                      Close Editor
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenEditor(index)}
                    className="mt-2 p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
                  >
                    Edit Content
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
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

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleSaveCourse}
            disabled={saving}
            className={`p-2 text-white border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] transition-all duration-200 ${
              saving ? 'bg-[#888888] opacity-70 cursor-not-allowed' : 'bg-[#666666] hover:bg-[#555555]'
            }`}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleSaveCourse}
            disabled={saving}
            className={`p-2 text-white border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] transition-all duration-200 ${
              saving ? 'bg-[#b47ae5] opacity-70 cursor-not-allowed' : 'bg-[#9D4EDD] hover:bg-[#7A3CB8]'
            }`}
          >
            {saving ? "Publishing..." : "Publish Course"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamifiedCourse;
