import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      expand={true}
      richColors
      closeButton
      theme="light"
      className="fixed top-4 z-[100]"
      style={{ position: 'fixed', top: '1rem' }}
    />
  );
} 