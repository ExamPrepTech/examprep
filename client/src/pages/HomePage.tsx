import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/UI/Button';
import { ThemeToggle } from '@/components/UI/ThemeToggle';
import { motion } from 'framer-motion';

export const HomePage = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl text-center space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-tighter uppercase italic">
            Dashboard
          </h1>
          <p className="text-xl text-neutral-500 font-light">
            Welcome back, <span className="font-bold text-foreground">{user?.name}</span>
          </p>
        </div>

        <div className="p-12 border border-border rounded-2xl bg-background/50 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-primary shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-background text-3xl font-bold">
                {user?.name?.[0]}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-neutral-500">{user?.email}</p>
          </div>

          <div className="pt-6">
            <Button variant="outline" className="h-12 px-8" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 -z-10 bg-gradient-to-t from-secondary/50 to-transparent" />
    </div>
  );
};
