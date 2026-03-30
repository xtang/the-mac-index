import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { CountryList } from './components/CountryList';
import { PriceChart } from './components/PriceChart';
import { MobileCountrySelector } from './components/MobileCountrySelector';
import IndexSelector from './components/IndexSelector';
import { useApi } from './hooks/useApi';
import type { HistoryResponse, CountriesResponse } from './types/api';

const API_BASE = '/api/v1';

export type ChartMode = 'price' | 'buying-power' | 'index';
export type BaseCurrency = 'USD' | 'CNY' | 'EUR' | 'GBP' | 'JPY';

const CHART_MODES: ChartMode[] = ['price', 'buying-power', 'index'];
const BASE_CURRENCIES: BaseCurrency[] = ['USD', 'CNY', 'EUR', 'GBP', 'JPY'];

const getModeLabels = (base: BaseCurrency): Record<ChartMode, string> => ({
  'price': `PRICE (${base} + LOCAL)`,
  'buying-power': 'BUYING POWER (LOCAL + INDEX)',
  'index': `INDEX (${base} + INDEX)`,
});



function App() {
  const [selectedIndex, setSelectedIndex] = useState<string>('bigmac');
  const { data: countriesData, loading: countriesLoading } = useApi<CountriesResponse>(`/countries?type=${selectedIndex}`);
  const countries = countriesData?.countries || [];
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('index');
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>('USD');
  const [windowDims, setWindowDims] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Monitor window resize
  useEffect(() => {
    const handleResize = () => setWindowDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Console Easter Egg
  const easterEggPrinted = useRef(false);
  useEffect(() => {
    if (easterEggPrinted.current) return;
    easterEggPrinted.current = true;

    const asciiArt = `
          _..-""""""-.._
        .'              '.
       /   .      .       \\
      ;   .      .      .  ;
      |                    |
      | ...................|
      |____________________|
       _/_/_/_/_/_/_/_/_/_/
      |____________________|
       _/_/_/_/_/_/_/_/_/_/
      |____________________|
      |                    |
      |____________________|
`;

    const readmeContent = `
PURCHASING POWER TERMINAL v1.0.0

[INTRODUCTION]
A terminal-based interface for visualizing global purchasing power
disparities using the Big Mac Index. 

COMPARE >> VALUATION >> BUYING POWER

[STACK]
> Frontend: React (Vite) + Tailwind + ECharts
> Backend:  Go (Fiber) + DuckDB
> Deploy:   Docker + Caddy + GitHub Actions

[USAGE]
1. Select Country (Desktop: Click / Mobile: Tap)
2. View Local Price vs Base Currency
3. Analyze Purchasing Power Parity

[CREDITS]
> Design:   Classic Terminal Aesthetics
> Data:     The Economist Big Mac Index
> Code:     TOTALLY DONE BY ANTIGRAVITY`;

    console.log('%c' + asciiArt, 'color: #ffb700; font-weight: bold;');
    console.log('%c' + readmeContent, 'color: #00ff00; font-family: monospace;');
    console.log('%chttps://github.com/xtang/the-mac-index', 'color: #00aaff; text-decoration: underline;');
    console.log('%cHave fun!', 'color: #ff00ff; font-weight: bold; font-size: 14px;');
  }, []);

  // Cycle chart mode with 'v' key, base currency with 'b' key (Desktop only)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if in filter input
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.ctrlKey || e.metaKey) return;

    if (e.key === 'v') {
      e.preventDefault();
      setChartMode(current => {
        const currentIndex = CHART_MODES.indexOf(current);
        return CHART_MODES[(currentIndex + 1) % CHART_MODES.length];
      });
    } else if (e.key === 'b') {
      e.preventDefault();
      setBaseCurrency(current => {
        const currentIndex = BASE_CURRENCIES.indexOf(current);
        return BASE_CURRENCIES[(currentIndex + 1) % BASE_CURRENCIES.length];
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handler for index change - clear selected country and refetch
  const handleIndexChange = (newIndex: string) => {
    setSelectedIndex(newIndex);
    setSelectedCountry(null);
    setHistoryData(null);
  };

  // Select first country by default
  useEffect(() => {
    if (countries && countries.length > 0 && !selectedCountry) {
      const defaultCountry = countries.find(c => c.code === 'CHN') || countries[0];
      setSelectedCountry(defaultCountry.code);
    }
  }, [countries, selectedCountry]);

  // Fetch history
  useEffect(() => {
    if (!selectedCountry) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(`${API_BASE}/index/history?country=${selectedCountry}&base=${baseCurrency}&type=${selectedIndex}`);
        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [selectedCountry, baseCurrency, selectedIndex]);

  const selectedCountryName = countries?.find(c => c.code === selectedCountry)?.name || '';

  // Layout Logic
  const isMobile = windowDims.width < 1024;
  const isLandscape = windowDims.width > windowDims.height;

  // Mobile Landscape: Full Screen Chart (Stock App Style)
  const isMobileLandscape = isMobile && isLandscape;
  // Mobile Portrait: Chart top + Bottom Stats
  const isMobilePortrait = isMobile && !isLandscape;

  // Chart Component (Reusable)
  const renderChart = () => (
    <div className="flex-1 flex flex-col border-x-2 border-[--color-terminal-grid] h-full">
      {historyLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-2xl text-glow">LOADING DATA<span className="cursor-blink">_</span></span>
        </div>
      ) : historyData && historyData.records ? (
        <PriceChart
          countryName={selectedCountryName}
          countryCode={historyData.country}
          records={historyData.records}
          mode={chartMode}
          baseCurrency={baseCurrency}
          indexType={selectedIndex}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[--color-terminal-dim]">
          SELECT A COUNTRY
        </div>
      )}
    </div>
  );

  // Stats Component (Reusable)
  const renderStats = (isCompact = false) => (
    <div className="p-4 flex flex-col h-full overflow-y-auto">
      {/* Index Selector Block */}
      <div className="border border-[--color-terminal-green] p-3 mb-4">
        <div className="text-[--color-terminal-green] text-sm mb-2">► COMMODITY INDEX</div>
        <IndexSelector
          selectedIndex={selectedIndex}
          onIndexChange={handleIndexChange}
        />
      </div>

      {/* Settings Block */}
      <div className="border border-[--color-terminal-amber] p-3 mb-4">
        <div className="text-[--color-terminal-amber] text-sm mb-2">► BASE CURRENCY [b]</div>
        <div className={`${isCompact ? 'text-xl' : 'text-2xl'} text-glow mb-2`}>
          {baseCurrency}
        </div>
        <div className="flex gap-1 flex-wrap">
          {BASE_CURRENCIES.map(currency => (
            <button
              key={currency}
              onClick={() => setBaseCurrency(currency)}
              className={`px-2 py-1 text-xs border ${baseCurrency === currency
                ? 'border-[--color-terminal-green] text-[--color-terminal-green] bg-[--color-terminal-green]/20'
                : 'border-[--color-terminal-grid] text-[--color-terminal-dim]'}`}
            >
              {currency}
            </button>
          ))}
        </div>
      </div>

      {/* Current Info */}
      <div
        onClick={() => isCompact && setIsMobileModalOpen(true)}
        className={`border border-[--color-terminal-green] p-3 mb-4 transition-colors ${isCompact ? 'cursor-pointer hover:bg-[--color-terminal-green]/10 active:bg-[--color-terminal-green]/20' : ''}`}
      >
        <div className={`text-[--color-terminal-amber] ${isCompact ? 'text-xs' : 'text-sm'} mb-2`}>
          ► CURRENT SELECTION {isCompact && <span className="animate-pulse">[TAP TO CHANGE]</span>}
        </div>
        <div className={`${isCompact ? 'text-lg' : 'text-2xl'} text-glow`}>{selectedCountryName || '---'}</div>
        <div className="text-[--color-terminal-dim] text-sm mt-1">{selectedCountry || '---'}</div>
      </div>

      {/* Stats */}
      {historyData && historyData.records && historyData.records.length > 0 && (
        <>
          <div className="border border-[--color-terminal-grid] p-3 mb-4">
            <div className={`text-[--color-terminal-dim] ${isCompact ? 'text-[10px]' : 'text-xs'} mb-1`}>LATEST PRICE (LOCAL)</div>
            <div className={`${isCompact ? 'text-base' : 'text-xl'} text-[--color-terminal-green]`}>
              {historyData.records[historyData.records.length - 1].local_price.toFixed(2)}
            </div>
          </div>

          <div className="border border-[--color-terminal-grid] p-3 mb-4">
            <div className={`text-[--color-terminal-dim] ${isCompact ? 'text-[10px]' : 'text-xs'} mb-1`}>VALUATION vs {baseCurrency}</div>
            <div className={`${isCompact ? 'text-base' : 'text-xl'} ${historyData.records[historyData.records.length - 1].raw_index > 0 ? 'text-[--color-terminal-red]' : 'text-[--color-terminal-green]'}`}>
              {(historyData.records[historyData.records.length - 1].raw_index * 100).toFixed(1)}%
            </div>
            <div className="text-[--color-terminal-dim] text-xs mt-1">
              {historyData.records[historyData.records.length - 1].raw_index > 0
                ? `OVERVALUED vs ${baseCurrency}`
                : `UNDERVALUED vs ${baseCurrency}`}
            </div>
          </div>

          {!isCompact && (
            <div className="border border-[--color-terminal-grid] p-3">
              <div className="text-[--color-terminal-dim] text-xs mb-1">DATA POINTS</div>
              <div className="text-xl text-[--color-terminal-amber]">
                {historyData.count}
              </div>
              <div className="text-[--color-terminal-dim] text-xs mt-1">
                {historyData.records[0].date.slice(0, 4)} - {historyData.records[historyData.records.length - 1].date.slice(0, 4)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // 1. Mobile Landscape (Full Screen Chart)
  if (isMobileLandscape) {
    return (
      <div className="h-screen w-screen bg-[--color-terminal-bg] flex flex-col overflow-hidden">
        <div className="crt-overlay" />
        {renderChart()}
      </div>
    );
  }

  // 2. Mobile Portrait
  if (isMobilePortrait) {
    return (
      <Layout chartMode={chartMode} modeLabel={getModeLabels(baseCurrency)[chartMode]} hideShortcuts={true}>
        <div className="h-full flex flex-col">
          {/* Top Chart Area (70%) */}
          <div className="flex-[7] min-h-0">
            {renderChart()}
          </div>

          {/* Bottom Stats Area (30%) */}
          <div className="flex-[3] border-t-2 border-[--color-terminal-grid] bg-[--color-terminal-bg-alt] min-h-0 overflow-hidden relative">
            {renderStats(true)}
          </div>

          {/* Country Modal */}
          <MobileCountrySelector
            isOpen={isMobileModalOpen}
            onClose={() => setIsMobileModalOpen(false)}
            countries={countries || []}
            selectedCountry={selectedCountry}
            onSelect={setSelectedCountry}
          />
        </div>
      </Layout>
    );
  }

  // 3. Desktop Layout
  return (
    <Layout chartMode={chartMode} modeLabel={getModeLabels(baseCurrency)[chartMode]}>
      <div className="h-full flex">
        {/* Left Panel: Country List */}
        <div className="w-64 flex-shrink-0">
          {countriesLoading ? (
            <div className="p-4 text-[--color-terminal-dim]">LOADING<span className="cursor-blink">_</span></div>
          ) : (
            <CountryList
              countries={countries || []}
              selectedCountry={selectedCountry}
              onSelect={setSelectedCountry}
            />
          )}
        </div>

        {/* Main Panel: Chart */}
        {renderChart()}

        {/* Right Panel: Stats & Settings */}
        <div className="w-72 flex-shrink-0 border-l-2 border-[--color-terminal-grid] overflow-y-auto">
          {renderStats()}
        </div>
      </div>
    </Layout>
  );
}

export default App;
