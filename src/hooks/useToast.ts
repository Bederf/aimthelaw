import { toast } from 'sonner';

interface ToastOptions {
  duration?: number;
  description?: string;
}

export function useToast() {
  const showToast = {
    success: (message: string, options?: ToastOptions) => {
      toast.success(message, {
        duration: options?.duration || 3000,
        description: options?.description,
      });
    },
    
    error: (message: string, options?: ToastOptions) => {
      toast.error(message, {
        duration: options?.duration || 4000,
        description: options?.description,
      });
    },
    
    info: (message: string, options?: ToastOptions) => {
      toast.info(message, {
        duration: options?.duration || 3000,
        description: options?.description,
      });
    },
    
    warning: (message: string, options?: ToastOptions) => {
      toast.warning(message, {
        duration: options?.duration || 3500,
        description: options?.description,
      });
    },
    
    loading: (message: string) => {
      return toast.loading(message);
    },
    
    promise: async <T>(
      promise: Promise<T>,
      {
        loading = 'Loading...',
        success = 'Success!',
        error = 'Something went wrong',
      }: {
        loading?: string;
        success?: string;
        error?: string;
      } = {}
    ) => {
      return toast.promise(promise, {
        loading,
        success,
        error,
      });
    },
  };

  return showToast;
} 