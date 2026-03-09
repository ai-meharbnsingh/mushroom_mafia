import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Plus, Search, Edit2, Lock } from 'lucide-react';
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
import { RoleBadge } from '@/components/ui-custom/RoleBadge';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { userService } from '@/services/userService';
import { mapUser, toUserCreate, toUserUpdate } from '@/utils/mappers';
import type { User, UserRole, UserFormData } from '@/types';

export const Users: React.FC = () => {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    mobile: '',
    role: 'OPERATOR',
    assignedPlants: [],
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
  
  // Filter users
  const filteredUsers = state.users.filter(user => {
    const matchesSearch =
      searchQuery === '' ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  const handleOpenDrawer = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile || '',
        role: user.role,
        assignedPlants: user.assignedPlants,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        mobile: '',
        role: 'OPERATOR',
        assignedPlants: [],
      });
    }
    setIsDrawerOpen(true);
  };
  
  const handleSave = async () => {
    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingUser) {
        const res = await userService.update(Number(editingUser.id), toUserUpdate(formData));
        dispatch({ type: 'UPDATE_USER', payload: mapUser(res) });
        toast.success('User updated successfully');
      } else {
        if (!formData.password) {
          toast.error('Password is required for new users');
          return;
        }
        const res = await userService.create(toUserCreate(formData));
        dispatch({ type: 'ADD_USER', payload: mapUser(res) });
        toast.success('User created successfully');
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save user');
    }
  };
  
  const togglePlantAssignment = (plantId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedPlants: prev.assignedPlants.includes(plantId)
        ? prev.assignedPlants.filter(id => id !== plantId)
        : [...prev.assignedPlants, plantId],
    }));
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iot-primary mb-1">Users</h1>
          <p className="text-sm text-iot-secondary">Manage team members and permissions</p>
        </div>
        <Button
          onClick={() => handleOpenDrawer()}
          className="gradient-primary text-iot-bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New User
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iot-muted" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-10 w-full"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'ALL')}>
          <SelectTrigger className="input-dark w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="OPERATOR">Operator</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      {filteredUsers.length > 0 ? (
        <div
          ref={tableRef}
          className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Assigned Plants</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-iot-tertiary/30">
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.username}
                        {user.status === 'LOCKED' && (
                          <Lock className="w-3 h-3 text-iot-red" />
                        )}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {user.assignedPlants.slice(0, 2).map(plantId => {
                          const plant = state.plants.find(p => p.id === plantId);
                          return plant ? (
                            <span
                              key={plantId}
                              className="px-2 py-0.5 rounded text-[10px] bg-iot-tertiary text-iot-secondary"
                            >
                              {plant.code}
                            </span>
                          ) : null;
                        })}
                        {user.assignedPlants.length > 2 && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-iot-tertiary text-iot-secondary">
                            +{user.assignedPlants.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-iot-muted text-xs">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <StatusBadge
                        status={user.status === 'ACTIVE' ? 'active' : 'locked'}
                      />
                    </td>
                    <td className="text-iot-muted text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenDrawer(user)}
                        className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-cyan hover:bg-iot-cyan/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
          title="No users found"
          description="Try adjusting your filters or create a new user."
          actionLabel="Create User"
          onAction={() => handleOpenDrawer()}
        />
      )}
      
      {/* Create/Edit Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-iot-secondary border-iot-subtle w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-iot-primary">
              {editingUser ? 'Edit User' : 'Create New User'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  First Name *
                </label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Last Name *
                </label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                  className="input-dark w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Username *
              </label>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                className="input-dark w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                className="input-dark w-full"
              />
            </div>
            
            {!editingUser && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Password *
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="input-dark w-full"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Mobile
              </label>
              <Input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="Enter mobile number"
                className="input-dark w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Role *
              </label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger className="input-dark w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Assigned Plants
              </label>
              <div className="space-y-2">
                {state.plants.map(plant => (
                  <label
                    key={plant.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-iot-tertiary cursor-pointer hover:bg-iot-tertiary/80 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedPlants.includes(plant.id)}
                      onChange={() => togglePlantAssignment(plant.id)}
                      className="w-4 h-4 rounded border-iot-subtle bg-iot-bg-primary text-iot-cyan focus:ring-iot-cyan"
                    />
                    <span className="text-sm text-iot-primary">{plant.name}</span>
                    <span className="text-xs text-iot-muted ml-auto">{plant.code}</span>
                  </label>
                ))}
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
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Users;
