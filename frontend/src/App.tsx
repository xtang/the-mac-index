import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { CountryList } from './components/CountryList';
import { PriceChart } from './components/PriceChart';
import { useApi } from './hooks/useApi';
import type { Country, HistoryResponse } from './types/api';

const API_BASE = 'http://localhost:3000/api/v1';

export type ChartMode = 'price' | 'buying-power' | 'index';

const CHART_MODES: ChartMode[] = ['price', 'buying-power', 'index'];
const MODE_LABELS: Record<ChartMode, string> = {
  'price': 'PRICE (USD + LOCAL)',
  'buying-power': 'BUYING POWER (LOCAL + INDEX)',
  'index': 'INDEX (USD + INDEX)',
};

function App() {
  const { data: countries, loading: countriesLoading } = useApi<Country[]>('/countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('index');

  // Cycle chart mode with 'v' key
  const handleChartModeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
      // Don't trigger if in filter input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      e.preventDefault();
      setChartMode(current => {
        const currentIndex = CHART_MODES.indexOf(current);
        return CHART_MODES[(currentIndex + 1) % CHART_MODES.length];
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleChartModeKey);
    return () => window.removeEventListener('keydown', handleChartModeKey);
  }, [handleChartModeKey]);

  // Select first country by default
  useEffect(() => {
    if (countries && countries.length > 0 && !selectedCountry) {
      setSelectedCountry(countries[0].code);
    }
  }, [countries, selectedCountry]);

  // Fetch history when country changes
  useEffect(() => {
    if (!selectedCountry) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(`${API_BASE}/index/history?country=${selectedCountry}`);
        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [selectedCountry]);

  const selectedCountryName = countries?.find(c => c.code === selectedCountry)?.name || '';

  return (
    <Layout chartMode={chartMode} modeLabel={MODE_LABELS[chartMode]}>
      <div className="h-full flex">
        {/* Left Panel: Country List */}
        <div className="w-64 flex-shrink-0">
          {countriesLoading ? (
            <div className="p-4 text-[--color-terminal-dim]">
              LOADING<span className="cursor-blink">_</span>
            </div>
          ) : (
            <CountryList
              countries={countries || []}
              selectedCountry={selectedCountry}
              onSelect={setSelectedCountry}
            />
          )}
        </div>

        {/* Main Panel: Chart */}
        <div className="flex-1 flex flex-col border-x-2 border-[--color-terminal-grid]">
          {historyLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-2xl text-glow">
                LOADING DATA<span className="cursor-blink">_</span>
              </span>
            </div>
          ) : historyData && historyData.records ? (
            <PriceChart
              countryName={selectedCountryName}
              countryCode={historyData.country}
              records={historyData.records}
              mode={chartMode}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[--color-terminal-dim]">
                SELECT A COUNTRY TO VIEW DATA
              </span>
            </div>
          )}
        </div>

        {/* Right Panel: Stats */}
        <div className="w-72 flex-shrink-0 border-l-2 border-[--color-terminal-grid] p-4">
          <div className="border border-[--color-terminal-green] p-3 mb-4">
            <div className="text-[--color-terminal-amber] text-sm mb-2">► CURRENT SELECTION</div>
            <div className="text-2xl text-glow">
              {selectedCountryName || '---'}
            </div>
            <div className="text-[--color-terminal-dim] text-sm mt-1">
              {selectedCountry || '---'}
            </div>
          </div>

          {historyData && historyData.records && historyData.records.length > 0 && (
            <>
              <div className="border border-[--color-terminal-grid] p-3 mb-4">
                <div className="text-[--color-terminal-dim] text-xs mb-1">LATEST PRICE (USD)</div>
                <div className="text-xl text-[--color-terminal-green]">
                  ${historyData.records[historyData.records.length - 1].dollar_price.toFixed(2)}
                </div>
              </div>

              <div className="border border-[--color-terminal-grid] p-3 mb-4">
                <div className="text-[--color-terminal-dim] text-xs mb-1">VALUATION INDEX</div>
                <div className={`text-xl ${historyData.records[historyData.records.length - 1].raw_index > 0
                  ? 'text-[--color-terminal-red]'
                  : 'text-[--color-terminal-green]'
                  }`}>
                  {(historyData.records[historyData.records.length - 1].raw_index * 100).toFixed(1)}%
                </div>
                <div className="text-[--color-terminal-dim] text-xs mt-1">
                  {historyData.records[historyData.records.length - 1].raw_index > 0
                    ? 'OVERVALUED vs USD'
                    : 'UNDERVALUED vs USD'}
                </div>
              </div>

              <div className="border border-[--color-terminal-grid] p-3">
                <div className="text-[--color-terminal-dim] text-xs mb-1">DATA POINTS</div>
                <div className="text-xl text-[--color-terminal-amber]">
                  {historyData.count}
                </div>
                <div className="text-[--color-terminal-dim] text-xs mt-1">
                  {historyData.records[0].date.slice(0, 4)} - {historyData.records[historyData.records.length - 1].date.slice(0, 4)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default App;
