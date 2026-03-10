import React, { useEffect, useRef } from 'react';
import { Leaf, ThermometerSnowflake, Droplets, Archive, Sprout, PackageCheck } from 'lucide-react';
import gsap from 'gsap';
import type { RoomType, GrowthCycle, GrowthStage } from '@/types';

interface StageTimelineProps {
    currentStage: RoomType;
    growthCycle?: GrowthCycle | null;
    daysInStage?: number;
    durationMin?: number | null;
    durationMax?: number | null;
    transitionReminder?: string | null;
}

interface StageEntry {
    type: GrowthStage;
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
}

const GROWTH_STAGES: StageEntry[] = [
    { type: 'INOCULATION', label: 'Inoculation', icon: <Sprout size={18} />, color: '#FFD166', bg: 'bg-iot-orange' },
    { type: 'SPAWN_RUN', label: 'Spawn Run', icon: <ThermometerSnowflake size={18} />, color: '#B26CFF', bg: 'bg-iot-purple' },
    { type: 'INCUBATION', label: 'Incubation', icon: <Droplets size={18} />, color: '#FF8A65', bg: 'bg-orange-400' },
    { type: 'FRUITING', label: 'Fruiting', icon: <Leaf size={18} />, color: '#27FB6B', bg: 'bg-iot-green' },
    { type: 'HARVEST', label: 'Harvest', icon: <PackageCheck size={18} />, color: '#2EEFFF', bg: 'bg-iot-cyan' },
    { type: 'IDLE', label: 'Idle', icon: <Archive size={18} />, color: '#6D7484', bg: 'bg-gray-500' },
];

// Fallback: map RoomType to a matching GrowthStage for legacy behavior
const ROOM_TO_STAGE: Record<RoomType, GrowthStage> = {
    SPAWN_RUN: 'SPAWN_RUN',
    INCUBATION: 'INCUBATION',
    FRUITING: 'FRUITING',
    STORAGE: 'IDLE',
};

export const StageTimeline: React.FC<StageTimelineProps> = ({
    currentStage: roomType,
    growthCycle,
    daysInStage,
    durationMin,
    durationMax,
    transitionReminder,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine which stage to highlight
    const activeStage: GrowthStage = growthCycle?.currentStage ?? ROOM_TO_STAGE[roomType] ?? 'IDLE';
    const currentIndex = GROWTH_STAGES.findIndex(s => s.type === activeStage);

    // Format the stage_changed_at date
    const stageChangedLabel = growthCycle?.stageChangedAt
        ? new Date(growthCycle.stageChangedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    useEffect(() => {
        if (containerRef.current) {
            const nodes = containerRef.current.querySelectorAll('.timeline-node');
            const lines = containerRef.current.querySelectorAll('.timeline-line');

            gsap.fromTo(
                nodes,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' }
            );

            gsap.fromTo(
                lines,
                { scaleX: 0, opacity: 0 },
                { scaleX: 1, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', transformOrigin: 'left center', delay: 0.2 }
            );
        }
    }, [activeStage]);

    return (
        <div ref={containerRef} className="bg-iot-secondary rounded-2xl border border-iot-subtle p-6 overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-iot-primary">Growth Stage Timeline</h3>
                <div className="flex items-center gap-2">
                    {stageChangedLabel && (
                        <span className="text-[10px] text-iot-muted">
                            Since {stageChangedLabel}
                        </span>
                    )}
                    <span className="text-xs font-medium text-iot-secondary bg-iot-tertiary px-3 py-1 rounded-full uppercase tracking-wider">
                        {activeStage.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>

            <div className="relative flex items-center justify-between mt-8 mb-4 px-2 sm:px-6">
                {GROWTH_STAGES.map((stage, index) => {
                    const isActive = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <React.Fragment key={stage.type}>
                            {/* Node */}
                            <div className="relative flex flex-col items-center group timeline-node z-10">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                    ${isActive ? `${stage.bg} text-iot-bg-primary shadow-${stage.bg.replace('bg-', '')}/30` : 'bg-iot-bg-primary border-2 border-iot-subtle text-iot-muted'}`}
                                    style={{
                                        boxShadow: isCurrent ? `0 0 20px ${stage.color}80, inset 0 0 10px rgba(255,255,255,0.5)` : 'none',
                                        transform: isCurrent ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                >
                                    {stage.icon}
                                </div>

                                <div className="absolute top-14 text-center w-24">
                                    <p className={`text-xs font-semibold ${isActive ? 'text-iot-primary' : 'text-iot-muted'}`}>
                                        {stage.label}
                                    </p>
                                    {isCurrent && daysInStage != null && (
                                        <span className="text-[10px] text-iot-cyan mt-0.5 block font-medium">
                                            Day {daysInStage}
                                        </span>
                                    )}
                                    {isCurrent && durationMin != null && durationMax != null && (
                                        <span className="text-[10px] text-iot-muted mt-0.5 block">
                                            ~{durationMin}-{durationMax}d
                                        </span>
                                    )}
                                    {isCurrent && !daysInStage && (
                                        <span className="text-[10px] text-iot-secondary mt-1 block animate-pulse">
                                            In Progress
                                        </span>
                                    )}
                                </div>

                                {/* Glow behind current node */}
                                {isCurrent && (
                                    <div
                                        className="absolute -inset-4 rounded-full opacity-20 blur-xl z-[-1] animate-pulse"
                                        style={{ backgroundColor: stage.color }}
                                    />
                                )}
                                {/* Transition reminder pulsing ring */}
                                {isCurrent && transitionReminder && (
                                    <div
                                        className="absolute -inset-1 rounded-full border-2 border-iot-yellow animate-pulse z-[-1]"
                                    />
                                )}
                            </div>

                            {/* Connector Line */}
                            {index < GROWTH_STAGES.length - 1 && (
                                <div className="flex-1 timeline-line mx-2 h-1 bg-iot-bg-primary rounded-full relative z-0 overflow-hidden">
                                    <div
                                        className="h-full w-full transition-all duration-1000 origin-left"
                                        style={{
                                            backgroundColor: GROWTH_STAGES[index].color,
                                            transform: index < currentIndex ? 'scaleX(1)' : 'scaleX(0)',
                                            opacity: index < currentIndex ? 0.5 : 0
                                        }}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="h-4" /> {/* Spacer for the absolute positioned labels */}
            {transitionReminder && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-iot-yellow/5 border border-iot-yellow/15">
                    <div className="w-2 h-2 rounded-full bg-iot-yellow animate-pulse shrink-0" />
                    <p className="text-[11px] text-iot-secondary leading-relaxed">
                        {transitionReminder}
                    </p>
                </div>
            )}
        </div>
    );
};
