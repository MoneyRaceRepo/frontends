"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle, HiX } from "react-icons/hi";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const toastStyles: Record<ToastType, { bg: string; border: string; icon: JSX.Element; iconBg: string }> = {
  success: {
    bg: "bg-gradient-to-r from-[#E8F5E8] to-[#D4EDDA]",
    border: "border-[#9BC49B]",
    icon: <HiCheckCircle className="w-6 h-6 text-green-600" />,
    iconBg: "bg-green-100",
  },
  error: {
    bg: "bg-gradient-to-r from-[#FDF2F2] to-[#F8D7DA]",
    border: "border-[#E5A0A0]",
    icon: <HiXCircle className="w-6 h-6 text-red-600" />,
    iconBg: "bg-red-100",
  },
  warning: {
    bg: "bg-gradient-to-r from-[#FFF8E6] to-[#FFF3CD]",
    border: "border-[#D4A84B]",
    icon: <HiExclamationCircle className="w-6 h-6 text-yellow-600" />,
    iconBg: "bg-yellow-100",
  },
  info: {
    bg: "bg-gradient-to-r from-[#E8F4FC] to-[#D1ECF1]",
    border: "border-[#86B7D4]",
    icon: <HiInformationCircle className="w-6 h-6 text-blue-600" />,
    iconBg: "bg-blue-100",
  },
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const style = toastStyles[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  return (
    <div
      className={`${style.bg} ${style.border} border-2 rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-[420px] animate-slide-in`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${style.iconBg} p-2 rounded-xl flex-shrink-0`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 pt-1">
          <h4 className="font-bold text-[#4A3000] text-sm">{toast.title}</h4>
          {toast.message && (
            <p className="text-[#6B4F0F] text-xs mt-1 leading-relaxed">{toast.message}</p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/10 rounded-lg transition-all flex-shrink-0"
        >
          <HiX className="w-4 h-4 text-[#6B4F0F]" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D4A84B] rounded-full animate-progress"
          style={{ animationDuration: `${toast.duration || 4000}ms` }}
        />
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (title: string, message?: string) => showToast("success", title, message);
  const error = (title: string, message?: string) => showToast("error", title, message);
  const warning = (title: string, message?: string) => showToast("warning", title, message);
  const info = (title: string, message?: string) => showToast("info", title, message);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
