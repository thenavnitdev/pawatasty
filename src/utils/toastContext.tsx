import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type: 'success', message };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  const showError = useCallback((message: string) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type: 'error', message };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      showSuccess(message);
    } else {
      showError(message);
    }
  }, [showSuccess, showError]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showToast }}>
      {children}

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-[90%] sm:max-w-md px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-sm animate-toast-slide-down w-full ${
              toast.type === 'success'
                ? 'bg-green-50/95 border-2 border-green-200'
                : 'bg-red-50/95 border-2 border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}

            <p
              className={`flex-1 font-medium ${
                toast.type === 'success' ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {toast.message}
            </p>

            <button
              onClick={() => removeToast(toast.id)}
              className={`p-1 rounded-full transition-colors ${
                toast.type === 'success'
                  ? 'hover:bg-green-100'
                  : 'hover:bg-red-100'
              }`}
            >
              <X
                className={`w-4 h-4 ${
                  toast.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
