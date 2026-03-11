import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Plus, Search, Filter, Edit2, ChevronRight, Shield, Play, Pause, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { TypeBadge } from '@/components/ui-custom/TypeBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { roomService } from '@/services/roomService';
import { mapRoom, toRoomCreate, toRoomUpdate } from '@/utils/mappers';
import type { Room, RoomType, RoomFormData, RoomStatus } from '@/types';

export const Rooms: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = state.currentUser?.role === 'SUPER_ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<RoomType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    code: '',
    plantId: '',
    roomType: 'FRUITING',
    sizeSqft: undefined,
    racks: 10,
    bags: 100,
    bagsPerRack: 10,
    floorNumber: 1,
  });

  useEffect(() => {
    if (tableRef.current) {
      gsap.fromTo(
        tableRef.current.querySelectorAll('tr'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power3.out' }
      );
    }
  }, []);

  const filteredRooms = state.rooms.filter(room => {
    const matchesSearch =
      searchQuery === '' ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlant = plantFilter === 'ALL' || room.plantId === plantFilter;
    const matchesType = typeFilter === 'ALL' || room.roomType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;

    return matchesSearch && matchesPlant && matchesType && matchesStatus;
  });

  const handleOpenDrawer = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        code: room.code,
        plantId: room.plantId,
        roomType: room.roomType,
        sizeSqft: room.sizeSqft,
        racks: room.racks,
        bags: room.bags,
        bagsPerRack: room.bagsPerRack,
        floorNumber: room.floorNumber,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        code: '',
        plantId: state.plants[0]?.id || '',
        roomType: 'FRUITING',
        sizeSqft: undefined,
        racks: 10,
        bags: 100,
        bagsPerRack: 10,
        floorNumber: 1,
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.plantId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingRoom) {
        const res = await roomService.update(Number(editingRoom.id), toRoomUpdate(formData));
        dispatch({ type: 'UPDATE_ROOM', payload: mapRoom(res, state.plants) });
        toast.success('Room updated successfully');
      } else {
        const res = await roomService.create(toRoomCreate(formData));
        dispatch({ type: 'ADD_ROOM', payload: mapRoom(res, state.plants) });
        toast.success('Room created successfully');
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save room');
    }
  };

  const handleStatusChange = async (room: Room, newStatus: RoomStatus) => {
    try {
      const res = await roomService.changeStatus(Number(room.id), newStatus);
      dispatch({ type: 'UPDATE_ROOM', payload: mapRoom(res, state.plants) });
      toast.success(`Room status changed to ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to change room status');
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'active';
      case 'SUSPENDED': return 'warning';
      case 'MAINTENANCE': return 'warning';
      case 'INACTIVE': return 'inactive';
      default: return 'active';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iot-primary mb-1">Rooms</h1>
          <p className="text-sm text-iot-secondary">Manage growing rooms and their assignments</p>
        </div>
        <Button
          onClick={() => handleOpenDrawer()}
          className="gradient-primary text-iot-bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Room
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iot-muted" />
          <Input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-10 w-full"
          />
        </div>

        <Select value={plantFilter} onValueChange={setPlantFilter}>
          <SelectTrigger className="input-dark w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Plant" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Plants</SelectItem>
            {state.plants.map(plant => (
              <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RoomType | 'ALL')}>
          <SelectTrigger className="input-dark w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="SPAWN_RUN">Spawn Run</SelectItem>
            <SelectItem value="INCUBATION">Incubation</SelectItem>
            <SelectItem value="FRUITING">Fruiting</SelectItem>
            <SelectItem value="STORAGE">Storage</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RoomStatus | 'ALL')}>
          <SelectTrigger className="input-dark w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredRooms.length > 0 ? (
        <div
          ref={tableRef}
          className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Code</th>
                  <th>Plant</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Racks</th>
                  <th>Bags</th>
                  <th>Floor</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    className="cursor-pointer hover:bg-iot-tertiary/30"
                    onClick={() => navigate(`/rooms/${room.id}`)}
                  >
                    <td className="font-medium">{room.name}</td>
                    <td className="font-mono text-iot-secondary">{room.code}</td>
                    <td>{room.plantName}</td>
                    <td>
                      <TypeBadge type={room.roomType} variant="room" />
                    </td>
                    <td>{room.sizeSqft ? `${room.sizeSqft} sqft` : '-'}</td>
                    <td>{room.racks}</td>
                    <td>{room.bags}</td>
                    <td>{room.floorNumber}</td>
                    <td className="font-mono text-xs">
                      {room.deviceName || (
                        <span className="badge badge-orange">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={statusBadgeVariant(room.status)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDrawer(room)}
                          className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-cyan hover:bg-iot-cyan/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* SUPER_ADMIN-only status actions */}
                        {isSuperAdmin && (
                          <>
                            {room.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleStatusChange(room, 'ACTIVE')}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-green-400 hover:bg-green-400/10 transition-colors"
                                title="Activate"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {room.status !== 'SUSPENDED' && (
                              <button
                                onClick={() => handleStatusChange(room, 'SUSPENDED')}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                                title="Suspend"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}
                            {room.status !== 'MAINTENANCE' && (
                              <button
                                onClick={() => handleStatusChange(room, 'MAINTENANCE')}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                                title="Maintenance"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}
                            {room.status !== 'INACTIVE' && (
                              <button
                                onClick={() => handleStatusChange(room, 'INACTIVE')}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Deactivate"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => navigate(`/rooms/${room.id}`)}
                          className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-primary hover:bg-iot-tertiary transition-colors"
                          title="View"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No rooms found"
          description="Try adjusting your filters or create a new room."
          actionLabel="Create Room"
          onAction={() => handleOpenDrawer()}
        />
      )}

      {/* Create/Edit Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-iot-secondary border-iot-subtle w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-iot-primary">
              {editingRoom ? 'Edit Room' : 'Create New Room'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Room Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter room name"
                className="input-dark w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Room Code *
              </label>
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., NVF-A1"
                className="input-dark w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Plant *
              </label>
              <Select
                value={formData.plantId}
                onValueChange={(v) => setFormData({ ...formData, plantId: v })}
              >
                <SelectTrigger className="input-dark w-full">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  {state.plants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Room Type *
              </label>
              <Select
                value={formData.roomType}
                onValueChange={(v) => setFormData({ ...formData, roomType: v as RoomType })}
              >
                <SelectTrigger className="input-dark w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  <SelectItem value="SPAWN_RUN">Spawn Run</SelectItem>
                  <SelectItem value="INCUBATION">Incubation</SelectItem>
                  <SelectItem value="FRUITING">Fruiting</SelectItem>
                  <SelectItem value="STORAGE">Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Size (sq ft)
              </label>
              <Input
                type="number"
                value={formData.sizeSqft || ''}
                onChange={(e) => setFormData({ ...formData, sizeSqft: parseInt(e.target.value) || undefined })}
                placeholder="Enter room size"
                className="input-dark w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Number of Racks
                </label>
                <Input
                  type="number"
                  value={formData.racks}
                  onChange={(e) => setFormData({ ...formData, racks: parseInt(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Bags per Rack
                </label>
                <Input
                  type="number"
                  value={formData.bagsPerRack}
                  onChange={(e) => setFormData({ ...formData, bagsPerRack: parseInt(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Total Bags
                </label>
                <Input
                  type="number"
                  value={formData.bags}
                  onChange={(e) => setFormData({ ...formData, bags: parseInt(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Floor Number
                </label>
                <Input
                  type="number"
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({ ...formData, floorNumber: parseInt(e.target.value) || 1 })}
                  className="input-dark w-full"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              className="border-iot-subtle text-iot-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="gradient-primary text-iot-bg-primary"
            >
              {editingRoom ? 'Save Changes' : 'Create Room'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Rooms;
