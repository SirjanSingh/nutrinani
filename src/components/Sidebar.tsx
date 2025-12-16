import { LayoutDashboard, ScanBarcode, ChefHat, Mic, Package, Users, LogOut } from "lucide-react";
import { Section } from "@/pages/Index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/nutrinani-logo.png";

interface SidebarProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

const navItems = [
  { id: "dashboard" as Section, label: "Dashboard", icon: LayoutDashboard },
  { id: "scanner" as Section, label: "Scan & Verdict", icon: ScanBarcode },
  { id: "recipes" as Section, label: "Recipes & List", icon: ChefHat },
  { id: "inventory" as Section, label: "Inventory", icon: Package },
  { id: "community" as Section, label: "Community", icon: Users },
  { id: "voice" as Section, label: "Nani Voice Bot", icon: Mic },
];

export const Sidebar = ({ activeSection, setActiveSection }: SidebarProps) => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-sidebar-border p-6 flex flex-col">
      <div className="mb-12 text-center">
        <img src={logo} alt="NutriNani Logo" className="w-32 h-32 mx-auto mb-4 rounded-full" />
        <h1 className="text-3xl font-bold mb-1">
          <span style={{ color: '#6DAA33' }}>Nutri</span>
          <span style={{ color: '#C86A3B' }}>Nani</span>
        </h1>
        <p className="text-sm text-muted-foreground">Decoding labels for a healthier you</p>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                ${isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate flex-1" title={user.email}>
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Demo version for hackathon
        </p>
      </div>
    </aside>
  );
};
