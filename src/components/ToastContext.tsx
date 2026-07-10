'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
  exiting?: boolean;
}

interface ToastContextType {
  toast: {
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    warning: (msg: string, duration?: number) => void;
    info: (msg: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Actually remove after slide-out animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = React.useMemo(() => ({
    success: (msg: string, duration?: number) => addToast(msg, 'success', duration),
    error: (msg: string, duration?: number) => addToast(msg, 'error', duration),
    warning: (msg: string, duration?: number) => addToast(msg, 'warning', duration),
    info: (msg: string, duration?: number) => addToast(msg, 'info', duration),
  }), [addToast]);

  // Override window.alert client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.alert = (message: any) => {
        const msgStr = String(message);
        const lower = msgStr.toLowerCase();
        let type: ToastType = 'info';

        if (
          lower.includes('success') ||
          lower.includes('confirm') ||
          lower.includes('complete') ||
          lower.includes('verified') ||
          lower.includes('thank you')
        ) {
          type = 'success';
        } else if (
          lower.includes('fail') ||
          lower.includes('error') ||
          lower.includes('reject') ||
          lower.includes('invalid') ||
          lower.includes('cannot')
        ) {
          type = 'error';
        } else if (
          lower.includes('please') ||
          lower.includes('warning') ||
          lower.includes('attention') ||
          lower.includes('required')
        ) {
          type = 'warning';
        }

        addToast(msgStr, type);
      };
    }
  }, [addToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Portal Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast-item toast-item-${t.type} ${t.exiting ? 'toast-exit' : ''}`}
              role="alert"
            >
              {getIcon(t.type)}
              <div className="flex-1 text-xs font-semibold text-slate-800 leading-relaxed pr-2 whitespace-pre-line">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}
