import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut, User, GraduationCap, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/common/Button';

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsProfileOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'text-primary bg-primary/10 shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        {children}
        {isActive && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full md:hidden" />
        )}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between w-full px-4">
        {/* Logo Section */}
        <Link to="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary/20 to-primary/10 text-primary ring-1 ring-primary/20 shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            ExamPrep
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1 mr-4">
              <NavLink to="/spaces">Spaces</NavLink>
              <NavLink to="/tests">Test Center</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin">Admin</NavLink>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {isAuthenticated ? (
            <>


              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 rounded-full hover:bg-muted/50 p-1 md:pr-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </div>
                  <div className="hidden md:flex flex-col items-start gap-0.5">
                    <span className="text-sm font-medium leading-none">
                      {user?.name || 'User'}
                    </span>
                  </div>
                  <ChevronDown className={`hidden md:block h-4 w-4 text-muted-foreground transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/50 bg-popover p-1 shadow-lg shadow-black/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2.5 border-b border-border/50 md:hidden">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/profile"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            !isAuthPage && (
              <Button onClick={() => navigate('/login')} size="sm" className="gap-2 rounded-full px-5">
                <User className="h-4 w-4" />
                Login
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
