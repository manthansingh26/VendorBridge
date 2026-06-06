import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { ROLES } from "../../utils/constants";
import { getNotifications, markNotificationRead } from "../../api/report.api";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Check,
} from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      getNotifications()
        .then((res) => {
          if (res.data?.success) {
            const list = res.data.data || [];
            setNotifications(list);
            setUnreadCount(list.filter((n) => !n.isRead).length);
          }
        })
        .catch((err) => console.error("Error fetching notifications:", err));
    }
  }, [user]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (socket) {
      socket.on("new-notification", (notif) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    }
    return () => {
      if (socket) {
        socket.off("new-notification");
      }
    };
  }, [socket]);

  // Click outside listener to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await markNotificationRead(id);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/profile", label: "Profile", icon: User },
  ];

  if (user?.role === ROLES.ADMIN) {
    navLinks.push({ to: "/admin/users", label: "Admin Panel", icon: Shield });
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Vendor<span className="text-primary-600">Bridge</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu & Notifications */}
          <div className="hidden md:flex items-center gap-3">
            {/* Notifications Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-lg relative transition-colors ${
                  notifOpen ? "bg-gray-100" : ""
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-5 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <span className="font-semibold text-sm text-gray-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 font-semibold">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 text-xs hover:bg-gray-50 flex items-start justify-between gap-2 transition-colors ${
                            !n.isRead ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{n.title}</p>
                            <p className="text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-gray-400 block mt-1">
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkRead(e, n.id)}
                              className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-700 transition-all self-center"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-100 ml-1">
              {user?.avatar ? (
                <img
                  src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${user.avatar}`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <Link to="/profile" className="text-sm font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors">
              {user?.username || user?.name?.toLowerCase()?.replace(/\s/g, "")}
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-slide-up">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
