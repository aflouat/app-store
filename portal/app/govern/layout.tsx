import { GovernSidebar } from '@/components/govern/GovernSidebar'

export default function GovernLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <GovernSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}