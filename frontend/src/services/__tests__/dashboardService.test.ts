import { dashboardService } from '../dashboardService';
import api from '../api';
import type { Mock } from 'vitest';

// Mock the api module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = api.get as Mock;

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSummary', () => {
    it('calls GET /dashboard/summary and returns data', async () => {
      const mockData = {
        totalPlants: 3,
        totalRooms: 12,
        activeDevices: 8,
        activeAlerts: 2,
      };
      mockedGet.mockResolvedValueOnce({ data: mockData });

      const result = await dashboardService.getSummary();

      expect(mockedGet).toHaveBeenCalledWith('/dashboard/summary');
      expect(mockedGet).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockData);
    });

    it('propagates errors from the API', async () => {
      const error = new Error('Network Error');
      mockedGet.mockRejectedValueOnce(error);

      await expect(dashboardService.getSummary()).rejects.toThrow('Network Error');
    });
  });

  describe('getCurrentReadings', () => {
    it('calls GET /dashboard/current-readings and returns data', async () => {
      const mockReadings = [
        { roomId: '1', co2: 800, temperature: 22, humidity: 85 },
        { roomId: '2', co2: 600, temperature: 24, humidity: 90 },
      ];
      mockedGet.mockResolvedValueOnce({ data: mockReadings });

      const result = await dashboardService.getCurrentReadings();

      expect(mockedGet).toHaveBeenCalledWith('/dashboard/current-readings');
      expect(result).toEqual(mockReadings);
    });
  });

  describe('getAdminSummary', () => {
    it('calls GET /dashboard/admin-summary and returns data', async () => {
      const mockAdminData = {
        totalPlants: 5,
        totalRooms: 20,
        totalDevices: 15,
        totalUsers: 8,
        deviceStatus: { total: 15, online: 10, offline: 5, unassigned: 2 },
        subscriptions: { active: 10, pending: 2, suspended: 1, expired: 2 },
        roomTypes: { fruiting: 8, spawnRun: 5, incubation: 4, storage: 3 },
        alerts: { active: 3, critical: 1, warning: 2, acknowledged: 5, resolvedToday: 4 },
        plants: [],
        recentEvents: [],
      };
      mockedGet.mockResolvedValueOnce({ data: mockAdminData });

      const result = await dashboardService.getAdminSummary();

      expect(mockedGet).toHaveBeenCalledWith('/dashboard/admin-summary');
      expect(result).toEqual(mockAdminData);
    });
  });

  describe('getPlantDashboard', () => {
    it('calls GET /dashboard/plant/:id with the correct plant ID', async () => {
      const mockPlantDash = {
        plantId: '42',
        plantName: 'Oyster Farm Alpha',
        plantCode: 'OFA',
        plantType: 'OYSTER',
        totalRooms: 4,
        totalDevices: 3,
        onlineDevices: 2,
        activeAlerts: 1,
        criticalAlerts: 0,
        rooms: [],
      };
      mockedGet.mockResolvedValueOnce({ data: mockPlantDash });

      const result = await dashboardService.getPlantDashboard(42);

      expect(mockedGet).toHaveBeenCalledWith('/dashboard/plant/42');
      expect(result).toEqual(mockPlantDash);
    });

    it('handles different plant IDs correctly', async () => {
      mockedGet.mockResolvedValueOnce({ data: { plantId: '1' } });
      await dashboardService.getPlantDashboard(1);
      expect(mockedGet).toHaveBeenCalledWith('/dashboard/plant/1');

      mockedGet.mockResolvedValueOnce({ data: { plantId: '999' } });
      await dashboardService.getPlantDashboard(999);
      expect(mockedGet).toHaveBeenCalledWith('/dashboard/plant/999');
    });

    it('propagates API errors for plant dashboard', async () => {
      mockedGet.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Plant not found' } },
      });

      await expect(dashboardService.getPlantDashboard(999)).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({ status: 404 }),
        })
      );
    });
  });
});
