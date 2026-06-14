import toast, { type ToastOptions } from 'react-hot-toast';

export class ToastService {
    static success(message: string, options?: ToastOptions) {
        toast.success(message, options);
    }

    static error(message: string, options?: ToastOptions) {
        toast.error(message, options);
    }

    static loading(message: string, options?: ToastOptions) {
        return toast.loading(message, options);
    }

    static custom(message: string, options?: ToastOptions) {
        toast(message, options);
    }

    static dismiss(toastId?: string) {
        toast.dismiss(toastId);
    }
}
