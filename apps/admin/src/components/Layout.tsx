import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LayoutProvider } from '../layout/LayoutContext';

export function Layout() {
  return (
    <LayoutProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Topbar />
          <div className="content scroll">
            <Outlet />
          </div>
        </main>
      </div>
    </LayoutProvider>
  );
}
