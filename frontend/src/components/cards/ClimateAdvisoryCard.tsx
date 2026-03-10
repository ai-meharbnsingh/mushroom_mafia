import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Thermometer,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClimateAdvisory, ClimateDeviation } from '@/types';

interface ClimateAdvisoryCardProps {
  advisory: ClimateAdvisory | null;
  onApplyRecommended: () => void;
  onToggleAutoAdjust: (enabled: boolean) => void;
  isApplying?: boolean;
}

const STORAGE_KEY = 'climate-advisory-expanded';

function getDeviationStatusIcon(deviation: ClimateDeviation) {
  if (deviation.severity === 'critical') {
    return <XCircle className="w-4 h-4 text-iot-red" />;
  }
  if (deviation.severity === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-iot-yellow" />;
  }
  return <CheckCircle2 className="w-4 h-4 text-iot-green" />;
}

function getDeviationStatusLabel(deviation: ClimateDeviation) {
  if (deviation.direction === 'too_high') return 'HIGH';
  if (deviation.direction === 'too_low') return 'LOW';
  if (deviation.direction === 'not_set') return 'N/A';
  return 'OK';
}

function getDeviationStatusColor(deviation: ClimateDeviation) {
  if (deviation.severity === 'critical') return 'text-iot-red';
  if (deviation.severity === 'warning') return 'text-iot-yellow';
  return 'text-iot-green';
}

function formatRange(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return 'N/A';
  if (min === null) return `<= ${max}${unit}`;
  if (max === null) return `>= ${min}${unit}`;
  return `${min}-${max}${unit}`;
}

