import api from './api';
import type { Harvest, HarvestSummary, GrowthCycle, HarvestGrade, GrowthStage } from '@/types';

// --- Mappers: snake_case API → camelCase frontend ---

const mapHarvest = (raw: any): Harvest => ({
  harvestId: raw.harvest_id ?? raw.harvestId,
  roomId: raw.room_id ?? raw.roomId,
  harvestedAt: raw.harvested_at ?? raw.harvestedAt,
  weightKg: Number(raw.weight_kg ?? raw.weightKg ?? 0),
  grade: (raw.grade ?? 'C').toUpperCase() as HarvestGrade,
  notes: raw.notes ?? undefined,
  recordedBy: raw.recorded_by ?? raw.recordedBy,
  createdAt: raw.created_at ?? raw.createdAt,
});

const mapHarvestSummary = (raw: any): HarvestSummary => ({
  totalWeightKg: Number(raw.total_weight_kg ?? raw.totalWeightKg ?? 0),
  totalHarvests: raw.total_harvests ?? raw.totalHarvests ?? 0,
  gradeBreakdown: raw.grade_breakdown ?? raw.gradeBreakdown ?? {},
  period: raw.period ?? '',
});

const mapGrowthCycle = (raw: any): GrowthCycle => ({
  cycleId: raw.cycle_id ?? raw.cycleId,
  roomId: raw.room_id ?? raw.roomId,
  startedAt: raw.started_at ?? raw.startedAt,
  currentStage: (raw.current_stage ?? raw.currentStage ?? 'IDLE').toUpperCase() as GrowthStage,
  stageChangedAt: raw.stage_changed_at ?? raw.stageChangedAt ?? undefined,
  expectedHarvestDate: raw.expected_harvest_date ?? raw.expectedHarvestDate ?? undefined,
  targetYieldKg: raw.target_yield_kg != null ? Number(raw.target_yield_kg) : (raw.targetYieldKg != null ? Number(raw.targetYieldKg) : undefined),
  notes: raw.notes ?? undefined,
  autoAdjustThresholds: raw.auto_adjust_thresholds ?? raw.autoAdjustThresholds ?? true,
  createdBy: raw.created_by ?? raw.createdBy,
  isActive: raw.is_active ?? raw.isActive ?? false,
  createdAt: raw.created_at ?? raw.createdAt,
  updatedAt: raw.updated_at ?? raw.updatedAt,
});

// --- Service ---

export const harvestService = {
  /** Log a new harvest entry */
  logHarvest: async (data: {
    roomId: number;
    weightKg: number;
    grade: string;
    notes?: string;
    harvestedAt?: string;
  }): Promise<Harvest> => {
    const res = await api.post('/harvests/', {
      room_id: data.roomId,
      weight_kg: data.weightKg,
      grade: data.grade,
      notes: data.notes || undefined,
      harvested_at: data.harvestedAt || undefined,
    });
    return mapHarvest(res.data);
  },

  /** Get all harvests for a room */
  getHarvestsByRoom: async (roomId: number, limit = 50): Promise<Harvest[]> => {
    const res = await api.get(`/harvests/room/${roomId}`, { params: { limit } });
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapHarvest);
  },

  /** Get overall harvest summary (all rooms) */
  getHarvestSummary: async (period = 'monthly', months = 3): Promise<HarvestSummary[]> => {
    const res = await api.get('/harvests/summary', { params: { period, months } });
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapHarvestSummary);
  },

  /** Get harvest summary for a specific room */
  getHarvestSummaryByRoom: async (roomId: number, period = 'monthly', months = 3): Promise<HarvestSummary[]> => {
    const res = await api.get(`/harvests/summary/room/${roomId}`, { params: { period, months } });
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapHarvestSummary);
  },

  /** Start a new growth cycle for a room */
  startGrowthCycle: async (data: {
    roomId: number;
    currentStage?: string;
    expectedHarvestDate?: string;
    targetYieldKg?: number;
    notes?: string;
  }): Promise<GrowthCycle> => {
    const res = await api.post('/growth-cycles/', {
      room_id: data.roomId,
      current_stage: data.currentStage || 'INOCULATION',
      expected_harvest_date: data.expectedHarvestDate || undefined,
      target_yield_kg: data.targetYieldKg || undefined,
      notes: data.notes || undefined,
    });
    return mapGrowthCycle(res.data);
  },

  /** Advance a growth cycle to the next (or specified) stage */
  advanceGrowthCycle: async (cycleId: number, stage?: string): Promise<GrowthCycle> => {
    const res = await api.put(`/growth-cycles/${cycleId}/advance`, {
      current_stage: stage || undefined,
    });
    return mapGrowthCycle(res.data);
  },

  /** Get the current active growth cycle for a room */
  getCurrentGrowthCycle: async (roomId: number): Promise<GrowthCycle | null> => {
    try {
      const res = await api.get(`/growth-cycles/room/${roomId}/current`);
      return mapGrowthCycle(res.data);
    } catch (err: any) {
      // 404 means no active cycle — not an error
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /** Get all growth cycles for a room */
  getGrowthCycles: async (roomId: number, limit = 50): Promise<GrowthCycle[]> => {
    const res = await api.get(`/growth-cycles/room/${roomId}`, { params: { limit } });
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapGrowthCycle);
  },

  /** Update growth cycle fields (e.g. auto_adjust_thresholds) via the advance endpoint */
  updateGrowthCycle: async (cycleId: number, data: {
    autoAdjustThresholds?: boolean;
    notes?: string;
  }): Promise<GrowthCycle> => {
    const res = await api.put(`/growth-cycles/${cycleId}/advance`, {
      auto_adjust_thresholds: data.autoAdjustThresholds,
      notes: data.notes,
    });
    return mapGrowthCycle(res.data);
  },
};
