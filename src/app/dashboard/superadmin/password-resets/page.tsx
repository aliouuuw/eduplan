'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, User, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface PasswordResetRequest {
  id: string;
  email: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  userIsActive: boolean | null;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function SuperAdminPasswordResetsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [resetLink, setResetLink] = useState<string>('');
  const [resetLinkDialogOpen, setResetLinkDialogOpen] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/password-reset-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        toast.error('Failed to load password reset requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = (request: PasswordResetRequest, action: 'approve' | 'reject') => {
    if (!request.userId) {
      toast.error('Cannot process request - user not found in system');
      return;
    }
    if (!request.userIsActive) {
      toast.error('Cannot process request - user account is inactive');
      return;
    }
    setSelectedRequest(request);
    setActionType(action);
    setNotes('');
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest) return;

    try {
      setProcessingRequest(true);
      const response = await fetch(`/api/password-reset-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (actionType === 'approve' && data.resetLink) {
          setResetLink(data.resetLink);
          setResetLinkDialogOpen(true);
        }
        
        toast.success(
          actionType === 'approve'
            ? 'Password reset link generated successfully'
            : 'Password reset request rejected'
        );
        fetchRequests();
        setActionDialogOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleCopyResetLink = () => {
    navigator.clipboard.writeText(resetLink);
    toast.success('Password reset link copied to clipboard');
  };

  const handleDeleteRequest = async (request: PasswordResetRequest) => {
    if (!confirm(`Delete password reset request from ${request.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/password-reset-requests/${request.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Password reset request deleted successfully');
        fetchRequests();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error(error.message || 'Failed to delete request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-black">Password Reset Requests</h1>
          <p className="max-w-2xl text-sm text-gray-600">
            Manage user password reset requests
          </p>
        </header>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Password Reset Requests</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Review and approve password reset requests from users
        </p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Pending Requests
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-yellow-50 text-yellow-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-black">{pendingRequests.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Approved
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-green-50 text-green-600">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-black">
              {requests.filter(r => r.status === 'approved').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Rejected
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-red-50 text-red-600">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-black">
              {requests.filter(r => r.status === 'rejected').length}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Pending Requests */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-black">Pending Requests</h2>
          <p className="text-sm text-gray-600">Requests awaiting your review</p>
        </div>

        {pendingRequests.length === 0 ? (
          <Card className="rounded-2xl border border-gray-200">
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No pending password reset requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="rounded-2xl border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-black">{request.email}</p>
                          <p className="text-sm text-gray-500">
                            Requested {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {request.userId ? (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{request.userName}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {request.userRole}
                          </Badge>
                          {!request.userIsActive && (
                            <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                              Inactive Account
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded-md">
                          <AlertCircle className="h-4 w-4" />
                          <span>Email not found in system</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAction(request, 'approve')}
                        disabled={!request.userId || !request.userIsActive}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(request, 'reject')}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-black">Processed Requests</h2>
            <p className="text-sm text-gray-600">Previously reviewed requests</p>
          </div>

          <div className="space-y-3">
            {processedRequests.map((request) => (
              <Card key={request.id} className="rounded-2xl border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-black">{request.email}</p>
                          <p className="text-sm text-gray-500">
                            Requested {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {request.userName && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{request.userName}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {request.userRole}
                          </Badge>
                        </div>
                      )}

                      {request.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          <span className="font-medium">Notes: </span>
                          {request.notes}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRequest(request)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Password Reset Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Generate a password reset link for ${selectedRequest?.email}`
                : `Reject the password reset request from ${selectedRequest?.email}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setActionDialogOpen(false)}
                disabled={processingRequest}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                disabled={processingRequest}
                className={
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }
              >
                {processingRequest ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Link Dialog */}
      <Dialog open={resetLinkDialogOpen} onOpenChange={setResetLinkDialogOpen}>
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
                {resetLink}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setResetLinkDialogOpen(false)}
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

