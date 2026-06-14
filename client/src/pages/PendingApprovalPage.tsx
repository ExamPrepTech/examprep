
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingApprovalPage = () => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6 p-8 border border-border rounded-xl bg-card shadow-sm">
        <div className="w-16 h-16 bg-warning/15 text-warning rounded-full flex items-center justify-center mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground">Account Pending Approval</h1>
        
        <p className="text-muted-foreground">
          Hello <strong>{user?.name}</strong>,<br/>
          Your account is currently waiting for administrator approval. 
          You will not be able to access the platform until your account is approved.
        </p>

        <div className="pt-4">
            <Button onClick={handleLogout} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
            </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
