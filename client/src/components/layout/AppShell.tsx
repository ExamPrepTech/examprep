import { Navbar } from '@/components/common/Navbar';
import { LeftRail } from './LeftRail';

interface AppShellProps {
  children: React.ReactNode;
  /** Hide rail (e.g. for full-bleed pages). */
  hideRail?: boolean;
}

export const AppShell = ({ children, hideRail }: AppShellProps) => (
  <div className="flex flex-col h-screen">
    <Navbar />
    <div className="flex flex-1 min-h-0">
      {!hideRail && <LeftRail />}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  </div>
);

export default AppShell;
