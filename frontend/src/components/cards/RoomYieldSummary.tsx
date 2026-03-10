import React, { useEffect, useRef, useState } from 'react';
import { Target, TrendingUp, Award, Scale, CheckCircle2, Loader2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import gsap from 'gsap';
import { harvestService } from '@/services/harvestService';
import type { HarvestSummary, Harvest, GrowthCycle } from '@/types';

interface RoomYieldSummaryProps {
    roomName: string;
    roomId: number;
    growthCycle?: GrowthCycle | null;
}

const GRADE_COLORS: Record<string, string> = {
    A: '#2EEFFF', // iot-cyan
    B: '#27FB6B', // iot-green
    C: '#FFD166', // iot-orange
};

export const RoomYieldSummary: React.FC<RoomYieldSummaryProps> = ({ roomName, roomId, growthCycle }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<HarvestSummary | null>(null);
    const [recentHarvests, setRecentHarvests] = useState<Harvest[]>([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        Promise.all([
            harvestService.getHarvestSummaryByRoom(roomId, 'monthly', 1),
            harvestService.getHarvestsByRoom(roomId, 5),
        ])
            .then(([summaries, harvests]) => {
                if (cancelled) return;
                setSummary(summaries.length > 0 ? summaries[0] : null);
                setRecentHarvests(harvests);
            })
            .catch(() => {
                if (cancelled) return;
                setSummary(null);
                setRecentHarvests([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [roomId]);

    useEffect(() => {
        if (containerRef.current && !loading) {
            gsap.fromTo(
                containerRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
            );
        }
    }, [loading]);

    // Compute progress from growth cycle target
    const targetYield = growthCycle?.targetYieldKg ?? 0;
    const currentHarvest = summary?.totalWeightKg ?? 0;
    const progressPercentage = targetYield > 0
        ? Math.min(100, Math.round((currentHarvest / targetYield) * 100))
        : 0;

    // Build grade data for pie chart
    const gradeData = summary
        ? Object.entries(summary.gradeBreakdown).map(([grade, count]) => ({
            name: `Grade ${grade}`,
            value: count,
            color: GRADE_COLORS[grade] ?? '#6D7484',
        }))
        : [];

    const totalGradeCount = gradeData.reduce((sum, g) => sum + g.value, 0);
    const gradePercentages = gradeData.map((g) => ({
        ...g,
        pct: totalGradeCount > 0 ? Math.round((g.value / totalGradeCount) * 100) : 0,
    }));

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else if (diffDays === 1) {
                return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
            return dateStr;
        }
    };

    // Determine track status
    const getTrackStatus = () => {
        if (targetYield <= 0) return null;
        if (progressPercentage >= 90) return { label: 'On Track', cls: 'bg-iot-green/10 text-iot-green border-iot-green/20' };
        if (progressPercentage >= 50) return { label: 'In Progress', cls: 'bg-iot-yellow/10 text-iot-yellow border-iot-yellow/20' };
        return { label: 'Early Stage', cls: 'bg-iot-cyan/10 text-iot-cyan border-iot-cyan/20' };
    };
    const trackStatus = getTrackStatus();

    if (loading) {
        return (
            <div ref={containerRef} className="bg-iot-secondary rounded-2xl border border-iot-subtle p-6 h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-iot-cyan animate-spin" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="bg-iot-secondary rounded-2xl border border-iot-subtle p-6 h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-iot-tertiary flex items-center justify-center text-iot-primary">
                        <Scale size={20} className="text-iot-purple" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-iot-primary">Yield Tracker</h3>
                        <p className="text-xs text-iot-muted">{roomName}</p>
                    </div>
                </div>
                {trackStatus && (
                    <div className={`px-3 py-1 border rounded-full text-xs font-medium flex items-center gap-1 ${trackStatus.cls}`}>
                        <TrendingUp size={12} />
                        <span>{trackStatus.label}</span>
                    </div>
                )}
            </div>

            {!summary || summary.totalHarvests === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-8">
                        <Scale size={32} className="text-iot-muted mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-iot-muted">No harvests recorded yet</p>
                        <p className="text-xs text-iot-muted mt-1">Use "Log Harvest" to start tracking yield</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Harvest Progress */}
                        <div className="bg-iot-bg-primary rounded-xl p-4 flex flex-col items-center justify-center relative shadow-inner">
                            <p className="text-xs font-medium text-iot-secondary mb-2 self-start absolute top-4 left-4 flex items-center gap-1">
                                <Target size={14} className="text-iot-cyan" /> Harvest Progress
                            </p>

                            <div className="relative w-32 h-32 mt-4 flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="rgba(255, 255, 255, 0.05)"
                                        strokeWidth="10"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="url(#gradient-progress)"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={`${progressPercentage * 2.51} 251.2`}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                        <linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#B26CFF" />
                                            <stop offset="100%" stopColor="#2EEFFF" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    {targetYield > 0 ? (
                                        <>
                                            <span className="text-2xl font-bold tracking-tight text-white">{progressPercentage}%</span>
                                            <span className="text-[10px] text-iot-muted uppercase">Complete</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold tracking-tight text-white">
                                                {currentHarvest.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                            </span>
                                            <span className="text-[10px] text-iot-muted uppercase">kg total</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between w-full mt-4 text-sm px-2">
                                <div className="text-center">
                                    <p className="text-iot-muted text-xs">Current</p>
                                    <p className="font-semibold text-iot-primary">
                                        {currentHarvest.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                                    </p>
                                </div>
                                {targetYield > 0 && (
                                    <div className="text-center">
                                        <p className="text-iot-muted text-xs">Target</p>
                                        <p className="font-semibold text-iot-cyan">
                                            {targetYield.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grade Distribution */}
                        <div className="bg-iot-bg-primary rounded-xl p-4 border border-iot-subtle relative flex flex-col">
                            <p className="text-xs font-medium text-iot-secondary flex items-center gap-1 mb-2">
                                <Award size={14} className="text-iot-yellow" /> Grade Distribution
                            </p>
                            {gradePercentages.length > 0 ? (
                                <div className="flex-1 flex items-center justify-between">
                                    <div className="h-28 w-28 absolute -right-2 top-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#11131A', border: '1px solid #1C1F26', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#E2E8F0', fontSize: '12px' }}
                                                />
                                                <Pie
                                                    data={gradePercentages}
                                                    innerRadius={25}
                                                    outerRadius={40}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {gradePercentages.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="flex flex-col gap-2 z-10">
                                        {gradePercentages.map((grade) => (
                                            <div key={grade.name} className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                                                        style={{ backgroundColor: grade.color }}
                                                    />
                                                    <span className="text-xs font-medium text-iot-primary">{grade.name}</span>
                                                </div>
                                                <span className="text-[10px] text-iot-muted ml-4">{grade.pct}% of crop</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-iot-muted mt-2">No grade data available</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Harvests */}
                    <div className="flex-1 mt-2">
                        <h4 className="text-xs font-medium text-iot-secondary mb-3 uppercase tracking-wider">Recent Harvests</h4>
                        {recentHarvests.length > 0 ? (
                            <div className="space-y-2">
                                {recentHarvests.map((harvest) => (
                                    <div key={harvest.harvestId} className="flex items-center justify-between bg-iot-bg-primary rounded-lg p-3 border border-iot-subtle/50 hover:border-iot-subtle transition-colors">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 size={16} className="text-iot-green" />
                                            <div>
                                                <p className="text-[13px] font-medium text-iot-primary">
                                                    {harvest.weightKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                                                    <span className="text-iot-secondary mx-1">&bull;</span>
                                                    <span className="text-iot-muted font-normal">Grade {harvest.grade}</span>
                                                </p>
                                                <p className="text-[10px] text-iot-muted">{formatDate(harvest.harvestedAt)}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-iot-green/10 text-iot-green border border-iot-green/20">
                                            Recorded
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-iot-muted text-center py-4">No recent harvests</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
