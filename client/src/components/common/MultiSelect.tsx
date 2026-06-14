import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export function MultiSelect({
  label,
  placeholder = 'Select options',
  options,
  selected,
  onChange,
  className
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = options
    .filter(opt => selected.includes(opt.value))
    .map(opt => opt.label);

  const displayValue = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selectedLabels[0] 
      : `${selected.length} selected`;

  return (
    <div className={cn("relative font-sans", className)} ref={containerRef}>
      {label && <label className="block text-sm font-medium mb-1.5">{label}</label>}
      <div
        className={cn(
          "flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
          isOpen ? "ring-2 ring-ring ring-offset-2" : ""
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate mr-2">
           <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
             {displayValue}
           </span>
        </div>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <div 
              role="button" 
              onClick={handleClear} 
              className="rounded-full p-0.5 hover:bg-muted text-muted-foreground transition-colors mr-1"
            >
              <X className="h-3 w-3" />
            </div>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="max-h-60 overflow-auto p-1">
            {options.length === 0 ? (
               <div className="p-2 text-sm text-muted-foreground text-center">No options found.</div>
            ) : (
                options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                        isSelected ? "bg-accent/50" : ""
                      )}
                      onClick={() => toggleOption(option.value)}
                    >
                      <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                        <Check className={cn("h-3 w-3", isSelected ? "visible" : "invisible")} />
                      </div>
                      <span>{option.label}</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
