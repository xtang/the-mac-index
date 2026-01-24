import ReactECharts from 'echarts-for-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import type { HistoryRecord } from '../types/api';
import type { ChartMode, BaseCurrency } from '../App';

interface PriceChartProps {
    countryName: string;
    countryCode: string;
    records: HistoryRecord[];
    mode: ChartMode;
    baseCurrency: BaseCurrency;
}

// Color scheme
const COLORS = {
    usd: '#00FF41',      // Green
    local: '#FFB000',    // Amber
    index: '#00BFFF',    // Cyan
    dim: '#00AA2A',
    grid: '#003B00',
    bg: '#0D1117',
};

// Area gradient colors (with alpha)
const AREA_COLORS = {
    usd: 'rgba(0, 255, 65, 0.3)',
    local: 'rgba(255, 176, 0, 0.3)',
    index: 'rgba(0, 191, 255, 0.3)',
};

export function PriceChart({ countryName, countryCode, records, mode, baseCurrency }: PriceChartProps) {
    const chartRef = useRef<ReactECharts>(null);
    const [cursorIndex, setCursorIndex] = useState<number | null>(null);

    // Keyboard navigation for chart cursor
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Only handle if not in an input and no modifiers (except maybe shift)
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();

            setCursorIndex(current => {
                const maxIndex = records.length - 1;
                let next = current === null ? maxIndex : current;

                if (e.key === 'ArrowLeft') {
                    // Loop to end if at start
                    next = current === null || current === 0 ? maxIndex : current - 1;
                } else {
                    // Loop to start if at end
                    next = current === null || current === maxIndex ? 0 : current + 1;
                }
                return next;
            });
        }
    }, [records.length]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Sync cursor index with ECharts tooltip
    useEffect(() => {
        if (cursorIndex === null || !chartRef.current) return;

        const chart = chartRef.current.getEchartsInstance();
        chart.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: cursorIndex,
        });
        // Also show axis pointer
        chart.dispatchAction({
            type: 'updateAxisPointer',
            seriesIndex: 0,
            dataIndex: cursorIndex,
        });
    }, [cursorIndex]);

    // Reset cursor when data changes
    useEffect(() => {
        setCursorIndex(null);
    }, [countryCode, baseCurrency]);

    // Build chart config based on mode
    const getConfig = () => {
        switch (mode) {
            case 'price':
                return {
                    series1: { name: `${baseCurrency} Price`, data: records.map(r => r.base_price), color: COLORS.usd, areaColor: AREA_COLORS.usd },
                    series2: { name: 'Local Price', data: records.map(r => r.local_price), color: COLORS.local },
                    yAxis1: { name: baseCurrency, color: COLORS.usd, formatter: null },
                    yAxis2: { name: 'LOCAL', color: COLORS.local, formatter: null },
                };
            case 'buying-power':
                return {
                    series1: { name: 'Local Price', data: records.map(r => r.local_price), color: COLORS.local, areaColor: AREA_COLORS.local },
                    series2: { name: 'Index', data: records.map(r => r.raw_index), color: COLORS.index },
                    yAxis1: { name: 'LOCAL', color: COLORS.local, formatter: null },
                    yAxis2: { name: 'INDEX %', color: COLORS.index, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
                };
            case 'index':
            default:
                return {
                    series1: { name: `${baseCurrency} Price`, data: records.map(r => r.base_price), color: COLORS.usd, areaColor: AREA_COLORS.usd },
                    series2: { name: 'Index', data: records.map(r => r.raw_index), color: COLORS.index },
                    yAxis1: { name: baseCurrency, color: COLORS.usd, formatter: null },
                    yAxis2: { name: 'INDEX %', color: COLORS.index, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
                };
        }
    };

    const config = getConfig();

    const option = {
        backgroundColor: 'transparent',
        grid: {
            top: 60,
            right: 80,
            bottom: 130,
            left: 80,
        },
        title: {
            text: `BIG MAC: ${countryName.toUpperCase()} (${countryCode}) vs ${baseCurrency}`,
            textStyle: {
                color: '#FFB000',
                fontFamily: 'VT323, monospace',
                fontSize: 18,
            },
            left: 'center',
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: COLORS.bg,
            borderColor: COLORS.usd,
            borderWidth: 1,
            textStyle: {
                color: COLORS.usd,
                fontFamily: 'VT323, monospace',
            },
            formatter: (params: any) => {
                const p = params[0];
                const record = records[p.dataIndex];
                return `
          <div style="padding: 8px;">
            <div style="color: #FFB000; margin-bottom: 4px;">${record.date}</div>
            <div style="color: ${COLORS.usd};">${baseCurrency}: ${record.base_price.toFixed(2)}</div>
            <div style="color: ${COLORS.local};">Local: ${record.local_price.toFixed(2)}</div>
            <div style="color: ${COLORS.index};">Index: ${(record.raw_index * 100).toFixed(1)}%</div>
          </div>
        `;
            },
        },
        xAxis: {
            type: 'category',
            data: records.map(r => r.date.slice(0, 7)),
            axisLine: { lineStyle: { color: COLORS.grid } },
            axisLabel: {
                color: COLORS.dim,
                fontFamily: 'VT323, monospace',
                rotate: 45,
            },
            splitLine: { show: false },
        },
        yAxis: [
            {
                type: 'value',
                name: config.yAxis1.name,
                position: 'left',
                nameTextStyle: { color: config.yAxis1.color, fontFamily: 'VT323, monospace' },
                axisLine: { lineStyle: { color: COLORS.grid } },
                axisLabel: {
                    color: config.yAxis1.color,
                    fontFamily: 'VT323, monospace',
                    ...(config.yAxis1.formatter && { formatter: config.yAxis1.formatter })
                },
                splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
            },
            {
                type: 'value',
                name: config.yAxis2.name,
                position: 'right',
                nameTextStyle: { color: config.yAxis2.color, fontFamily: 'VT323, monospace' },
                axisLine: { lineStyle: { color: COLORS.grid } },
                axisLabel: {
                    color: config.yAxis2.color,
                    fontFamily: 'VT323, monospace',
                    ...(config.yAxis2.formatter && { formatter: config.yAxis2.formatter })
                },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: config.series1.name,
                type: 'line',
                step: 'middle',
                data: config.series1.data,
                lineStyle: { color: config.series1.color, width: 2 },
                itemStyle: { color: config.series1.color },
                showSymbol: false,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: config.series1.areaColor },
                            { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                        ],
                    },
                },
            },
            {
                name: config.series2.name,
                type: 'line',
                step: 'middle',
                yAxisIndex: 1,
                data: config.series2.data,
                lineStyle: { color: config.series2.color, width: 2 },
                itemStyle: { color: config.series2.color },
                showSymbol: false,
            },
        ],
        legend: {
            data: [config.series1.name, config.series2.name],
            textStyle: { color: COLORS.dim, fontFamily: 'VT323, monospace' },
            bottom: 10,
            left: 'center',
            orient: 'horizontal',
        },
    };

    return (
        <div className="h-full p-4">
            <ReactECharts
                ref={chartRef}
                key={mode}
                option={option}
                style={{ height: '100%' }}
                notMerge={true}
            />
        </div>
    );
}
