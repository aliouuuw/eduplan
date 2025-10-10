'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvitationForm } from '@/components/forms/invitation-form';
import { toast } from 'sonner';
import { Copy, Plus, Trash2 } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invitations');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      } else {
        toast.error('Failed to fetch invitations');
      }
    } catch (error) {
      toast.error('Error fetching invitations');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (data: { email: string; role: string }) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          <div className="space-y-2">
            <p className="font-semibold">Invitation created for {data.email}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={result.invitation.invitationLink}
                readOnly
                className="text-xs bg-gray-100 p-1 rounded flex-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.invitation.invitationLink);
                  toast.success('Link copied!');
                }}
                className="text-xs px-2 py-1 bg-black text-white rounded"
              >
                Copy
              </button>
            </div>
          </div>,
          { duration: 10000 }
        );
        fetchInvitations();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create invitation');
      }
    } catch (error) {
      toast.error('Error creating invitation');
      console.error('Error:', error);
    }
  };

  const handleDeleteInvitation = async (invitation: Invitation) => {
    if (!confirm(`Are you sure you want to delete the invitation for ${invitation.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invitations?id=${invitation.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Invitation deleted successfully');
        fetchInvitations();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete invitation');
      }
    } catch (error) {
      toast.error('Error deleting invitation');
      console.error('Error:', error);
    }
  };

  const copyInvitationLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invitation link copied to clipboard!');
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.usedAt) {
      return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
    }
    
    const isExpired = new Date(invitation.expiresAt) < new Date();
    if (isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    
    return <Badge variant="default" className="bg-blue-600">Pending</Badge>;
  };

  const pendingInvitations = invitations.filter(
    inv => !inv.usedAt && new Date(inv.expiresAt) > new Date()
  );
  const acceptedInvitations = invitations.filter(inv => inv.usedAt);
  const expiredInvitations = invitations.filter(
    inv => !inv.usedAt && new Date(inv.expiresAt) < new Date()
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invitations</h1>
          <p className="text-gray-600 mt-1">Manage user invitations for your school</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invitation
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{pendingInvitations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Accepted</CardDescription>
            <CardTitle className="text-3xl">{acceptedInvitations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expired</CardDescription>
            <CardTitle className="text-3xl">{expiredInvitations.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invitations</CardTitle>
          <CardDescription>View and manage all invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No invitations found. Create your first invitation to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{invitation.email}</p>
                      {getStatusBadge(invitation)}
                      <Badge variant="outline" className="capitalize">
                        {invitation.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Created: {new Date(invitation.createdAt).toLocaleDateString()}
                      {' • '}
                      Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      {invitation.usedAt && (
                        <>
                          {' • '}
                          Accepted: {new Date(invitation.usedAt).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!invitation.usedAt && new Date(invitation.expiresAt) > new Date() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInvitationLink(invitation.token)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                    )}
                    {!invitation.usedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInvitation(invitation)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InvitationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateInvitation}
      />
    </div>
  );
}

