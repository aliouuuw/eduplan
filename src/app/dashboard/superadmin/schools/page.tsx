'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/ui/data-table';
import { SchoolForm } from '@/components/forms/school-form';
import { School } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schools');
      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools);
      } else {
        toast.error('Failed to fetch schools');
      }
    } catch (error) {
      toast.error('Error fetching schools');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (data: any) => {
    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('School created successfully');
        fetchSchools();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create school');
      }
    } catch (error) {
      toast.error('Error creating school');
      console.error('Error:', error);
    }
  };

  const handleEditSchool = async (data: any) => {
    if (!editingSchool) return;

    try {
      const response = await fetch(`/api/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('School updated successfully');
        fetchSchools();
        setEditingSchool(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update school');
      }
    } catch (error) {
      toast.error('Error updating school');
      console.error('Error:', error);
    }
  };

  const handleDeleteSchool = async (school: School) => {
    if (!confirm(`Are you sure you want to delete ${school.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/schools/${school.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('School deleted successfully');
        fetchSchools();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete school');
      }
    } catch (error) {
      toast.error('Error deleting school');
      console.error('Error:', error);
    }
  };

  const columns = [
    {
      key: 'name' as keyof School,
      label: 'School Name',
    },
    {
      key: 'address' as keyof School,
      label: 'Address',
      render: (value: string) => value || 'Not provided',
    },
    {
      key: 'phone' as keyof School,
      label: 'Phone',
      render: (value: string) => value || 'Not provided',
    },
    {
      key: 'email' as keyof School,
      label: 'Email',
      render: (value: string) => value || 'Not provided',
    },
    {
      key: 'isActive' as keyof School,
      label: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as keyof School,
      label: 'Created',
      render: (value: Date) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout 
      title="Schools Management" 
      description="Manage all schools in the system"
    >
      <div className="space-y-6">
        <DataTable
          data={schools}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search schools..."
          onAdd={() => setFormOpen(true)}
          onEdit={(school) => {
            setEditingSchool(school);
            setFormOpen(true);
          }}
          onDelete={handleDeleteSchool}
          addLabel="Add School"
          emptyMessage="No schools found. Create your first school to get started."
        />

        <SchoolForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) {
              setEditingSchool(null);
            }
          }}
          school={editingSchool}
          onSubmit={editingSchool ? handleEditSchool : handleCreateSchool}
        />
      </div>
    </DashboardLayout>
  );
}
