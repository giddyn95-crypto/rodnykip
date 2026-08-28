import { useEffect, useRef, useState } from 'react';

export const DERIV_MARKETS = [
    'R_10',
    'R_25',
    'R_50',
    'R_75',
    'R_100',
    '1HZ10V',
    '1HZ25V',
    '1HZ50V',
    '1HZ75V',
    '1HZ100V',
] as const;

export type MarketSymbol = (typeof DERIV_MARKETS)[number];

export const MAX_TICKS = 100;

export interface DigitState {
    /** Map of symbol -> array of last digits (0-9), max MAX_TICKS */
    data: Record<string, number[]>;
    /** WebSocket connection status */
    status: 'connecting' | 'connected' | 'disconnected';
}

const getDigit = (price: number): number => {
    const str = price.toFixed(4);
    return parseInt(str.slice(-1), 10);
};

const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089';

/**
 * Subscribes to live Deriv tick history for all volatility markets and
 * maintains the last {@link MAX_TICKS} digits per symbol.
 */
export const useDerivTicks = (): DigitState => {
    const [state, setState] = useState<DigitState>({
        data: {},
        status: 'connecting',
    });
    const wsRef = useRef<WebSocket | null>(null);
    const dataRef = useRef<Record<string, number[]>>({});

    useEffect(() => {
        let reconnectTimer: ReturnType<typeof setTimeout>;

        const init = () => {
            const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
            wsRef.current = ws;

            ws.onopen = () => {
                setState((s) => ({ ...s, status: 'connected' }));
                DERIV_MARKETS.forEach((symbol) => {
                    ws.send(
                        JSON.stringify({
                            ticks_history: symbol,
                            adjust_start_time: 1,
                            count: MAX_TICKS,
                            end: 'latest',
                            start: 1,
                            style: 'ticks',
                            subscribe: 1,
                        })
                    );
                });
            };

            ws.onmessage = (msg) => {
                const payload = JSON.parse(msg.data);

                if (payload.msg_type === 'history') {
                    const symbol = payload.echo_req.ticks_history;
                    const digits = payload.history.prices.map((p: number) => getDigit(p));
                    dataRef.current[symbol] = digits;
                    setState((s) => ({ ...s, data: { ...dataRef.current } }));
                } else if (payload.msg_type === 'tick') {
                    const symbol = payload.tick.symbol;
                    const digit = getDigit(payload.tick.quote);
                    const current = dataRef.current[symbol] ?? [];
                    const next = [...current, digit];
                    if (next.length > MAX_TICKS) next.shift();
                    dataRef.current[symbol] = next;
                    setState((s) => ({ ...s, data: { ...dataRef.current } }));
                }
            };

            ws.onclose = () => {
                setState((s) => ({ ...s, status: 'disconnected' }));
                reconnectTimer = setTimeout(init, 3000);
            };
        };

        init();

        return () => {
            clearTimeout(reconnectTimer);
            wsRef.current?.close();
        };
    }, []);

    return state;
};
