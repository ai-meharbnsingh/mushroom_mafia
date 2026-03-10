import api from './api';
import type { ClimateAdvisory, ClimateGuideline, GrowthStage } from '@/types';

// --- Mappers: snake_case API -> camelCase frontend ---

function mapGuideline(data: any): ClimateGuideline {
  return {
    guidelineId: data.guideline_id ?? data.guidelineId ?? 0,
    plantType: data.plant_type ?? data.plantType ?? '',
    growthStage: (data.growth_stage ?? data.growthStage ?? 'IDLE').toUpperCase() as GrowthStage,
    tempMin: data.temp_min ?? data.tempMin ?? null,
    tempMax: data.temp_max ?? data.tempMax ?? null,
    humidityMin: data.humidity_min ?? data.humidityMin ?? null,
    humidityMax: data.humidity_max ?? data.humidityMax ?? null,
    co2Min: data.co2_min ?? data.co2Min ?? null,
    co2Max: data.co2_max ?? data.co2Max ?? null,
    tempHysteresis: data.temp_hysteresis ?? data.tempHysteresis ?? 1.0,
    humidityHysteresis: data.humidity_hysteresis ?? data.humidityHysteresis ?? 2.5,
    co2Hysteresis: data.co2_hysteresis ?? data.co2Hysteresis ?? 100,
    durationDaysMin: data.duration_days_min ?? data.durationDaysMin ?? null,
    durationDaysMax: data.duration_days_max ?? data.durationDaysMax ?? null,
    notes: data.notes ?? null,
  };
}

function mapAdvisory(data: any): ClimateAdvisory {
  return {
    roomId: data.room_id ?? data.roomId ?? 0,
    currentStage: (data.current_stage ?? data.currentStage ?? 'IDLE').toUpperCase() as GrowthStage,
    plantType: data.plant_type ?? data.plantType ?? '',
    recommended: data.recommended ? mapGuideline(data.recommended) : null,
    currentThresholds: {
      co2: {
        min: data.current_thresholds?.co2?.min ?? 0,
        max: data.current_thresholds?.co2?.max ?? 0,
      },
      temperature: {
        min: data.current_thresholds?.temperature?.min ?? 0,
        max: data.current_thresholds?.temperature?.max ?? 0,
      },
      humidity: {
        min: data.current_thresholds?.humidity?.min ?? 0,
        max: data.current_thresholds?.humidity?.max ?? 0,
      },
    },
    deviations: (data.deviations ?? []).map((d: any) => ({
      parameter: (d.parameter ?? '').toUpperCase(),
      direction: d.direction ?? 'ok',
      current: d.current ?? null,
      recommended: d.recommended ?? null,
      severity: d.severity ?? 'ok',
    })),
    daysInStage: data.days_in_stage ?? data.daysInStage ?? 0,
    stageDurationMin: data.stage_duration_min ?? data.stageDurationMin ?? null,
    stageDurationMax: data.stage_duration_max ?? data.stageDurationMax ?? null,
    transitionReminder: data.transition_reminder ?? data.transitionReminder ?? null,
    nextStage: data.next_stage
      ? (data.next_stage as string).toUpperCase() as GrowthStage
      : null,
    nextStagePreview: data.next_stage_preview
      ? mapGuideline(data.next_stage_preview)
      : null,
    autoAdjustEnabled: data.auto_adjust_enabled ?? data.autoAdjustEnabled ?? false,
    suggestions: data.suggestions ?? [],
  };
}

// --- Reverse mapper: camelCase -> snake_case for guideline updates ---

function toSnakeCaseGuideline(data: Partial<ClimateGuideline>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.tempMin !== undefined) result.temp_min = data.tempMin;
  if (data.tempMax !== undefined) result.temp_max = data.tempMax;
  if (data.humidityMin !== undefined) result.humidity_min = data.humidityMin;
  if (data.humidityMax !== undefined) result.humidity_max = data.humidityMax;
  if (data.co2Min !== undefined) result.co2_min = data.co2Min;
  if (data.co2Max !== undefined) result.co2_max = data.co2Max;
  if (data.tempHysteresis !== undefined) result.temp_hysteresis = data.tempHysteresis;
  if (data.humidityHysteresis !== undefined) result.humidity_hysteresis = data.humidityHysteresis;
  if (data.co2Hysteresis !== undefined) result.co2_hysteresis = data.co2Hysteresis;
  if (data.durationDaysMin !== undefined) result.duration_days_min = data.durationDaysMin;
  if (data.durationDaysMax !== undefined) result.duration_days_max = data.durationDaysMax;
  if (data.notes !== undefined) result.notes = data.notes;
  return result;
}

// --- Service ---

export const advisoryService = {
  /** Get climate advisory for a room (returns null if no growth cycle or not configured) */
  getAdvisory: async (roomId: number): Promise<ClimateAdvisory | null> => {
    try {
      const res = await api.get(`/advisory/room/${roomId}`);
      return mapAdvisory(res.data);
    } catch {
      // No advisory available (no growth cycle, no guideline, etc.)
      return null;
    }
  },

  /** Get all climate guidelines */
  getGuidelines: async (): Promise<ClimateGuideline[]> => {
    const res = await api.get('/advisory/guidelines');
    return (Array.isArray(res.data) ? res.data : []).map(mapGuideline);
  },

  /** Get a specific guideline by plant type and growth stage */
  getGuideline: async (plantType: string, stage: string): Promise<ClimateGuideline> => {
    const res = await api.get(`/advisory/guidelines/${plantType}/${stage}`);
    return mapGuideline(res.data);
  },

  /** Update a guideline (admin only) */
  updateGuideline: async (
    plantType: string,
    stage: string,
    data: Partial<ClimateGuideline>,
  ): Promise<ClimateGuideline> => {
    const snakeCaseData = toSnakeCaseGuideline(data);
    const res = await api.put(`/advisory/guidelines/${plantType}/${stage}`, snakeCaseData);
    return mapGuideline(res.data);
  },

  /** Apply recommended thresholds for a room (syncs via MQTT) */
  applyRecommended: async (roomId: number): Promise<void> => {
    await api.post(`/advisory/room/${roomId}/apply`);
  },
};
