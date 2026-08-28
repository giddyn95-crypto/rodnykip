import { useEffect, useMemo, useRef, useState } from 'react';
import { DERIV_MARKETS, MAX_TICKS, useDerivTicks, type MarketSymbol } from './use-deriv-ticks';
import './digit-edge-dashboard.scss';

const MARKET_LABELS: Record<MarketSymbol, string> = {
    R_10: 'Vol 10',
    R_25: 'Vol 25',
    R_50: 'Vol 50',
    R_75: 'Vol 75',
    R_100: 'Vol 100',
    '1HZ10V': 'Vol 10 (1s)',
    '1HZ25V': 'Vol 25 (1s)',
    '1HZ50V': 'Vol 50 (1s)',
    '1HZ75V': 'Vol 75 (1s)',
    '1HZ100V': 'Vol 100 (1s)',
};

type Tab = 'dashboard' | 'analysis';

interface StrategyResult {
    probability: number;
    recommendation: string;
}

const computeStrategyA = (digits: number[]): StrategyResult => {
    const matches = digits.filter((d) => d > 3 || d < 6).length;
    const probability = (matches / digits.length) * 100;
    return {
        probability,
        recommendation: probability > 70 ? 'High Statistical Edge' : 'Standard Risk Profile',
    };
};

const computeStrategyB = (digits: number[]): StrategyResult => {
    const matches = digits.filter((d) => d > 2 || d < 7).length;
    const probability = (matches / digits.length) * 100;
    return {
        probability,
        recommendation: probability > 70 ? 'High Statistical Edge' : 'Standard Risk Profile',
    };
};

const computeStrategyC = (digits: number[]): StrategyResult => {
    const matches = digits.filter((d) => d > 6 || d < 4).length;
    const probability = (matches / digits.length) * 100;
    return {
        probability,
        recommendation: probability > 65 ? 'Favorable Frequency Distribution' : 'High Volatility Excluded Range',
    };
};

