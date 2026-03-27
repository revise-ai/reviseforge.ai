import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="flex">
        <Sidebar />
        <main className="ml-22.5 flex-1 min-h-screen">{children}</main>
      </div>
    </LanguageProvider>
  );
}
