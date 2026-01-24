import { type ReactNode, useState, useEffect } from 'react';

interface LayoutProps {
    children: ReactNode;
    chartMode?: string;
    modeLabel?: string;
    hideShortcuts?: boolean;
}

export function Layout({ children, modeLabel, hideShortcuts = false }: LayoutProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (d: Date) => {
        return d.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="h-screen flex flex-col bg-[--color-terminal-bg]">
            {/* CRT Overlay */}
            <div className="crt-overlay" />

            {/* Top Status Bar */}
            <header className="flex items-center justify-between px-4 py-2 border-b-2 border-[--color-terminal-green] bg-[--color-terminal-bg-alt] overflow-hidden whitespace-nowrap">
                <div className="flex items-center gap-4">
                    <span className="text-[--color-terminal-amber] font-bold text-lg tracking-wider hidden md:inline">
                        PPT TERMINAL
                    </span>
                    <span className="text-[--color-terminal-dim] hidden md:inline">|</span>
                    <span className="text-sm hidden md:inline">PURCHASING POWER INDEX v0.1</span>

                    {/* Mobile Only Title */}
                    <span className="text-[--color-terminal-dim] text-sm md:hidden">
                        BIG MAC INDEX
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <span className="text-[--color-terminal-dim] text-sm hidden md:inline">
                        DATA: BIG MAC INDEX
                    </span>
                    <span className="text-[--color-terminal-dim] hidden md:inline">|</span>
                    {modeLabel && (
                        <>
                            <span className="text-[--color-terminal-green] text-sm text-xs md:text-sm truncate max-w-[150px] md:max-w-none">
                                VIEW: {modeLabel}
                            </span>
                            <span className="text-[--color-terminal-dim] hidden md:inline">|</span>
                        </>
                    )}
                    <span className="flex items-center gap-2 hidden md:flex">
                        <span className="w-2 h-2 bg-[--color-terminal-green] animate-pulse" />
                        <span className="text-sm">CONNECTED</span>
                    </span>
                    <span className="text-[--color-terminal-dim] hidden md:inline">|</span>
                    <span className="text-[--color-terminal-amber] font-bold tracking-wider hidden md:inline">
                        {formatTime(time)}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>

            {/* Bottom Status Bar */}
            {/* Bottom Status Bar */}
            <footer className="px-4 py-1 border-t border-[--color-terminal-grid] bg-[--color-terminal-bg-alt] text-sm">
                <div className="flex justify-between">
                    <span className="text-[--color-terminal-dim]">SOURCE: THE ECONOMIST</span>
                    {!hideShortcuts && (
                        <div className="flex items-center gap-3 text-[--color-terminal-dim]">
                            <span><span className="text-[--color-terminal-amber]">[↑↓]</span> NAV</span>
                            <span><span className="text-[--color-terminal-amber]">[f]</span> FILTER</span>
                            <span><span className="text-[--color-terminal-amber]">[v]</span> VIEW</span>
                            <span><span className="text-[--color-terminal-amber]">[←→]</span> DATA</span>
                            <span><span className="text-[--color-terminal-amber]">[b]</span> BASE</span>
                            <span><span className="text-[--color-terminal-amber]">[ESC]</span> CLEAR</span>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
