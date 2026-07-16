import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto close after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgColor = 'bg-white border-green-200 dark:bg-navy-900 dark:border-green-900/50';
          let textColor = 'text-green-800 dark:text-green-200';
          let iconColor = 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400';
          let borderLeft = 'border-l-4 border-l-green-500';
          let iconSvg = (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          );

          if (toast.type === 'error') {
            bgColor = 'bg-white border-red-200 dark:bg-navy-900 dark:border-red-900/50';
            textColor = 'text-red-800 dark:text-red-200';
            iconColor = 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400';
            borderLeft = 'border-l-4 border-l-red-500';
            iconSvg = (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            );
          } else if (toast.type === 'warning') {
            bgColor = 'bg-white border-yellow-200 dark:bg-navy-900 dark:border-yellow-900/50';
            textColor = 'text-yellow-800 dark:text-yellow-200';
            iconColor = 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400';
            borderLeft = 'border-l-4 border-l-yellow-500';
            iconSvg = (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            );
          } else if (toast.type === 'info') {
            bgColor = 'bg-white border-blue-200 dark:bg-navy-900 dark:border-blue-900/50';
            textColor = 'text-blue-800 dark:text-blue-200';
            iconColor = 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
            borderLeft = 'border-l-4 border-l-blue-500';
            iconSvg = (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            );
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center p-4 rounded-xl border shadow-lg ${bgColor} ${borderLeft} pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in-bottom`}
              role="alert"
            >
              {/* Icon */}
              <div className={`flex items-center justify-center p-1.5 rounded-lg mr-3 ${iconColor}`}>
                {iconSvg}
              </div>

              {/* Message */}
              <div className={`flex-1 text-sm font-medium ${textColor}`}>
                {toast.message}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 inline-flex text-navy-400 hover:text-navy-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
