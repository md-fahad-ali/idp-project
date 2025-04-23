import { AlertTriangle, X } from 'lucide-react';

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
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[999] p-4">
      <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[var(--card-shadow)] w-full max-w-md card animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="mb-4 flex items-center">
          <div className="w-10 h-10 bg-[#fee2e2] flex items-center justify-center rounded-full border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)] mr-3">
            <AlertTriangle size={20} className="text-[#ef4444]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-color)] font-mono">Delete Course</h3>
          
          <button 
            onClick={onCancel}
            className="ml-auto bg-[var(--card-bg)] border-2 border-[var(--card-border)] p-1 rounded-md hover:bg-[var(--background-color)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="mb-6 bg-[var(--background-color)] border-2 border-[var(--card-border)] rounded-md p-3">
          <p className="text-[var(--text-color)] font-medium mb-1">
            {course.title}
          </p>
          <p className="text-[var(--text-color)] text-sm opacity-80">
            {course.description.length > 100 ? `${course.description.slice(0, 100)}...` : course.description}
          </p>
        </div>
        
        <p className="text-[var(--text-color)] mb-6">
          Are you sure you want to delete this course? This action <span className="font-bold">cannot be undone</span>.
        </p>
        
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
          <button
            onClick={onCancel}
            className="flex-1 p-2 text-[var(--text-color)] bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 p-2 text-white bg-[#ef4444] border-2 border-[var(--card-border)] rounded-md shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
} 