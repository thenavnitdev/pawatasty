import { X } from 'lucide-react';

interface FilterModalProps {
  selectedFilters: string[];
  onToggleFilter: (filter: string) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function FilterModal({ selectedFilters, onToggleFilter, onClose, onApply }: FilterModalProps) {
  const filters = [
    { id: 'open', label: 'Open' },
    { id: 'charging_hub', label: 'PB Available' },
    { id: 'returned_slots', label: 'Returned Slots' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col animate-slideUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-slate-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-3">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onToggleFilter(filter.id)}
                className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-all ${
                  selectedFilters.includes(filter.id)
                    ? 'bg-teal-50 text-teal-700 border-2 border-teal-500'
                    : 'bg-gray-50 text-slate-700 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => {
              filters.forEach(f => {
                if (selectedFilters.includes(f.id)) {
                  onToggleFilter(f.id);
                }
              });
            }}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
