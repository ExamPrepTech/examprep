import { Maximize2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface FullScreenWarningProps {
    onEnterFullscreen: () => void;
    onCancel: () => void;
}

export function FullScreenWarning({ onEnterFullscreen, onCancel }: FullScreenWarningProps) {
    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border rounded-xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2">
                    <Maximize2 className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Full Screen Required</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        This test must be taken in full-screen mode to ensure integrity. 
                        Switching tabs or exiting full-screen will record a warning.
                    </p>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium mt-4">
                        3 warnings will automatically submit the test.
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <Button onClick={onEnterFullscreen} className="w-full h-12 text-base shadow-lg shadow-primary/20">
                        Enter Full Screen & Start
                    </Button>
                    <Button variant="ghost" onClick={onCancel} className="w-full gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" />
                        Cancel & Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
}
