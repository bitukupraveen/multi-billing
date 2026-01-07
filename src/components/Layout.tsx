import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, ShoppingCart, Menu, X, Truck } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Products', path: '/products', icon: Package },
        { name: 'Billing', path: '/billing', icon: ShoppingCart },
        { name: 'Purchase Bill', path: '/purchase-billing', icon: Truck },
        { name: 'Purchase History', path: '/purchase-bills', icon: FileText },
        { name: 'Invoices', path: '/invoices', icon: FileText },
    ];

    const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="d-flex vh-100 overflow-hidden bg-light">
            {/* Sidebar */}
            <aside
                className={`d-flex flex-column bg-white border-end transition-all ${isSidebarOpen ? 'd-block' : 'd-none d-lg-block'
                    }`}
                style={{ width: isSidebarOpen ? '280px' : '0', minWidth: isSidebarOpen ? '280px' : '0', overflowX: 'hidden' }}
            >
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom h-auto" style={{ height: '64px' }}>
                    <span className="h4 mb-0 fw-bold text-primary">
                        BillFlow
                    </span>
                    <button onClick={() => setIsSidebarOpen(false)} className="btn btn-link text-secondary d-lg-none">
                        <X size={24} />
                    </button>
                </div>

                <nav className="nav nav-pills flex-column p-3 gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-link d-flex align-items-center gap-3 ${isActive ? 'active' : 'text-dark'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="fw-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-fill d-flex flex-column overflow-hidden position-relative">
                {/* Header */}
                <header className="navbar navbar-light bg-white border-bottom px-4" style={{ height: '64px' }}>
                    <button
                        onClick={handleToggleSidebar}
                        className="btn btn-link text-secondary p-0 border-0 me-3"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="ms-auto d-flex align-items-center gap-3">
                        <div className="rounded-circle bg-primary" style={{ width: '32px', height: '32px' }}></div>
                    </div>
                </header>

                <main className="flex-fill overflow-auto p-4">
                    {children}
                </main>
            </div>

            {/* Overlay for mobile - Optional for Bootstrap if we rely on d-none/d-block classes */}
            {isSidebarOpen && (
                <div
                    className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50"
                    style={{ zIndex: 1040 }}
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;
