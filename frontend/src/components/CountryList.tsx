import { useState, useEffect, useCallback } from 'react';
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

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="h-full flex flex-col border-r-2 border-[--color-terminal-grid]">
            <div className="px-3 py-2 border-b border-[--color-terminal-grid] bg-[--color-terminal-bg-alt]">
                <span className="text-[--color-terminal-amber] text-sm font-bold">
                    ► COUNTRIES ({countries.length})
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
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
                            {selectedCountry === country.code && (
                                <span className="text-[--color-terminal-amber]">▶</span>
                            )}
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
