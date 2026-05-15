import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Home, Users, Zap, Briefcase, LogOut, Menu, AlertCircle, BookOpen, Settings,
} from 'lucide-react'
import { logout, getName, getRole } from '../lib/auth'

const NAV = [
  { to: '/',               icon: LayoutDashboard, label: 'Дашборд',    end: true  },
  { to: '/plots',          icon: Home,            label: 'Участки',     end: false },
  { to: '/members',        icon: Users,           label: 'Члены СТ',    end: false },
  { to: '/meters',         icon: Zap,             label: 'Счётчики',    end: false },
  { to: '/counterparties', icon: Briefcase,       label: 'Контрагенты', end: false },
  { to: '/debtors',        icon: AlertCircle,     label: 'Должники',    end: false },
  { to: '/journal',        icon: BookOpen,        label: 'Журнал операций', end: false },
  { to: '/settings',       icon: Settings,        label: 'Настройки',   end: false },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <aside
      className="flex flex-col bg-[#18181b] shrink-0 h-screen transition-all duration-200"
      style={{ width: collapsed ? 52 : 220 }}
    >
      {/* Логотип + кнопка */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-zinc-800 overflow-hidden">
        {!collapsed && (
          <span className="text-zinc-100 font-bold text-sm tracking-wide whitespace-nowrap mr-2">
            CONTROL<span className="text-blue-500">LING</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded p-1 shrink-0"
          title="Свернуть меню"
        >
          <Menu size={16} />
        </button>
      </div>

      {/* Навигация */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors overflow-hidden ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Подвал */}
      <div className="border-t border-zinc-800 p-2">
        <button
          onClick={() => { logout(); navigate('/login') }}
          title={collapsed ? 'Выйти' : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-zinc-600 hover:text-zinc-400 w-full overflow-hidden"
        >
          <LogOut size={14} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Выйти</span>}
        </button>
        {!collapsed && (
          <div className="px-2.5 mt-1">
            <p className="text-xs text-zinc-400 font-medium truncate">{getName() ?? '—'}</p>
            <p className="text-xs text-zinc-600 truncate">{getRole() ?? ''}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
