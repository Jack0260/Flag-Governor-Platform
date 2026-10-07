import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, Flag, ShieldAlert, ScrollText, FlaskConical,
  Users, Calendar, Code, BookOpen, Settings, LogOut, ChevronDown,
  Building2, Menu, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/utils';

type PageId =
  | 'dashboard' | 'flags' | 'risk-review' | 'audit' | 'experiments'
  | 'segment-simulator' | 'calendar' | 'sdk-examples' | 'api-keys'
  | 'docs' | 'settings';

interface LayoutProps {
  children: ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: typeof Flag; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'flags', label: 'Feature Flags', icon: Flag, group: 'Overview' },
  { id: 'risk-review', label: 'Release Risk Review', icon: ShieldAlert, group: 'Overview' },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText, group: 'Governance' },
  { id: 'calendar', label: 'Change Calendar', icon: Calendar, group: 'Governance' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, group: 'Insights' },
  { id: 'segment-simulator', label: 'Segment Simulator', icon: Users, group: 'Insights' },
  { id: 'sdk-examples', label: 'SDK Examples', icon: Code, group: 'Developer' },
  { id: 'api-keys', label: 'API Keys', icon: Settings, group: 'Developer' },
  { id: 'docs', label: 'Documentation', icon: BookOpen, group: 'Developer' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Developer' },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, activeOrg, organizations, setActiveOrg, signOut, activeMembership } = useAuth();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const grouped = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);

  const groupOrder = ['Overview', 'Governance', 'Insights', 'Developer'];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-200 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-sm">
            <Flag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">Flag Governor</div>
            <div className="text-[10px] text-gray-400 leading-tight">Progressive Delivery</div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="ml-auto lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Org selector */}
        {activeOrg && (
          <div className="px-3 py-3 border-b border-gray-200 relative">
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
            >
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{activeOrg.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{activeOrg.slug}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${orgMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {orgMenuOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => { setActiveOrg(org); setOrgMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${org.id === activeOrg.id ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {groupOrder.map((group) => (
            <div key={group}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group}</div>
              <div className="space-y-0.5">
                {grouped[group]?.map((item) => {
                  const Icon = item.icon;
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{user?.email}</div>
              {activeMembership && (
                <Badge className={ROLE_COLORS[activeMembership.role]}>
                  {ROLE_LABELS[activeMembership.role]}
                </Badge>
              )}
            </div>
            <button onClick={() => signOut()} className="text-gray-400 hover:text-red-500 p-1" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Flag Governor</span>
          </div>
          <div className="w-6" />
        </div>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
