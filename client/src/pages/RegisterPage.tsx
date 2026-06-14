import { RegisterForm } from '@/components/Auth/RegisterForm';
import Squares from '@/components/common/Squares';

export const RegisterPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="w-full absolute inset-0">
        <Squares 
          direction="diagonal"
          speed={0.5}
          squareSize={40}
        />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
};
