import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react';
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
import { plantService } from '@/services/plantService';
import { mapPlant, toPlantCreate, toPlantUpdate } from '@/utils/mappers';
import type { Plant, PlantType, PlantFormData } from '@/types';

export const Plants: React.FC = () => {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PlantType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  
  const [formData, setFormData] = useState<PlantFormData>({
    name: '',
    code: '',
    type: 'OYSTER',
    location: '',
    address: '',
    city: '',
    state: '',
    latitude: undefined,
    longitude: undefined,
    sizeSqft: undefined,
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
  
  // Filter plants
  const filteredPlants = state.plants.filter(plant => {
    const matchesSearch =
      searchQuery === '' ||
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || plant.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || plant.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });
  
  const handleOpenDrawer = (plant?: Plant) => {
    if (plant) {
      setEditingPlant(plant);
      setFormData({
        name: plant.name,
        code: plant.code,
        type: plant.type,
        location: plant.location,
        address: plant.address || '',
        city: plant.city,
        state: plant.state,
        latitude: plant.latitude,
        longitude: plant.longitude,
        sizeSqft: plant.sizeSqft,
      });
    } else {
      setEditingPlant(null);
      setFormData({
        name: '',
        code: '',
        type: 'OYSTER',
        location: '',
        address: '',
        city: '',
        state: '',
        latitude: undefined,
        longitude: undefined,
        sizeSqft: undefined,
      });
    }
    setIsDrawerOpen(true);
  };
  
  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.city || !formData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingPlant) {
        const res = await plantService.update(Number(editingPlant.id), toPlantUpdate(formData));
        dispatch({ type: 'UPDATE_PLANT', payload: mapPlant(res) });
        toast.success('Plant updated successfully');
      } else {
        const res = await plantService.create(toPlantCreate(formData));
        dispatch({ type: 'ADD_PLANT', payload: mapPlant(res) });
        toast.success('Plant created successfully');
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save plant');
    }
  };

  const handleDelete = async (plant: Plant) => {
    try {
      await plantService.delete(Number(plant.id));
      dispatch({ type: 'DELETE_PLANT', payload: plant.id });
      toast.success('Plant deleted successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete plant');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iot-primary mb-1">Plants</h1>
          <p className="text-sm text-iot-secondary">Manage your mushroom farm locations</p>
        </div>
        <Button
          onClick={() => handleOpenDrawer()}
          className="gradient-primary text-iot-bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Plant
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iot-muted" />
          <Input
            type="text"
            placeholder="Search plants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-10 w-full"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PlantType | 'ALL')}>
          <SelectTrigger className="input-dark w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="OYSTER">Oyster</SelectItem>
            <SelectItem value="BUTTON">Button</SelectItem>
            <SelectItem value="SHIITAKE">Shiitake</SelectItem>
            <SelectItem value="MIXED">Mixed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="input-dark w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      {filteredPlants.length > 0 ? (
        <div
          ref={tableRef}
          className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plant Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Rooms</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.map((plant) => (
                  <tr key={plant.id} className="cursor-pointer hover:bg-iot-tertiary/30">
                    <td className="font-medium">{plant.name}</td>
                    <td className="font-mono text-iot-secondary">{plant.code}</td>
                    <td>
                      <TypeBadge type={plant.type} variant="plant" />
                    </td>
                    <td>{plant.city}</td>
                    <td>{plant.state}</td>
                    <td>{plant.roomsCount}</td>
                    <td>
                      <StatusBadge status={plant.status === 'ACTIVE' ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-iot-muted">
                      {new Date(plant.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDrawer(plant)}
                          className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-cyan hover:bg-iot-cyan/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plant)}
                          className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-red hover:bg-iot-red/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
          title="No plants found"
          description="Try adjusting your filters or create a new plant."
          actionLabel="Create Plant"
          onAction={() => handleOpenDrawer()}
        />
      )}
      
      {/* Create/Edit Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-iot-secondary border-iot-subtle w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-iot-primary">
              {editingPlant ? 'Edit Plant' : 'Create New Plant'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Plant Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter plant name"
                className="input-dark w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Plant Code *
              </label>
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., NVF"
                className="input-dark w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Type *
              </label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as PlantType })}
              >
                <SelectTrigger className="input-dark w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  <SelectItem value="OYSTER">Oyster</SelectItem>
                  <SelectItem value="BUTTON">Button</SelectItem>
                  <SelectItem value="SHIITAKE">Shiitake</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Location
              </label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location description"
                className="input-dark w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Address
              </label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter street address"
                className="input-dark w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  City *
                </label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  State *
                </label>
                <Input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className="input-dark w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Latitude
                </label>
                <Input
                  type="number"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 38.5"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Longitude
                </label>
                <Input
                  type="number"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., -121.5"
                  className="input-dark w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Size (sq ft)
              </label>
              <Input
                type="number"
                value={formData.sizeSqft || ''}
                onChange={(e) => setFormData({ ...formData, sizeSqft: parseInt(e.target.value) || undefined })}
                placeholder="Enter facility size"
                className="input-dark w-full"
              />
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
              {editingPlant ? 'Save Changes' : 'Create Plant'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Plants;
