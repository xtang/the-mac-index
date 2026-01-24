import { useState, useEffect, useCallback, useRef } from 'react';
import type { Country } from '../types/api';

interface CountryListProps {
    countries: Country[];
    selectedCountry: string | null;
    onSelect: (code: string) => void;
}

export function CountryList({ countries, selectedCountry, onSelect }: CountryListProps) {
    const [focusIndex, setFocusIndex] = useState(0);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusIndex(i => Math.min(i + 1, countries.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            if (countries[focusIndex]) {
                onSelect(countries[focusIndex].code);
            }
        }
    }, [countries, focusIndex, onSelect]);

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Scroll focused item into view
    useEffect(() => {
        if (listRef.current) {
            const focusedEl = listRef.current.children[focusIndex] as HTMLElement;
            focusedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusIndex]);

    return (
        <div className="h-full flex flex-col border-r-2 border-[--color-terminal-grid]">
            <div className="px-3 py-2 border-b border-[--color-terminal-grid] bg-[--color-terminal-bg-alt]">
                <span className="text-[--color-terminal-amber] text-sm font-bold">
                    ► COUNTRIES ({countries.length})
                </span>
            </div>

            <div className="flex-1 overflow-y-auto" ref={listRef}>
                {countries.map((country, index) => (
                    <div
                        key={country.code}
                        className={`
              px-3 py-1.5 cursor-pointer border-b border-[--color-terminal-grid]/30
              flex justify-between items-center text-sm
              ${index === focusIndex ? 'bg-[--color-terminal-green]/20' : ''}
              ${selectedCountry === country.code ? 'text-[--color-terminal-amber]' : ''}
              hover:bg-[--color-terminal-green]/10
            `}
                        onClick={() => onSelect(country.code)}
                    >
                        <span className="flex items-center gap-2">
                            <span className={`w-3 ${index === focusIndex ? 'text-[--color-terminal-green]' : selectedCountry === country.code ? 'text-[--color-terminal-amber]' : 'opacity-0'}`}>
                                {index === focusIndex ? '›' : '▶'}
                            </span>
                            {country.name}
                        </span>
                        <span className="text-[--color-terminal-dim] text-xs">
                            {country.code}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
