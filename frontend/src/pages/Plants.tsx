import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Plus, Search, Filter, Edit2, Trash2, ChevronRight, UserPlus, UserCheck } from 'lucide-react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { TypeBadge } from '@/components/ui-custom/TypeBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { plantService } from '@/services/plantService';
import { mapPlant, toPlantCreate, toPlantUpdate } from '@/utils/mappers';
import { INDIA_STATES } from '@/data/indiaLocations';
import type { Plant, PlantType, PlantFormData, NewAdminInline } from '@/types';

export const Plants: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PlantType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [adminMode, setAdminMode] = useState<'existing' | 'new'>('existing');

  const [formData, setFormData] = useState<PlantFormData>({
    name: '',
    code: '',
    type: 'OYSTER',
    location: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: undefined,
    longitude: undefined,
    sizeSqft: undefined,
    adminUserId: undefined,
    newAdmin: undefined,
  });

  const [newAdminData, setNewAdminData] = useState<NewAdminInline>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    mobile: '',
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

  // State dropdown options
  const stateOptions = useMemo(() =>
    INDIA_STATES.map(s => ({ value: s.name, label: s.name })),
    []
  );

  // City dropdown options based on selected state
  const cityOptions = useMemo(() => {
    const selectedState = INDIA_STATES.find(s => s.name === formData.state);
    return (selectedState?.cities ?? []).map(c => ({ value: c, label: c }));
  }, [formData.state]);

  // Admin user options (ADMIN/SUPER_ADMIN users)
  const adminUserOptions = useMemo(() =>
    state.users
      .filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
      .map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.username})` })),
    [state.users]
  );

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
        pincode: plant.pincode || '',
        latitude: plant.latitude,
        longitude: plant.longitude,
        sizeSqft: plant.sizeSqft,
        adminUserId: undefined,
        newAdmin: undefined,
      });
    } else {
      setEditingPlant(null);
      setAdminMode('existing');
      setFormData({
        name: '',
        code: '',
        type: 'OYSTER',
        location: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: undefined,
        longitude: undefined,
        sizeSqft: undefined,
        adminUserId: undefined,
        newAdmin: undefined,
      });
      setNewAdminData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        mobile: '',
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill in all required fields (name, code, city, state, pincode)');
      return;
    }
    if (!/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }

    // Admin validation only for CREATE
    if (!editingPlant) {
      if (adminMode === 'existing' && !formData.adminUserId) {
        toast.error('Please select an admin user');
        return;
      }
      if (adminMode === 'new') {
        if (!newAdminData.username || !newAdminData.email || !newAdminData.password || !newAdminData.firstName || !newAdminData.lastName) {
          toast.error('Please fill in all required admin fields');
          return;
        }
      }
    }

    try {
      if (editingPlant) {
        const res = await plantService.update(Number(editingPlant.id), toPlantUpdate(formData));
        dispatch({ type: 'UPDATE_PLANT', payload: mapPlant(res) });
        toast.success('Plant updated successfully');
      } else {
        const createData = {
          ...formData,
          newAdmin: adminMode === 'new' ? newAdminData : undefined,
          adminUserId: adminMode === 'existing' ? formData.adminUserId : undefined,
        };
        const res = await plantService.create(toPlantCreate(createData));
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
                  <th>Pincode</th>
                  <th>Rooms</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.map((plant) => (
                  <tr
                    key={plant.id}
                    className="cursor-pointer hover:bg-iot-tertiary/30"
                    onClick={() => navigate(`/plants/${plant.id}`)}
                  >
                    <td className="font-medium">{plant.name}</td>
                    <td className="font-mono text-iot-secondary">{plant.code}</td>
                    <td>
                      <TypeBadge type={plant.type} variant="plant" />
                    </td>
                    <td>{plant.city}</td>
                    <td>{plant.state}</td>
                    <td className="font-mono">{plant.pincode || '-'}</td>
                    <td>{plant.roomsCount}</td>
                    <td>
                      <StatusBadge status={plant.status === 'ACTIVE' ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-iot-muted">
                      {new Date(plant.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                        <button
                          onClick={() => navigate(`/plants/${plant.id}`)}
                          className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-primary hover:bg-iot-tertiary transition-colors"
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

            {/* State/City Cascading Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  State *
                </label>
                <SearchableSelect
                  options={stateOptions}
                  value={formData.state}
                  onValueChange={(v) => setFormData({ ...formData, state: v, city: '' })}
                  placeholder="Select state"
                  searchPlaceholder="Search states..."
                  emptyText="No states found."
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  City *
                </label>
                <SearchableSelect
                  options={cityOptions}
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                  placeholder="Select city"
                  searchPlaceholder="Search cities..."
                  emptyText={formData.state ? "No cities found." : "Select a state first."}
                  disabled={!formData.state}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Pincode *
              </label>
              <Input
                type="text"
                value={formData.pincode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData({ ...formData, pincode: v });
                }}
                placeholder="6-digit pincode"
                maxLength={6}
                className="input-dark w-full font-mono"
              />
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

            {/* Admin Section - Only for CREATE */}
            {!editingPlant && (
              <div className="border-t border-iot-subtle pt-4 mt-4">
                <h3 className="text-sm font-semibold text-iot-primary mb-3">Plant Admin *</h3>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={adminMode === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdminMode('existing')}
                    className={adminMode === 'existing' ? 'gradient-primary text-iot-bg-primary' : 'border-iot-subtle text-iot-secondary'}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Existing User
                  </Button>
                  <Button
                    variant={adminMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdminMode('new')}
                    className={adminMode === 'new' ? 'gradient-primary text-iot-bg-primary' : 'border-iot-subtle text-iot-secondary'}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    New Admin
                  </Button>
                </div>

                {adminMode === 'existing' ? (
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                      Select Admin User *
                    </label>
                    <SearchableSelect
                      options={adminUserOptions}
                      value={formData.adminUserId || ''}
                      onValueChange={(v) => setFormData({ ...formData, adminUserId: v })}
                      placeholder="Search admin users..."
                      searchPlaceholder="Search by name..."
                      emptyText="No admin users found."
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-1">
                          First Name *
                        </label>
                        <Input
                          type="text"
                          value={newAdminData.firstName}
                          onChange={(e) => setNewAdminData({ ...newAdminData, firstName: e.target.value })}
                          placeholder="First name"
                          className="input-dark w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-1">
                          Last Name *
                        </label>
                        <Input
                          type="text"
                          value={newAdminData.lastName}
                          onChange={(e) => setNewAdminData({ ...newAdminData, lastName: e.target.value })}
                          placeholder="Last name"
                          className="input-dark w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-1">
                        Username *
                      </label>
                      <Input
                        type="text"
                        value={newAdminData.username}
                        onChange={(e) => setNewAdminData({ ...newAdminData, username: e.target.value })}
                        placeholder="Username"
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={newAdminData.email}
                        onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                        placeholder="Email"
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-1">
                        Password *
                      </label>
                      <Input
                        type="password"
                        value={newAdminData.password}
                        onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                        placeholder="Password"
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-1">
                        Mobile
                      </label>
                      <Input
                        type="text"
                        value={newAdminData.mobile || ''}
                        onChange={(e) => setNewAdminData({ ...newAdminData, mobile: e.target.value })}
                        placeholder="Mobile number"
                        className="input-dark w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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
