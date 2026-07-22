import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { apiFetch } from '../utils/api';
import {
  LayoutDashboard,
  User,
  Award,
  CheckSquare,
  Building,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  FileText,
  Search
} from 'lucide-react';

import type { RootState } from '../store';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 120 seconds (2 minutes)
      const interval = setInterval(fetchNotifications, 120000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Define sidebar routes based on role
  const getSidebarItems = (): SidebarItem[] => {
    if (!user) return [];

    switch (user.role) {
      case 'STUDENT':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
          { name: 'Profile Details', path: '/student/profile', icon: User },
        ];
      case 'FACULTY':
        return [
          { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
          { name: 'Enterprise Search', path: '/search', icon: Search },
        ];
      case 'HOD':
        return [
          { name: 'HOD Analytics', path: '/hod/dashboard', icon: TrendingUp },
          { name: 'Verification Queue', path: '/faculty/dashboard', icon: CheckSquare },
          { name: 'Enterprise Search', path: '/search', icon: Search },
        ];
      case 'PLACEMENT_OFFICER':
        return [
          { name: 'Placement Analytics', path: '/placement/dashboard', icon: Building },
          { name: 'Enterprise Search', path: '/search', icon: Search },
        ];
      case 'ADMIN':
        return [
          { name: 'Executive Insights', path: '/institution/dashboard', icon: TrendingUp },
          { name: 'Verification Engine', path: '/faculty/dashboard', icon: CheckSquare },
          { name: 'HOD Analytics', path: '/hod/dashboard', icon: FileText },
        ];

      default:
        return [];
    }
  };

  const sidebarItems = getSidebarItems();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border/80 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <span className="font-bold tracking-tight text-slate-800">VFSTR AEPS SYSTEM</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Icon */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:sticky w-64 bg-white border-r border-border flex flex-col justify-between p-4 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <span className="font-extrabold tracking-tight text-lg text-slate-800">
                VFSTR AEPS SYSTEM
              </span>
            </div>
            <button className="md:hidden p-1.5 text-slate-400 hover:text-slate-800" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User badge */}
          <div className="px-2 py-3 bg-slate-50 border border-border rounded-xl flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/10 text-primary font-bold rounded-full border border-primary/20 flex items-center justify-center text-sm">
              {user?.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                {user?.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Links list */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-primary/10 border border-primary/20 text-primary font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={`h-4.5 w-4.5 text-slate-400 transition-transform ${isActive ? 'translate-x-0.5 text-primary' : 'group-hover:translate-x-0.5'}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer logout - only visible on mobile drawer sidebar */}
        <button
          onClick={handleLogout}
          className="w-full flex md:hidden items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-650 hover:bg-red-50 hover:text-red-700 border border-transparent rounded-xl transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-border sticky top-0 z-30 shadow-sm">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Portal Section</span>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mt-0.5">VFSTR AEPS System</h2>
          </div>
          <div className="flex items-center gap-4 relative">
            {/* Notifications Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 border border-border transition-all relative"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notification Overlay Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 bg-slate-50 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-primary hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-muted-foreground">No notifications.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleMarkAsRead(n._id)}
                          className={`p-3 text-left transition-colors cursor-pointer ${
                            n.isRead ? 'hover:bg-slate-50 bg-transparent' : 'bg-primary/5 hover:bg-primary/10'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <p className="text-xs font-bold text-slate-800">{n.title}</p>
                            {!n.isRead && <span className="h-1.5 w-1.5 bg-primary rounded-full mt-1 shrink-0"></span>}
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-border rounded-xl">
              <div className="h-6 w-6 bg-primary/15 text-primary font-bold rounded-full border border-primary/20 flex items-center justify-center text-xs">
                {user?.name.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{user?.name}</span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-105 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dashboard Pages Mount */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
