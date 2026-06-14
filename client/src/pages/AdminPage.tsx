
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';

import type { SharedUser } from '@shared/index';

type User = SharedUser;

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.patch(`/admin/users/${id}/approve`, {
        isApproved: !currentStatus,
      });
      setUsers(users.map((u) => (u._id === id ? res.data : u)));
    } catch {
      alert('Failed to update user status');
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter((u) => u._id !== id));
    } catch {
      alert('Failed to delete user');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!currentUser || currentUser.role !== 'admin') {
      return <div>Access Denied</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Admin Dashboard</h1>
      {error && <div className="text-destructive mb-4">{error}</div>}
      
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Role</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors">
                <td className="py-3 px-4 text-foreground">{user.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                <td className="py-3 px-4 text-foreground capitalize">{user.role}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isApproved 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-warning text-warning-foreground'
                  }`}>
                    {user.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="py-3 px-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveUser(user._id, user.isApproved)}
                    className={
                      user.isApproved 
                        ? 'bg-warning text-warning-foreground hover:bg-warning/90' 
                        : 'bg-success text-success-foreground hover:bg-success/90'
                    }
                  >
                    {user.isApproved ? 'Revoke' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteUser(user._id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