export const ClimateAdvisoryCard: React.FC<ClimateAdvisoryCardProps> = ({
  advisory,
  onApplyRecommended,
  onToggleAutoAdjust,
  isApplying = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      );
    }
  }, []);

  // Don't render anything if advisory is null
  if (!advisory) return null;

  const { recommended, currentThresholds, deviations, suggestions } = advisory;

  // If no recommended guideline, show a subtle prompt
  if (!recommended) {
    return (
      <div
        ref={containerRef}
        className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle"
      >
        <div className="flex items-center gap-2 text-iot-muted">
          <Info className="w-5 h-5" />
          <p className="text-sm">
            No climate guidelines configured for this plant type and growth stage.
            Contact an admin to set up guidelines.
          </p>
        </div>
      </div>
    );
  }

  // Build parameter rows for the comparison table
  const parameterRows = [
    {
      label: 'Temperature',
      unit: ' \u00B0C',
      recommended: formatRange(recommended.tempMin, recommended.tempMax, '\u00B0C'),
      current: `${currentThresholds.temperature.min}-${currentThresholds.temperature.max}\u00B0C`,
      deviation: deviations.find((d) => d.parameter === 'TEMPERATURE'),
    },
    {
      label: 'Humidity',
      unit: ' %',
      recommended: formatRange(recommended.humidityMin, recommended.humidityMax, '%'),
      current: `${currentThresholds.humidity.min}-${currentThresholds.humidity.max}%`,
      deviation: deviations.find((d) => d.parameter === 'HUMIDITY'),
    },
    {
      label: 'CO2',
      unit: ' ppm',
      recommended: formatRange(recommended.co2Min, recommended.co2Max, ' ppm'),
      current: `${currentThresholds.co2.min}-${currentThresholds.co2.max} ppm`,
      deviation: deviations.find((d) => d.parameter === 'CO2'),
    },
  ];

  const hasCritical = deviations.some((d) => d.severity === 'critical');
  const hasWarning = deviations.some((d) => d.severity === 'warning');
  const headerBorderColor = hasCritical
    ? 'border-iot-red/30'
    : hasWarning
      ? 'border-iot-yellow/30'
      : 'border-iot-green/30';

  return (
    <div
      ref={containerRef}
      className={`bg-iot-secondary rounded-2xl border ${headerBorderColor} overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-iot-tertiary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              hasCritical
                ? 'bg-iot-red/10 text-iot-red'
                : hasWarning
                  ? 'bg-iot-yellow/10 text-iot-yellow'
                  : 'bg-iot-green/10 text-iot-green'
            }`}
          >
            <Thermometer className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-iot-primary">
              Climate Advisory for {advisory.currentStage.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-iot-muted mt-0.5">
              {advisory.plantType} &middot; {deviations.filter((d) => d.severity !== 'ok').length}{' '}
              issue{deviations.filter((d) => d.severity !== 'ok').length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-iot-secondary bg-iot-tertiary px-3 py-1 rounded-full">
            Day {advisory.daysInStage}
            {advisory.stageDurationMax
              ? ` / ${advisory.stageDurationMin}-${advisory.stageDurationMax}d`
              : ''}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-iot-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-iot-muted" />
          )}
        </div>
      </button>

      {/* Collapsible body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Comparison table */}
          <div className="rounded-xl border border-iot-subtle overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-iot-tertiary/50">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-iot-muted uppercase tracking-wider">
                    Parameter
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-iot-muted uppercase tracking-wider">
                    Recommended
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-iot-muted uppercase tracking-wider">
                    Current
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-iot-muted uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {parameterRows.map((row, idx) => {
                  const deviation = row.deviation;
                  return (
                    <tr
                      key={row.label}
                      className={`border-t border-iot-subtle/50 ${
                        idx % 2 === 0 ? 'bg-iot-secondary' : 'bg-iot-tertiary/20'
                      } hover:bg-iot-tertiary/40 transition-colors`}
                    >
                      <td className="py-2.5 px-4 text-iot-primary font-medium">{row.label}</td>
                      <td className="py-2.5 px-4 text-iot-cyan font-mono text-xs">
                        {row.recommended}
                      </td>
                      <td className="py-2.5 px-4 text-iot-secondary font-mono text-xs">
                        {row.current}
                      </td>
                      <td className="py-2.5 px-4">
                        {deviation ? (
                          <div className="flex items-center gap-1.5">
                            {getDeviationStatusIcon(deviation)}
                            <span
                              className={`text-xs font-semibold ${getDeviationStatusColor(deviation)}`}
                            >
                              {getDeviationStatusLabel(deviation)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-iot-muted">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => {
                const isCriticalSuggestion = suggestion.toLowerCase().includes('critical') ||
                  suggestion.toLowerCase().includes('exceeds');
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-3 rounded-lg ${
                      isCriticalSuggestion
                        ? 'bg-iot-red/5 border border-iot-red/15'
                        : 'bg-iot-yellow/5 border border-iot-yellow/15'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isCriticalSuggestion ? 'text-iot-red' : 'text-iot-yellow'
                      }`}
                    />
                    <p className="text-xs text-iot-secondary leading-relaxed">{suggestion}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Guideline notes */}
          {recommended.notes && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-iot-cyan/5 border border-iot-cyan/15">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-iot-cyan" />
              <p className="text-xs text-iot-secondary leading-relaxed">{recommended.notes}</p>
            </div>
          )}

          {/* Transition reminder + next stage preview */}
          {advisory.transitionReminder && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-iot-purple/5 border border-iot-purple/15">
              <ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-iot-purple" />
              <div>
                <p className="text-xs text-iot-secondary leading-relaxed">
                  {advisory.transitionReminder}
                </p>
                {advisory.nextStagePreview && (
                  <p className="text-xs text-iot-muted mt-1">
                    Next stage targets: Temp{' '}
                    {formatRange(
                      advisory.nextStagePreview.tempMin,
                      advisory.nextStagePreview.tempMax,
                      '\u00B0C',
                    )}
                    , Humidity{' '}
                    {formatRange(
                      advisory.nextStagePreview.humidityMin,
                      advisory.nextStagePreview.humidityMax,
                      '%',
                    )}
                    , CO2{' '}
                    {formatRange(
                      advisory.nextStagePreview.co2Min,
                      advisory.nextStagePreview.co2Max,
                      ' ppm',
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between pt-2">
            {/* Apply recommended button */}
            <Button
              onClick={onApplyRecommended}
              disabled={isApplying}
              className="gradient-primary text-iot-bg-primary text-sm"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Apply Recommended Thresholds
                </>
              )}
            </Button>

            {/* Auto-adjust toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-iot-muted">Auto-Adjust</span>
              <button
                onClick={() => onToggleAutoAdjust(!advisory.autoAdjustEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-iot-cyan/30 ${
                  advisory.autoAdjustEnabled ? 'bg-iot-cyan' : 'bg-iot-tertiary'
                }`}
                role="switch"
                aria-checked={advisory.autoAdjustEnabled}
                aria-label="Toggle auto-adjust"
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    advisory.autoAdjustEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                className={`text-xs font-semibold ${
                  advisory.autoAdjustEnabled ? 'text-iot-cyan' : 'text-iot-muted'
                }`}
              >
                {advisory.autoAdjustEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
