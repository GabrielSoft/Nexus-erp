import { BarChart3, Boxes, LayoutDashboard, LogOut, Users, Wallet } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const links = [['Dashboard', '/', LayoutDashboard], ['Clientes', '/customers', Users], ['Produtos', '/products', Boxes], ['Vendas', '/sales', BarChart3], ['Financeiro', '/financial', Wallet], ['Relatórios', '/reports', BarChart3]] as const;

export function Layout() {
  const { user, logout } = useAuth();
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#2b1b63,transparent_35%)]">
    <aside className="fixed inset-y-0 w-64 border-r border-white/10 bg-ink/80 p-5">
      <div className="mb-10 text-xl font-bold">NEXUS <span className="text-electric">ERP</span></div>
      <nav className="space-y-1">{links.map(([name, to, Icon]) => <NavLink key={to} to={to} className="nav"><Icon size={17}/>{name}</NavLink>)}</nav>
      <div className="absolute bottom-16 left-5 right-5 truncate text-xs text-slate-500">{user?.name || user?.email}</div>
      <button onClick={() => void logout()} className="nav absolute bottom-5"><LogOut size={17}/>Sair</button>
    </aside>
    <main className="ml-64 p-8"><Outlet /></main>
  </div>;
}
