export interface Country {
    code: string;
    name: string;
    currency: string;
}

export interface HistoryRecord {
    date: string;
    local_price: number;
    dollar_price: number;
    base_price: number;
    exchange_rate: number;
    raw_index: number;
}

export interface HistoryResponse {
    country: string;
    base: string;
    records: HistoryRecord[];
    count: number;
}

export interface PPPRequest {
    amount: number;
    currency: string;
    year: number;
    target_year: number;
}

export interface PPPResult {
    original_amount: number;
    original_currency: string;
    source_year: number;
    target_year: number;
    source_price: number;
    target_price: number;
    equivalent_amount: number;
    purchasing_power_change: number;
}
