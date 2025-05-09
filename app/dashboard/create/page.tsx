"use client";

import { useState, useEffect } from "react";

import { useSearchParams } from "next/navigation";
import Tiptap from "@/components/Tiptap";
import { useDashboard } from "../../provider";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";

const GamifiedCourse: React.FC = () => {
  const searchParams = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialCategory = searchParams.get("category") || "";

  const { token } = useDashboard();
  const router = useRouter();
  interface UserData {
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
    };
  }

  // interface CoursesData {
  //   courses?: {
  //     title?: string;
  //     category?: string;
  //     description?: string;
  //     lessons?: {
  //       title?: string;
  //       content?: string;
  //       points?: number;
  //     }[];
  //   }[];
  // }

  const [, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Move all state declarations here at the top
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [lessons, setLessons] = useState([
    { title: "", content: "", points: 10 },
  ]);
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    // Early return and redirect if no token
    if (!token) {
      console.log("No token available");
      setLoading(false);
      router.push('/auth/login');
      return;
    }

    const fetchCourseData = async () => {
      try {
        setLoading(true);
        console.log("Fetching course data with token:", token);
        const response = await fetch(
          `/api/course/get?title=${initialTitle}&category=${initialCategory}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store' // Prevent caching
          }
        );
        if (!response.ok) {
          console.log("Error fetching request");
          // Redirect to login for unauthorized access
          if (response.status === 401 || response.status === 403) {
            router.push('/auth/login');
            return;
          }
          setLoading(false);
          return;
        }
        const data = await response.json();
        console.log("Profile data:", data);
        
        // Set user data directly
        setUserData(data?.user);
        
        // Redirect if course already exists
        if (data?.courses?.length > 0) {
          router.push("/dashboard");
          return;
        }
        
        // Initialize title and category after loading is complete (moved here from separate useEffect)
        setTitle(generateTitle(initialTitle));
        setCategory(initialCategory);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Redirect to login if there's an authentication error
        if (error instanceof Error && error.message.includes('unauthorized')) {
          router.push('/auth/login');
          return;
        }
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [initialCategory, initialTitle, router, token]);

  // Prevent flash of content when redirecting
  if (!token) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center w-full h-[50dvh]">
        <Loading/>
      </div>
    );
  }

  function generateTitle(slug: string) {
    // Replace hyphens with spaces and capitalize the first letter of each word
    return slug
      .split("-") // Split the slug into words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join the words with a space
  }

  // Handlers for lessons
  const handleAddLesson = () => {
    setLessons([...lessons, { title: "", content: "", points: 10 }]);
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const handleLessonChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newLessons = [...lessons];
    newLessons[index] = { ...newLessons[index], [field]: value };
    setLessons(newLessons);
  };

  const handleOpenEditor = (index: number) => {
    setEditingLessonIndex(index);
  };

  // const handleSaveContent = (newContent: string) => {
  //   if (editingLessonIndex !== null) {
  //     const newLessons = [...lessons];
  //     newLessons[editingLessonIndex].content = newContent;
  //     setLessons(newLessons);
  //     setEditingLessonIndex(null);
  //   }
  // };

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

    console.log(!title || !category);
    if (
      !title ||
      !category ||
      !description ||
      courseData.lessons.some(
        (lesson) => lesson.content.length === 0 || lesson.content.length === 7
      )
    ) {
      alert("Please fill in all fields and ensure lesson content is valid.");
      return;
    }

    console.log(courseData);
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
        console.log(result);
        alert("Course saved successfully!");
        router.push("/dashboard");
      } else {
        const error = await response.json();

        alert("Failed to save course: " + error.error);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred.");
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
                    <Tiptap
                      content={lesson.content}
                      onChange={(newContent) =>
                        handleLessonChange(index, "content", newContent)
                      }
                    />
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
            className="p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#555555] transition-all duration-200"
          >
            Save Draft
          </button>
          <button
            onClick={handleSaveCourse}
            className="p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#7A3CB8] transition-all duration-200"
          >
            {"Publish Course"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamifiedCourse;
