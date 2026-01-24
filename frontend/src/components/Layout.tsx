import { ReactNode, useState, useEffect } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
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
            <header className="flex items-center justify-between px-4 py-2 border-b-2 border-[--color-terminal-green] bg-[--color-terminal-bg-alt]">
                <div className="flex items-center gap-4">
                    <span className="text-[--color-terminal-amber] font-bold text-lg tracking-wider">
                        PPT TERMINAL
                    </span>
                    <span className="text-[--color-terminal-dim]">|</span>
                    <span className="text-sm">PURCHASING POWER INDEX v0.1</span>
                </div>

                <div className="flex items-center gap-6">
                    <span className="text-[--color-terminal-dim] text-sm">
                        DATA: BIG MAC INDEX
                    </span>
                    <span className="text-[--color-terminal-dim]">|</span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[--color-terminal-green] animate-pulse" />
                        <span className="text-sm">CONNECTED</span>
                    </span>
                    <span className="text-[--color-terminal-dim]">|</span>
                    <span className="text-[--color-terminal-amber] font-bold tracking-wider">
                        {formatTime(time)}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>

            {/* Bottom Status Bar */}
            <footer className="px-4 py-1 border-t border-[--color-terminal-grid] bg-[--color-terminal-bg-alt] text-sm text-[--color-terminal-dim]">
                <div className="flex justify-between">
                    <span>SOURCE: THE ECONOMIST</span>
                    <span>↑↓ NAVIGATE | ENTER SELECT | ESC BACK</span>
                </div>
            </footer>
        </div>
    );
}
