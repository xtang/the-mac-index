
import { CountryList } from './CountryList';
import type { Country } from '../types/api';

interface MobileCountrySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    countries: Country[];
    selectedCountry: string | null;
    onSelect: (code: string) => void;
}

export function MobileCountrySelector({
    isOpen,
    onClose,
    countries,
    selectedCountry,
    onSelect
}: MobileCountrySelectorProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col animate-in fade-in duration-200"
            style={{ backgroundColor: 'var(--color-terminal-bg)' }}
        >
            <div className="flex items-center justify-between p-4 border-b border-[--color-terminal-grid] bg-[--color-terminal-bg-alt]">
                <span className="text-[--color-terminal-amber] font-bold">SELECT COUNTRY</span>
                <button
                    onClick={onClose}
                    className="p-1 text-[--color-terminal-dim] hover:text-[--color-terminal-red]"
                >
                    <span className="text-xl">[X]</span>
                </button>
            </div>
            <div className="flex-1 overflow-hidden">
                <CountryList
                    countries={countries}
                    selectedCountry={selectedCountry}
                    onSelect={(code) => {
                        onSelect(code);
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}
