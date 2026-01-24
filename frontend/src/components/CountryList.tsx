import { useState, useEffect, useCallback, useRef } from 'react';
import type { Country } from '../types/api';

interface CountryListProps {
    countries: Country[];
    selectedCountry: string | null;
    onSelect: (code: string) => void;
}

export function CountryList({ countries, selectedCountry, onSelect }: CountryListProps) {
    const [focusIndex, setFocusIndex] = useState(0);
    const [filterMode, setFilterMode] = useState(false);
    const [filterText, setFilterText] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter countries based on search text
    const filteredCountries = filterText
        ? countries.filter(c =>
            c.name.toLowerCase().includes(filterText.toLowerCase()) ||
            c.code.toLowerCase().includes(filterText.toLowerCase())
        )
        : countries;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't capture keys if we're in filter input
        if (filterMode && e.target === inputRef.current) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setFilterMode(false);
                setFilterText('');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCountries[focusIndex]) {
                    onSelect(filteredCountries[focusIndex].code);
                }
                setFilterMode(false);
                setFilterText('');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusIndex(i => Math.min(i + 1, filteredCountries.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusIndex(i => Math.max(i - 1, 0));
            }
            return;
        }

        // Global shortcuts (not in filter mode)
        if (e.key === 'f' || e.key === '/') {
            e.preventDefault();
            setFilterMode(true);
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            if (filterMode) {
                setFilterMode(false);
                setFilterText('');
            }
            return;
        }

        // Navigation
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusIndex(i => Math.min(i + 1, filteredCountries.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCountries[focusIndex]) {
                onSelect(filteredCountries[focusIndex].code);
            }
        }
    }, [filterMode, filteredCountries, focusIndex, onSelect]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Focus input when entering filter mode
    useEffect(() => {
        if (filterMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [filterMode]);

    // Reset focus index when filter changes
    useEffect(() => {
        setFocusIndex(0);
    }, [filterText]);

    // Scroll focused item into view
    useEffect(() => {
        if (listRef.current && listRef.current.children[focusIndex]) {
            const focusedEl = listRef.current.children[focusIndex] as HTMLElement;
            focusedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusIndex]);

    return (
        <div className="h-full flex flex-col border-r-2 border-[--color-terminal-green]">
            {/* Header */}
            <div className="px-3 py-2 border-b border-[--color-terminal-grid] bg-[--color-terminal-bg-alt]">
                <div className="flex items-center justify-between">
                    <span className="text-[--color-terminal-amber] text-sm font-bold">
                        ► COUNTRIES ({filteredCountries.length}/{countries.length})
                    </span>
                    {!filterMode && (
                        <span className="text-[--color-terminal-dim] text-xs">[f] filter</span>
                    )}
                </div>
            </div>

            {/* Filter Input */}
            {filterMode && (
                <div className="px-3 py-2 border-b border-[--color-terminal-green] bg-[--color-terminal-bg-alt]">
                    <div className="flex items-center gap-2">
                        <span className="text-[--color-terminal-green]">FILTER:</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-[--color-terminal-green] font-mono"
                            placeholder="type to filter..."
                        />
                        <span className="text-[--color-terminal-dim] text-xs">[ESC]</span>
                    </div>
                </div>
            )}

            {/* Country List */}
            <div className="flex-1 overflow-y-auto" ref={listRef}>
                {filteredCountries.map((country, index) => (
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
                {filteredCountries.length === 0 && (
                    <div className="px-3 py-4 text-[--color-terminal-dim] text-center">
                        NO MATCHES
                    </div>
                )}
            </div>
        </div>
    );
}
