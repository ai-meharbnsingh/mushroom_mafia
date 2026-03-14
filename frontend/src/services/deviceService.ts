import api from './api';

export const deviceService = {
  getAll: () => api.get('/devices/').then(r => r.data),
  getById: (id: number) => api.get(`/devices/${id}`).then(r => r.data),
  update: (id: number, data: any) => api.put(`/devices/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/devices/${id}`),

  // New provisioning endpoints
  provision: (data: { mac_address: string; device_name: string; device_type?: string }) =>
    api.post('/devices/provision', data).then(r => r.data),

  assign: (id: number, data: { plant_id: number }) =>
    api.post(`/devices/${id}/assign`, data).then(r => r.data),

  killSwitch: (id: number, action: 'ENABLE' | 'DISABLE') =>
    api.post(`/devices/${id}/kill-switch`, { action }).then(r => r.data),

  revoke: (id: number) =>
    api.post(`/devices/${id}/revoke`).then(r => r.data),

  getPending: () =>
    api.get('/devices/pending').then(r => r.data),

  // Device onboarding / linking
  linkDevice: (data: { license_key: string; room_id: number }) =>
    api.post('/devices/link', data).then(r => r.data),

  getPendingApproval: () =>
    api.get('/devices/pending').then(r => r.data),

  approveDevice: (deviceId: string, action: 'APPROVE' | 'REJECT') =>
    api.post(`/devices/${deviceId}/approve`, { action }).then(r => r.data),

  // QR image storage
  getQrImage: (deviceId: string) =>
    api.get(`/devices/${deviceId}/qr-image`).then(r => r.data),

  uploadQrImage: (deviceId: string, image: string) =>
    api.post(`/devices/${deviceId}/qr-image`, { image }).then(r => r.data),
};
