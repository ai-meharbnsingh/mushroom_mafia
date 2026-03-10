import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui-custom/SeverityBadge';
import type { Alert } from '@/types';

interface AlertWidgetProps {
    alerts: Alert[];
    onAcknowledge: (alert: Alert) => Promise<void>;
}

export const AlertWidget: React.FC<AlertWidgetProps> = ({ alerts, onAcknowledge }) => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            gsap.fromTo(
                containerRef.current,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
            );
        }
    }, []);

    return (
        <div ref={containerRef} className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-iot-subtle bg-iot-tertiary">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-iot-orange" />
                    <h2 className="text-lg font-semibold text-iot-primary">Active Alerts</h2>
                    {alerts.length > 0 && (
                        <span className="bg-iot-red text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">
                            {alerts.length}
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/alerts')}
                    className="text-iot-secondary hover:text-iot-primary text-xs"
                >
                    View All
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {alerts.length > 0 ? (
                    <div className="divide-y divide-iot-subtle">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="flex items-center justify-between p-4 hover:bg-iot-tertiary/50 transition-colors"
                                style={{
                                    borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? '#FF2D55' : alert.severity === 'WARNING' ? '#FFD166' : '#2EEFFF'
                                        }`,
                                }}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <SeverityBadge severity={alert.severity} />
                                        <span className="text-sm font-medium text-iot-primary">{alert.roomName}</span>
                                    </div>
                                    <p className="text-xs text-iot-secondary">{alert.message}</p>
                                    <p className="text-[10px] text-iot-muted">
                                        {new Date(alert.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAcknowledge(alert)}
                                    className="border-iot-subtle text-xs text-iot-secondary hover:text-iot-primary h-8"
                                >
                                    <span className="hidden sm:inline">Acknowledge</span>
                                    <span className="sm:hidden">Ack</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-12 h-12 rounded-full bg-iot-green/10 flex items-center justify-center mb-3">
                            <span className="text-2xl">🌱</span>
                        </div>
                        <p className="text-sm font-medium text-iot-primary">All Clear</p>
                        <p className="text-xs text-iot-muted mt-1">No active alerts to show</p>
                    </div>
                )}
            </div>
        </div>
    );
};
