import ReactECharts from 'echarts-for-react';
import type { HistoryRecord } from '../types/api';

interface PriceChartProps {
    countryName: string;
    countryCode: string;
    records: HistoryRecord[];
}

export function PriceChart({ countryName, countryCode, records }: PriceChartProps) {
    const option = {
        backgroundColor: 'transparent',
        grid: {
            top: 60,
            right: 40,
            bottom: 130,
            left: 80,
        },
        title: {
            text: `BIG MAC INDEX: ${countryName.toUpperCase()} (${countryCode})`,
            textStyle: {
                color: '#FFB000',
                fontFamily: 'VT323, monospace',
                fontSize: 18,
            },
            left: 'center',
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0D1117',
            borderColor: '#00FF41',
            borderWidth: 1,
            textStyle: {
                color: '#00FF41',
                fontFamily: 'VT323, monospace',
            },
            formatter: (params: any) => {
                const p = params[0];
                const record = records[p.dataIndex];
                return `
          <div style="padding: 8px;">
            <div style="color: #FFB000;">${record.date}</div>
            <div>USD Price: $${record.dollar_price.toFixed(2)}</div>
            <div>Local: ${record.local_price.toFixed(2)}</div>
            <div>Index: ${(record.raw_index * 100).toFixed(1)}%</div>
          </div>
        `;
            },
        },
        xAxis: {
            type: 'category',
            data: records.map(r => r.date.slice(0, 7)),
            axisLine: { lineStyle: { color: '#003B00' } },
            axisLabel: {
                color: '#00AA2A',
                fontFamily: 'VT323, monospace',
                rotate: 45,
            },
            splitLine: { show: false },
        },
        yAxis: [
            {
                type: 'value',
                name: 'USD PRICE',
                nameTextStyle: { color: '#00FF41', fontFamily: 'VT323, monospace' },
                axisLine: { lineStyle: { color: '#003B00' } },
                axisLabel: { color: '#00FF41', fontFamily: 'VT323, monospace' },
                splitLine: { lineStyle: { color: '#003B00', type: 'dashed' } },
            },
            {
                type: 'value',
                name: 'INDEX %',
                nameTextStyle: { color: '#FFB000', fontFamily: 'VT323, monospace' },
                axisLine: { lineStyle: { color: '#003B00' } },
                axisLabel: {
                    color: '#FFB000',
                    fontFamily: 'VT323, monospace',
                    formatter: (v: number) => `${(v * 100).toFixed(0)}%`
                },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: 'USD Price',
                type: 'line',
                step: 'middle',
                data: records.map(r => r.dollar_price),
                lineStyle: { color: '#00FF41', width: 2 },
                itemStyle: { color: '#00FF41' },
                showSymbol: false,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(0, 255, 65, 0.3)' },
                            { offset: 1, color: 'rgba(0, 255, 65, 0)' },
                        ],
                    },
                },
            },
            {
                name: 'Raw Index',
                type: 'line',
                step: 'middle',
                yAxisIndex: 1,
                data: records.map(r => r.raw_index),
                lineStyle: { color: '#FFB000', width: 2 },
                itemStyle: { color: '#FFB000' },
                showSymbol: false,
            },
        ],
        legend: {
            data: ['USD Price', 'Raw Index'],
            textStyle: { color: '#00AA2A', fontFamily: 'VT323, monospace' },
            bottom: 10,
            left: 'center',
            orient: 'horizontal',
        },
    };

    return (
        <div className="h-full p-4">
            <ReactECharts option={option} style={{ height: '100%' }} />
        </div>
    );
}
