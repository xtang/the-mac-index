import { useState, useEffect } from 'react';
import type { IndexInfo, IndicesResponse } from '../types/api';

interface IndexSelectorProps {
    selectedIndex: string;
    onIndexChange: (indexType: string) => void;
}

export default function IndexSelector({ selectedIndex, onIndexChange }: IndexSelectorProps) {
    const [indices, setIndices] = useState<IndexInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                const response = await fetch('/api/v1/indices');
                const data: IndicesResponse = await response.json();
                setIndices(data.indices);
            } catch (error) {
                console.error('Failed to fetch indices:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchIndices();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-[--color-terminal-green]">
                <span className="text-sm">LOADING<span className="cursor-blink">_</span></span>
            </div>
        );
    }

    // Get selected index info for display
    const selectedIndexInfo = indices.find(idx => idx.type === selectedIndex);

    return (
        <div className="flex flex-col gap-2">
            <select
                value={selectedIndex}
                onChange={(e) => onIndexChange(e.target.value)}
                className="bg-[--color-terminal-bg] border border-[--color-terminal-green] text-[--color-terminal-green] px-3 py-2 font-mono text-sm hover:bg-[--color-terminal-green]/10 focus:outline-none focus:ring-1 focus:ring-[--color-terminal-green] cursor-pointer w-full"
                style={{ fontFamily: 'VT323, monospace' }}
            >
                {indices.map((index) => (
                    <option key={index.type} value={index.type}>
                        {index.name}
                    </option>
                ))}
            </select>
            
            {selectedIndexInfo && (
                <div className="text-[--color-terminal-dim] text-xs" style={{ fontFamily: 'VT323, monospace' }}>
                    {selectedIndexInfo.description}
                </div>
            )}
        </div>
    );
}
