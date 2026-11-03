import { ReactNode } from 'react';
import Sidebar from './sidebar';
import Header from './header';

const PageLayout = ({ children }: { children: ReactNode }) => (
  <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[300px_1fr]">
    <Sidebar />
    <div className="flex flex-col min-w-0">
      <Header />
      {children}
    </div>
  </div>
);

export default PageLayout;
