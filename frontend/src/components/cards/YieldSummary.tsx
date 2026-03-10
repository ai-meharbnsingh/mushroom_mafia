import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TrendingUp, Loader2 } from 'lucide-react';
import { harvestService } from '@/services/harvestService';
import type { HarvestSummary } from '@/types';

interface GradeYield {
    grade: string;
    amount: number;
    percentage: number;
    colorClass: string;
    indicator: string;
}

export const YieldSummary: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<HarvestSummary | null>(null);

    useEffect(() => {
        harvestService.getHarvestSummary('monthly', 1)
            .then((data) => {
                // Use the most recent period (first element)
                setSummary(data.length > 0 ? data[0] : null);
            })
            .catch(() => {
                setSummary(null);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (containerRef.current && !loading) {
            gsap.fromTo(
                containerRef.current,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
            );
        }
    }, [loading]);

    // Build grade breakdown for display
    const buildGrades = (): GradeYield[] => {
        if (!summary || summary.totalHarvests === 0) return [];

        const breakdown = summary.gradeBreakdown;
        const totalCount = Object.values(breakdown).reduce((sum, c) => sum + c, 0);

        const gradeConfig: { key: string; label: string; colorClass: string; indicator: string }[] = [
            { key: 'A', label: 'Grade A', colorClass: 'text-iot-green', indicator: '' },
            { key: 'B', label: 'Grade B', colorClass: 'text-iot-yellow', indicator: '' },
            { key: 'C', label: 'Grade C', colorClass: 'text-iot-red', indicator: '' },
        ];

        return gradeConfig
            .filter((g) => (breakdown[g.key] ?? 0) > 0)
            .map((g) => {
                const count = breakdown[g.key] ?? 0;
                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return {
                    grade: g.label,
                    amount: count,
                    percentage,
                    colorClass: g.colorClass,
                    indicator: g.indicator,
                };
            });
    };

    const grades = buildGrades();

    return (
        <div ref={containerRef} className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle h-full">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-iot-primary" />
                <h2 className="text-lg font-semibold text-iot-primary">This Month Yield</h2>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-iot-cyan animate-spin" />
                </div>
            ) : !summary || summary.totalHarvests === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-iot-muted">No harvests recorded yet</p>
                    <p className="text-xs text-iot-muted mt-1">Harvest data will appear here once logged</p>
                </div>
            ) : (
                <>
                    <div className="mb-4">
                        <p className="text-sm text-iot-muted">Total Harvest</p>
                        <p className="text-3xl font-bold text-iot-primary">
                            {summary.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                            <span className="text-lg text-iot-secondary font-medium">kg</span>
                        </p>
                        <p className="text-xs text-iot-muted mt-1">
                            {summary.totalHarvests} harvest{summary.totalHarvests !== 1 ? 's' : ''} in {summary.period}
                        </p>
                    </div>

                    <div className="space-y-3">
                        {grades.map((item) => (
                            <div key={item.grade}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-iot-secondary">{item.grade}</span>
                                    <span className="text-sm text-iot-primary flex items-center gap-2">
                                        {item.amount} harvest{item.amount !== 1 ? 's' : ''} ({item.percentage}%)
                                    </span>
                                </div>
                                <div className="w-full bg-iot-tertiary rounded-full h-1.5 border border-iot-subtle overflow-hidden">
                                    <div
                                        className={`h-1.5 rounded-full ${item.grade === 'Grade A' ? 'bg-iot-green' : item.grade === 'Grade B' ? 'bg-iot-yellow' : 'bg-iot-red'
                                            }`}
                                        style={{ width: `${item.percentage}%` }}
                                        title={`${item.percentage}%`}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
