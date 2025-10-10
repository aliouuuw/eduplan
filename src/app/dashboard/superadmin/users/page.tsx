'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, GraduationCap, UserPlus, AlertCircle, Building, Shield, Key } from 'lucide-react';
import { UserForm } from '@/components/forms/user-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserWithSchool {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
  schoolName: string | null;
  schoolCode: string | null;
  isActive: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface UsersStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: {
    superadmin: number;
    admin: number;
    teacher: number;
    student: number;
    parent: number;
  };
}

interface School {
  id: string;
  name: string;
}

export default function SuperAdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithSchool[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithSchool | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetLink, setPasswordResetLink] = useState<string>('');
  const [generatingReset, setGeneratingReset] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch schools
      const schoolsResponse = await fetch('/api/schools');
      if (schoolsResponse.ok) {
        const schoolsData = await schoolsResponse.json();
        setSchools(schoolsData.schools);
      }

      // Fetch users
      const params = new URLSearchParams();
      if (selectedSchool !== 'all') params.append('schoolId', selectedSchool);
      if (selectedRole !== 'all') params.append('role', selectedRole);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const usersResponse = await fetch(`/api/dashboard/superadmin/users?${params}`);
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data.users);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSchool, selectedRole, selectedStatus]);

  const handleEditUser = async (data: any) => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users?userId=${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('User updated successfully');
        fetchData();
        setEditingUser(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (user: UserWithSchool) => {
    if (!confirm(`Are you sure you want to deactivate ${user.name}? This user will no longer be able to access the system.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User deactivated successfully');
        fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to deactivate user');
    }
  };

  const handleGeneratePasswordReset = async (user: UserWithSchool) => {
    if (!confirm(`Generate a password reset link for ${user.name}?`)) {
      return;
    }

    try {
      setGeneratingReset(true);
      const response = await fetch('/api/password-resets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordResetLink(data.passwordReset.resetLink);
        setPasswordResetDialogOpen(true);
        toast.success('Password reset link generated successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error: any) {
      console.error('Error generating password reset:', error);
      toast.error(error.message || 'Failed to generate password reset link');
    } finally {
      setGeneratingReset(false);
    }
  };

  const handleCopyResetLink = () => {
    navigator.clipboard.writeText(passwordResetLink);
    toast.success('Password reset link copied to clipboard');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Shield className="h-4 w-4" />;
      case 'admin':
        return <UserCheck className="h-4 w-4" />;
      case 'teacher':
        return <UserCheck className="h-4 w-4" />;
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      case 'parent':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'admin':
        return 'bg-black text-white border-black';
      case 'teacher':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'student':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'parent':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const usersColumns = [
    {
      key: 'name' as keyof UserWithSchool,
      label: 'User',
      render: (_value: any, item: UserWithSchool) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            {getRoleIcon(item.role)}
          </div>
          <div>
            <span className="font-medium text-black">{item.name}</span>
            <p className="text-sm text-gray-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role' as keyof UserWithSchool,
      label: 'Role',
      render: (_value: any, item: UserWithSchool) => (
        <Badge variant="outline" className={getRoleBadgeColor(item.role)}>
          {item.role}
        </Badge>
      ),
    },
    {
      key: 'schoolName' as keyof UserWithSchool,
      label: 'School',
      render: (_value: any, item: UserWithSchool) => (
        <div className="flex items-center space-x-2">
          {item.schoolName ? (
            <>
              <Building className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{item.schoolName}</span>
              {item.schoolCode && (
                <Badge variant="outline" className="text-xs">
                  {item.schoolCode}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500">No school assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive' as keyof UserWithSchool,
      label: 'Status',
      render: (_value: any, item: UserWithSchool) => (
        <Badge variant={item.isActive ? 'default' : 'secondary'}
          className={item.isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as keyof UserWithSchool,
      label: 'Joined',
      render: (_value: any, item: UserWithSchool) => (
        <span className="text-sm text-gray-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">System Users</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Manage all users across all schools in the system
        </p>
      </header>

      {/* Stats Cards */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Users</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats?.totalUsers || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-green-50 text-green-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats?.activeUsers || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admins</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-black text-white">
                <Shield className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats?.usersByRole.admin || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Teachers</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-blue-50 text-blue-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats?.usersByRole.teacher || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Students</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-green-50 text-green-600">
                <GraduationCap className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats?.usersByRole.student || 0}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black">User Directory</h2>
            <p className="text-sm text-gray-600">Filter and manage all system users</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Users Table */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <DataTable
            columns={usersColumns}
            data={users}
            loading={loading}
            searchPlaceholder="Search users..."
            onEdit={(user) => {
              setEditingUser(user);
              setFormOpen(true);
            }}
            onDelete={handleDeleteUser}
            customActions={(user) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGeneratePasswordReset(user)}
                disabled={generatingReset || !user.isActive}
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                Reset Password
              </Button>
            )}
          />
        </CardContent>
      </section>

      {/* User Form */}
      <UserForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingUser(null);
          }
        }}
        user={editingUser}
        schools={schools}
        onSubmit={handleEditUser}
      />

      {/* Password Reset Link Dialog */}
      <Dialog open={passwordResetDialogOpen} onOpenChange={setPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Password Reset Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with the user. The link will expire in 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="break-all text-sm font-mono text-gray-700">
                {passwordResetLink}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setPasswordResetDialogOpen(false)}
              >
                Close
              </Button>
              <Button onClick={handleCopyResetLink}>
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
