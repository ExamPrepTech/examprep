import { type ReactNode } from 'react';

export interface PromptAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
}

export interface PromptOptions {
    title?: string;
    message: ReactNode | string;
    actions?: PromptAction[];
    variant?: 'default' | 'error' | 'warning';
}

type PromptListener = (options: PromptOptions | null) => void;

export class PromptService {
    private static listeners: PromptListener[] = [];

    static subscribe(listener: PromptListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private static notify(options: PromptOptions | null) {
        this.listeners.forEach(listener => listener(options));
    }

    /**
     * Show a custom prompt with full control over options
     */
    static show(options: PromptOptions) {
        this.notify(options);
    }

    /**
     * Close the currently open prompt
     */
    static close() {
        this.notify(null);
    }

    /**
     * Show a simple alert dialog with an OK button
     */
    static alert(message: string, title: string = 'Alert') {
        this.show({
            title,
            message,
            actions: [
                { label: 'OK', onClick: () => this.close(), variant: 'primary' }
            ]
        });
    }

    /**
     * Show a warning dialog with an OK button
     */
    static warn(message: string, title: string = 'Warning') {
        this.show({
            title,
            message,
            variant: 'warning',
            actions: [
                { label: 'I Understand', onClick: () => this.close(), variant: 'primary' } // or a warning-specific variant if available
            ]
        });
    }

    /**
     * Show an error dialog with an OK button
     */
    static error(message: string, title: string = 'Error') {
        this.show({
            title,
            message,
            variant: 'error',
            actions: [
                { label: 'Close', onClick: () => this.close(), variant: 'destructive' }
            ]
        });
    }

    /**
     * Show a confirmation dialog with Confirm/Cancel buttons
     */
    static confirm(
        message: string, 
        onConfirm: () => void, 
        title: string = 'Confirm',
        confirmLabel: string = 'Confirm',
        cancelLabel: string = 'Cancel'
    ) {
        this.show({
            title,
            message,
            actions: [
                { 
                    label: cancelLabel, 
                    onClick: () => this.close(), 
                    variant: 'ghost' 
                },
                { 
                    label: confirmLabel, 
                    onClick: () => {
                        this.close();
                        onConfirm();
                    }, 
                    variant: 'primary' 
                }
            ]
        });
    }
}
