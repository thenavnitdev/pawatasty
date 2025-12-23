import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../utils/toastContext';

interface SuggestionsModalProps {
  onClose: () => void;
}

export default function SuggestionsModal({ onClose }: SuggestionsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const { showSuccess } = useToast();

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    if (touchEnd - touchStart > 100) {
      onClose();
    }
  };

  const categories = ['New feature', 'Suggestions', 'Other'];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        alert('Please log in to submit a suggestion');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggestions`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          title: selectedCategory,
          description
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to submit suggestion');
      }

      const result = await response.json();
      console.log('Suggestion submitted successfully:', result);
      showSuccess('Successfully submitted!');
      onClose();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to submit suggestion: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-6 py-6 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#1e293b' }}>Share it with us</h2>

          <p className="text-slate-700 text-center mb-4 text-sm">
            We welcome suggestions and new<br />
            feature ideas.
          </p>

          <div className="w-full mb-4">
            <label className="text-slate-800 font-medium text-sm mb-2 block">
              Select category<span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === category
                      ? 'bg-orange-400 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full mb-4">
            <label className="text-slate-800 font-medium text-sm mb-2 block">
              Describe it here<span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=""
              className="w-full h-32 p-4 border-2 border-orange-400 rounded-2xl focus:outline-none focus:border-orange-500 resize-none text-sm text-slate-700"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedCategory || !description.trim() || isSubmitting}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-4 rounded-[1rem] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
