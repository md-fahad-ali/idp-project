interface ICourse {
  _id: string;
  title: string;
  category: string;
  description: string;
  lessons: {
    title: string;
    content: string;
    points: number;
  }[];
  createdAt: string;
}

interface DeleteConfirmationModalProps {
  course: ICourse;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({ 
  course, 
  onCancel, 
  onConfirm 
}: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#00000080] z-[999]">
      <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] w-96">
        <h3 className="text-xl font-bold text-[#E6F1FF] mb-4 font-mono">Delete Course</h3>
        <p className="text-[#E6F1FF] mb-6">
          Are you sure you want to delete <span className="font-bold">{course.title}</span>? This action cannot be undone.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#555555] transition-all duration-200 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 p-2 text-white bg-[#FF4D4D] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000] hover:bg-[#E63939] transition-all duration-200 text-sm font-bold"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
} 