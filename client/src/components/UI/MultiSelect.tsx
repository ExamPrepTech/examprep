import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    id: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    options,
    selected,
    onChange,
    placeholder = 'Select...',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial check to prevent errors
    // Ensure selected is always an array
    const safeSelected = Array.isArray(selected) ? selected : [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (id: string) => {
        const newSelected = safeSelected.includes(id)
            ? safeSelected.filter(item => item !== id)
            : [...safeSelected, id];
        onChange(newSelected);
    };



    const selectedLabels = options
        .filter(opt => safeSelected.includes(opt.id))
        .map(opt => opt.label);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className="flex items-center justify-between w-full px-3 py-2 text-sm bg-background border border-input rounded-md cursor-pointer ring-offset-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-24px)]">
                    {safeSelected.length === 0 && (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    {safeSelected.length > 0 && (
                        <span className="text-foreground truncate block">
                            {selectedLabels.join(', ')}
                        </span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full min-w-[200px] mt-1 overflow-hidden bg-popover border border-border rounded-md shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="max-h-60 overflow-y-auto p-1">
                        {options.length === 0 ? (
                            <div className="px-2 py-2 text-sm text-muted-foreground text-center">No options</div>
                        ) : (
                            <>
                                <div
                                    className="flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer select-none text-muted-foreground hover:bg-muted font-medium border-b border-border/50 mb-1"
                                    onClick={() => {
                                        if (safeSelected.length === options.length) {
                                            onChange([]);
                                        } else {
                                            onChange(options.map(o => o.id));
                                        }
                                    }}
                                >
                                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${safeSelected.length === options.length
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground opacity-50'
                                        }`}>
                                        {safeSelected.length === options.length && <Check size={12} />}
                                    </div>
                                    <span>Select All</span>
                                </div>
                                {options.map((option) => (
                                    <div
                                        key={option.id}
                                        className={`flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer select-none transition-colors ${safeSelected.includes(option.id)
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'text-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => toggleOption(option.id)}
                                    >
                                        <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${safeSelected.includes(option.id)
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-muted-foreground opacity-50'
                                            }`}>
                                            {safeSelected.includes(option.id) && <Check size={12} />}
                                        </div>
                                        <span>{option.label}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
