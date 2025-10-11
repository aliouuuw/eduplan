'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, GraduationCap, UserPlus, AlertCircle } from 'lucide-react';
import type { User } from 'next-auth';

interface UserWithSchool {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<UserWithSchool[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserWithSchool[]>([]);

  const fetchUsers = async () => {
    if (!session?.user?.schoolId) return;

    try {
      const [activeResponse, pendingResponse] = await Promise.all([
        fetch(`/api/users?schoolId=${session.user.schoolId}`),
        fetch(`/api/users?pending=true`)
      ]);

      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setActiveUsers(activeData.users);
      }

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingUsers(pendingData.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session?.user?.schoolId]);

  const approveUser = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          schoolId: session?.user?.schoolId,
          isActive: true,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User approved and assigned to school',
        });
        fetchUsers(); // Refresh the data
      } else {
        throw new Error('Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      });
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: false,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User registration rejected',
        });
        fetchUsers(); // Refresh the data
      } else {
        throw new Error('Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject user',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
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
      case 'teacher':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'student':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'parent':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'admin':
        return 'bg-black text-white border-black';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const activeUsersColumns = [
    {
      key: 'name' as keyof UserWithSchool,
      label: 'Name',
      render: (_value: any, item: UserWithSchool) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            {getRoleIcon(item.role)}
          </div>
          <span className="font-medium text-black">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'email' as keyof UserWithSchool,
      label: 'Email',
      render: (_value: any, item: UserWithSchool) => (
        <span className="text-sm text-gray-700">{item.email}</span>
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
      key: 'isActive' as keyof UserWithSchool,
      label: 'Status',
      render: (_value: any, item: UserWithSchool) => (
        <Badge variant={item.isActive ? 'default' : 'secondary'}
          className={item.isActive ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}>
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

  const pendingUsersColumns = [
    {
      key: 'name' as keyof UserWithSchool,
      label: 'Name',
      render: (_value: any, item: UserWithSchool) => (
        <span className="font-medium text-black">{item.name}</span>
      ),
    },
    {
      key: 'email' as keyof UserWithSchool,
      label: 'Email',
      render: (_value: any, item: UserWithSchool) => (
        <span className="text-sm text-gray-700">{item.email}</span>
      ),
    },
    {
      key: 'createdAt' as keyof UserWithSchool,
      label: 'Registered',
      render: (_value: any, item: UserWithSchool) => (
        <span className="text-sm text-gray-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'id' as keyof UserWithSchool,
      label: 'Actions',
      render: (_value: any, item: UserWithSchool) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={() => approveUser(item.id, 'student')}
            className="bg-black hover:bg-gray-800"
          >
            Student
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => approveUser(item.id, 'teacher')}
          >
            Teacher
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => approveUser(item.id, 'parent')}
          >
            Parent
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => rejectUser(item.id)}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const activeTeachers = activeUsers.filter(u => u.role === 'teacher');
  const activeStudents = activeUsers.filter(u => u.role === 'student');
  const activeParents = activeUsers.filter(u => u.role === 'parent');

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Users</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Manage school users, approve registrations, and assign roles
        </p>
      </header>

      <section className="space-y-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Users</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{activeUsers.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Teachers</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <UserCheck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{activeTeachers.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Students</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{activeStudents.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Approvals</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{pendingUsers.length}</p>
              </CardContent>
            </Card>
          </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <Tabs defaultValue="active" className="w-full">
            <CardHeader className="flex flex-col gap-4 border-b border-gray-200 pb-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-black">User Directory</h2>
                  <p className="text-sm text-gray-600">Filter by status, assign roles, and keep records up to date.</p>
                </div>
              </div>
              <TabsList className="w-fit rounded-full bg-gray-100 p-1">
                <TabsTrigger value="active" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-black">
                  Active Users
                </TabsTrigger>
                <TabsTrigger value="pending" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-black">
                  Pending Approvals
                  {pendingUsers.length > 0 && (
                    <Badge className="ml-2 rounded-full bg-black text-white">
                      {pendingUsers.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              <TabsContent value="active" className="mt-0 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-black">All Active Users</h3>
                  <p className="text-sm text-gray-600">
                    Users currently enrolled in your school with assigned roles and permissions.
                  </p>
                </div>
                <DataTable
                  columns={activeUsersColumns}
                  data={activeUsers}
                  loading={loading}
                  searchPlaceholder="Search users..."
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-0 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-black">Pending User Registrations</h3>
                  <p className="text-sm text-gray-600">
                    Approve or reject new user requests and assign the right role in one step.
                  </p>
                </div>
                {pendingUsers.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 py-14 text-center">
                    <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-base font-medium text-black">No pending approvals</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      All user registrations have been processed.
                    </p>
                  </div>
                ) : (
                  <DataTable
                    columns={pendingUsersColumns}
                    data={pendingUsers}
                    loading={loading}
                    searchPlaceholder="Search pending users..."
                  />
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
      </section>
    </div>
  );
}
