import api from './api';

export interface GenerateReportPayload {
  plant_id: number;
  report_type: string;
  report_name: string;
  format: string;
  date_from: string;
  date_to: string;
}

export const reportService = {
  getAll: () => api.get('/reports/').then(r => r.data),

  getById: (id: number) => api.get(`/reports/${id}`).then(r => r.data),

  generate: (data: GenerateReportPayload) =>
    api.post('/reports/generate', data).then(r => r.data),

  download: async (reportId: number) => {
    const response = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'report.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match?.[1]) {
        filename = match[1];
      }
    }
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  delete: (id: number) => api.delete(`/reports/${id}`),

  exportReadings: async (roomId: number, from: string, to: string) => {
    const response = await api.get('/readings/export', {
      params: { room_id: roomId, from, to },
      responseType: 'blob',
    });
    const contentDisposition = response.headers['content-disposition'];
    let filename = `readings_room${roomId}_${from}_${to}.csv`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match?.[1]) {
        filename = match[1];
      }
    }
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
