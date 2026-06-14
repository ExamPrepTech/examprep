import { useEffect, useState } from 'react';
import { PromptService, type PromptOptions } from '@/services/PromptService';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

export function GlobalPrompt() {
    const [options, setOptions] = useState<PromptOptions | null>(null);

    useEffect(() => {
        return PromptService.subscribe((opts) => {
            setOptions(opts);
        });
    }, []);

    const handleClose = () => {
        setOptions(null);
    };

    if (!options) return null;

    // Helper to determine icon based on variant
    const getIcon = () => {
        switch (options.variant) {
            case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
            case 'error': return <XCircle className="w-5 h-5 text-destructive" />;
            default: return <Info className="w-5 h-5 text-primary" />;
        }
    };

    const Footer = () => (
        <>
            {options.actions?.map((action, index) => (
                <Button 
                    key={index} 
                    variant={action.variant || 'primary'} 
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            ))}
        </>
    );

    return (
        <Modal
            isOpen={!!options}
            onClose={handleClose} 
            hideCloseButton={true}
            title={options.title || 'Notification'}
            footer={<Footer />}
        >
            <div className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">
                    {getIcon()}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {options.message}
                </div>
            </div>
        </Modal>
    );
}
