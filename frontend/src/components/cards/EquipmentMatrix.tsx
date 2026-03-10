import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Snowflake, Droplets, Fan, Wind, Settings, Box } from 'lucide-react';
import type { Room, SensorReading, RoomThresholds, RelayType } from '@/types';

interface EquipmentMatrixProps {
    rooms: {
        room: Room;
        reading?: SensorReading;
        thresholds?: RoomThresholds;
    }[];
}

// Equipment definition: maps relay keys to display info
interface EquipmentRow {
    relayKey: RelayType;
    label: string;
    icon: React.ReactNode;
}

const EQUIPMENT_ROWS: EquipmentRow[] = [
    {
        relayKey: 'temperature',
        label: 'AC / Cooler',
        icon: <Snowflake className="w-4 h-4 text-iot-cyan" />,
    },
    {
        relayKey: 'humidity',
        label: 'Humidifier',
        icon: <Droplets className="w-4 h-4 text-iot-blue" />,
    },
    {
        relayKey: 'co2',
        label: 'CO2 Controller',
        icon: <Wind className="w-4 h-4 text-iot-green" />,
    },
    {
        relayKey: 'ahu',
        label: 'AHU',
        icon: <Fan className="w-4 h-4 text-iot-yellow" />,
    },
    {
        relayKey: 'humidifier',
        label: 'Humidifier 2',
        icon: <Droplets className="w-4 h-4 text-iot-purple" />,
    },
    {
        relayKey: 'duct_fan',
        label: 'Duct Fan',
        icon: <Settings className="w-4 h-4 text-iot-orange" />,
    },
    {
        relayKey: 'extra',
        label: 'Extra',
        icon: <Box className="w-4 h-4 text-iot-muted" />,
    },
];

// Status indicator with proper dot styling (no emoji)
const StatusDot: React.FC<{ status: 'ON' | 'OFF' | 'OFFLINE'; tooltip: string }> = ({ status, tooltip }) => {
    let dotClass = 'w-3 h-3 rounded-full inline-block';
    if (status === 'ON') {
        dotClass += ' bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
    } else if (status === 'OFF') {
        dotClass += ' bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]';
    } else {
        dotClass += ' bg-gray-600';
    }
    return <span className={dotClass} title={tooltip} />;
};

export const EquipmentMatrix: React.FC<EquipmentMatrixProps> = ({ rooms }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            gsap.fromTo(
                containerRef.current,
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.3 }
            );
        }
    }, []);

    // Determine the relay status for a given room and relay key
    const getRelayStatus = (
        reading: SensorReading | undefined,
        relayKey: RelayType,
    ): 'ON' | 'OFF' | 'OFFLINE' => {
        if (!reading) return 'OFFLINE';
        const state = reading.relayStates[relayKey];
        return state === 'ON' ? 'ON' : 'OFF';
    };

    return (
        <div ref={containerRef} className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden w-full">
            <div className="p-4 border-b border-iot-subtle bg-iot-tertiary">
                <h2 className="text-lg font-semibold text-iot-primary">Equipment Status Matrix</h2>
                <p className="text-xs text-iot-muted font-mono mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> On
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Off
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" /> Offline
                    </span>
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left align-middle">
                    <thead className="text-xs text-iot-secondary bg-iot-tertiary/50 border-b border-iot-subtle">
                        <tr>
                            <th className="px-4 py-3 font-medium whitespace-nowrap border-r border-iot-subtle w-40">
                                Equipment
                            </th>
                            {rooms.map((rt) => (
                                <th key={rt.room.id} className="px-4 py-3 font-medium min-w-16 text-center whitespace-nowrap">
                                    {rt.room.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-iot-subtle">
                        {EQUIPMENT_ROWS.map((eq) => (
                            <tr key={eq.relayKey} className="hover:bg-iot-tertiary/30 transition-colors">
                                <td className="px-4 py-3 font-medium border-r border-iot-subtle">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        {eq.icon} {eq.label}
                                    </div>
                                </td>
                                {rooms.map((rt) => {
                                    const status = getRelayStatus(rt.reading, eq.relayKey);
                                    return (
                                        <td key={rt.room.id} className="px-4 py-3 text-center">
                                            <StatusDot
                                                status={status}
                                                tooltip={`${eq.label}: ${status}`}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rooms.length === 0 && (
                <div className="py-10 text-center text-iot-muted text-sm">
                    No rooms available to display equipment status.
                </div>
            )}
        </div>
    );
};
