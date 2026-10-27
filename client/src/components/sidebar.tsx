import {
  Bell,
  Home,
  Blocks,
  Wallet,
  BookPlus,
  Users,
  LineChart,
  Package2,
} from 'lucide-react';
import { Button } from './ui/button';
import useAuth from '../lib/use-auth';


const Sidebar = () => {
  const { user } = useAuth();

  const contributor = user?.role_name == "Contributor"; 
  const readOnly = user?.role_name == "Read-only"; 
  const admin = user?.role_name == "Administrator";

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Package2 className="h-6 w-6" />
            <span>Expenditure App</span>
          </div>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            
            <a
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </a>


            { (admin || contributor) && 
            (<a
              href="/add-category"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Blocks className="h-4 w-4" />
              Add Category
            </a>) }


            { (admin || contributor) &&
            (<a
              href="/add-project"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Wallet className="h-4 w-4" />
              Add Project
            </a>) }
            

            { (admin || contributor) && 
            (<a
              href="/add-financial-info"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <BookPlus className="h-4 w-4" />
              Add Financial Info
            </a>) }


            { admin &&   
            <a
              href="/users-roles"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Users className="h-4 w-4" />
              Users & Roles
            </a> }

            <a
              href="/analytics"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <LineChart className="h-4 w-4" />
              Analytics
            </a>

          </nav>
        </div>
        <div className="mt-auto p-4"></div>
      </div>
    </div>
  );
};

export default Sidebar;
