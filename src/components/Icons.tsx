import React from 'react';

// A.M. Reddy Memorial College of Pharmacy Logo Emblem
// High-quality SVG styled with gradients, academic shield, and pharmacy symbol
export const CollegeLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 80 }) => {
  return (
    <img
      src="/logo.png"
      alt="AMRMCP Logo"
      width={size}
      height={size}
      className={`object-contain drop-shadow-md ${className}`}
    />
  );
};

// Simple Loading Spinner Overlay
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <div className="glass p-8 rounded-2xl flex flex-col items-center shadow-xl border border-white/10 max-w-sm">
        {/* Spinner */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-primary-200/50 dark:border-navy-700/50"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 border-r-primary-500 animate-spin"></div>
        </div>
        <p className="text-navy-900 dark:text-white font-medium text-center animate-pulse-subtle">
          {message}
        </p>
      </div>
    </div>
  );
};
