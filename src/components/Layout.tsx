import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const TITLES: Record<string, string> = {
  '/': 'Дашборд',
  '/plots': 'Участки',
  '/members': 'Члены СТ',
  '/meters': 'Счётчики',
  '/counterparties': 'Контрагенты',
  '/debtors': 'Должники',
  '/journal': 'Журнал операций',
  '/settings': 'Настройки',
}

export default function Layout() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Controlling'

  return (
    <div className="flex h-screen bg-zinc-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-zinc-200 px-6 h-[52px] flex items-center shrink-0">
          <h1 className="text-[15px] font-semibold text-zinc-900">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