const DigitEdgeDashboard = () => {
    const { data, status } = useDerivTicks();
    const [tab, setTab] = useState<Tab>('dashboard');
    const [currentSymbol, setCurrentSymbol] = useState<MarketSymbol>('R_10');

    const currentTicks = data[currentSymbol] ?? [];
    const counts = useMemo(() => {
        const c = Array(10).fill(0);
        currentTicks.forEach((d) => {
            c[d] += 1;
        });
        return c;
    }, [currentTicks]);

    const minVal = Math.min(...counts);
    const maxVal = Math.max(...counts);

    // Keep the previous counts snapshot updated when ticks arrive
    const prevCountsRef = useRef<Record<string, number[]>>({});

    useEffect(() => {
        prevCountsRef.current = { ...prevCountsRef.current, [currentSymbol]: [...counts] };
    }, [counts, currentSymbol]);

    // Determine the "gaining" digit by comparing to previous counts snapshot
    const gainingDigit = useMemo(() => {
        const prev = prevCountsRef.current[currentSymbol];
        if (!prev) return -1;
        let maxDiff = -Infinity;
        let result = -1;
        for (let i = 0; i < 10; i += 1) {
            const diff = counts[i] - prev[i];
            if (diff > maxDiff && counts[i] !== maxVal) {
                maxDiff = diff;
                result = i;
            }
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [counts, currentSymbol, maxVal]);

    const strategies = useMemo(() => {
        if (currentTicks.length === 0) return null;
        return {
            a: computeStrategyA(currentTicks),
            b: computeStrategyB(currentTicks),
            c: computeStrategyC(currentTicks),
        };
    }, [currentTicks]);

    const bestMarket = useMemo(() => {
        let best = '';
        let highest = -1;
        DERIV_MARKETS.forEach((m) => {
            const ticks = data[m] ?? [];
            if (ticks.length > 0) {
                const edge = (ticks.filter((d) => d > 6 || d < 4).length / ticks.length) * 100;
                if (edge > highest) {
                    highest = edge;
                    best = m;
                }
            }
        });
        return { best, highest };
    }, [data]);

    const statusLabel =
        status === 'connected' ? 'Live Feed Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected. Reconnecting...';

    return (
        <div className='digit-edge-dashboard'>
            <header className='digit-edge-dashboard__header'>
                <div className='digit-edge-dashboard__logo'>
                    <span>◆</span> Deriv Digit Edge Dashboard
                </div>
                <div className='digit-edge-dashboard__status-badge'>
                    <div
                        className={`digit-edge-dashboard__status-dot ${status === 'connected' ? 'digit-edge-dashboard__status-dot--connected' : ''}`}
                    />
                    <span>{statusLabel}</span>
                </div>
            </header>

            <nav className='digit-edge-dashboard__nav'>
                <div
                    className={`digit-edge-dashboard__nav-tab ${tab === 'dashboard' ? 'digit-edge-dashboard__nav-tab--active' : ''}`}
                    onClick={() => setTab('dashboard')}
                >
                    Dashboard
                </div>
                <div
                    className={`digit-edge-dashboard__nav-tab ${tab === 'analysis' ? 'digit-edge-dashboard__nav-tab--active' : ''}`}
                    onClick={() => setTab('analysis')}
                >
                    Analysis Tool
                </div>
            </nav>

            <main className='digit-edge-dashboard__main'>
                <div className='digit-edge-dashboard__market-selector'>
                    {DERIV_MARKETS.map((symbol) => (
                        <button
                            key={symbol}
                            className={`digit-edge-dashboard__market-btn ${currentSymbol === symbol ? 'digit-edge-dashboard__market-btn--active' : ''}`}
                            onClick={() => setCurrentSymbol(symbol)}
                            type='button'
                        >
                            {MARKET_LABELS[symbol]}
                        </button>
                    ))}
                </div>

                {tab === 'dashboard' && (
                    <div className='digit-edge-dashboard__card'>
                        <div className='digit-edge-dashboard__card-title'>
                            <span>
                                Digit Distribution (Last {currentTicks.length} Ticks)
                            </span>
                            <div className='digit-edge-dashboard__legend'>
                                <div className='digit-edge-dashboard__legend-item'>
                                    <div className='digit-edge-dashboard__legend-box' style={{ background: 'var(--de-least)' }} />
                                    Least
                                </div>
                                <div className='digit-edge-dashboard__legend-item'>
                                    <div className='digit-edge-dashboard__legend-box' style={{ background: 'var(--de-gaining)' }} />
                                    Gaining
                                </div>
                                <div className='digit-edge-dashboard__legend-item'>
                                    <div className='digit-edge-dashboard__legend-box' style={{ background: 'var(--de-most)' }} />
                                    Most
                                </div>
                            </div>
                        </div>

                        <div className='digit-edge-dashboard__circles'>
                            {Array.from({ length: 10 }, (_, i) => {
                                const count = counts[i];
                                const percentage = currentTicks.length ? ((count / currentTicks.length) * 100).toFixed(1) : '0.0';
                                let statusClass = '';
                                if (currentTicks.length > 0) {
                                    if (count === maxVal) statusClass = 'digit-edge-dashboard__circle--most';
                                    else if (count === minVal) statusClass = 'digit-edge-dashboard__circle--least';
                                    else if (i === gainingDigit) statusClass = 'digit-edge-dashboard__circle--gaining';
                                }
                                return (
                                    <div key={i} className='digit-edge-dashboard__circle-wrapper'>
                                        <div className={`digit-edge-dashboard__circle ${statusClass}`}>{i}</div>
                                        <div className='digit-edge-dashboard__percentage'>{percentage}%</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === 'analysis' && (
                    <>
                        <div className='digit-edge-dashboard__best-market-badge'>
                            <div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>OPTIMAL MARKET RECOMMENDATION</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {bestMarket.best
                                        ? `${MARKET_LABELS[bestMarket.best as MarketSymbol]} (Option C: Over 6 / Under 4)`
                                        : 'Analyzing markets...'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>HIGHEST PROBABILITY EDGE</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {bestMarket.highest >= 0 ? `${bestMarket.highest.toFixed(1)}%` : '0.0%'}
                                </div>
                            </div>
                        </div>

                        <div className='digit-edge-dashboard__card'>
                            <div className='digit-edge-dashboard__card-title'>
                                Probability Analysis on {MARKET_LABELS[currentSymbol]} Data
                            </div>

                            <div className='digit-edge-dashboard__analysis-grid'>
                                {[
                                    {
                                        id: 'a' as const,
                                        title: 'Option A: Over 3 OR Under 6',
                                        info: 'Matches Digits: [4, 5, 6, 7, 8, 9] OR [0, 1, 2, 3, 4, 5] (All Digits 0-9)',
                                    },
                                    {
                                        id: 'b' as const,
                                        title: 'Option B: Over 2 OR Under 7',
                                        info: 'Matches Digits: [3, 4, 5, 6, 7, 8, 9] OR [0, 1, 2, 3, 4, 5, 6] (All Digits 0-9)',
                                    },
                                    {
                                        id: 'c' as const,
                                        title: 'Option C: Over 6 OR Under 4',
                                        info: 'Matches Digits: [7, 8, 9] OR [0, 1, 2, 3] (Excludes: 4, 5, 6)',
                                    },
                                ].map((opt) => {
                                    const result = strategies ? strategies[opt.id] : null;
                                    const prob = result ? result.probability.toFixed(1) : '0.0';
                                    const rec = result ? result.recommendation : 'Waiting for market data...';
                                    return (
                                        <div key={opt.id} className='digit-edge-dashboard__option-card'>
                                            <div className='digit-edge-dashboard__option-title'>{opt.title}</div>
                                            <div className='digit-edge-dashboard__tick-info'>{opt.info}</div>
                                            <div className='digit-edge-dashboard__probability'>{prob}%</div>
                                            <div className='digit-edge-dashboard__stat-bar-bg'>
                                                <div
                                                    className='digit-edge-dashboard__stat-bar-fill'
                                                    style={{ width: `${prob}%` }}
                                                />
                                            </div>
                                            <div className='digit-edge-dashboard__recommendation'>{rec}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default DigitEdgeDashboard;
