import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, ShoppingCart, Menu, X, Truck, FileSpreadsheet, RefreshCw } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth >= 992);
    const location = useLocation();

    // Auto-close sidebar on window resize if needed
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 992) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-close sidebar on navigation on mobile
    React.useEffect(() => {
        if (window.innerWidth < 992) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Products', path: '/products', icon: Package },
        { name: 'Billing', path: '/billing', icon: ShoppingCart },
        { name: 'Purchase Bill', path: '/purchase-billing', icon: Truck },
        { name: 'Purchase History', path: '/purchase-bills', icon: FileText },
        { name: 'Invoices', path: '/invoices', icon: FileText },
        { name: 'Flipkart Net', path: '/flipkart-net', icon: RefreshCw },
        { name: 'Flipkart Report', path: '/flipkart-report', icon: FileSpreadsheet },
        { name: 'Meesho Report', path: '/meesho-report', icon: FileSpreadsheet },
        { name: 'Simple Electronics', path: '/simple-electronics', icon: ShoppingCart },
    ];

    const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="d-flex vh-100 overflow-hidden bg-light">
            {/* Sidebar */}
            <aside
                className={`transition-all bg-white border-end shadow-sm ${isSidebarOpen ? 'active' : ''
                    }`}
                style={{
                    width: '280px',
                    minWidth: '280px',
                    marginLeft: isSidebarOpen ? '0' : '-280px',
                    position: window.innerWidth < 992 ? 'fixed' : 'relative',
                    height: '100vh',
                    zIndex: 1050,
                    visibility: isSidebarOpen ? 'visible' : (window.innerWidth >= 992 ? 'visible' : 'hidden')
                }}
            >
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ height: '64px' }}>
                    <span className="h4 mb-0 fw-bold text-primary">
                        BillFlow
                    </span>
                    <button onClick={() => setIsSidebarOpen(false)} className="btn btn-link text-secondary d-lg-none">
                        <X size={24} />
                    </button>
                </div>

                <nav className="nav nav-pills flex-column p-3 gap-2 overflow-auto h-100" style={{ paddingBottom: '80px' }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-link d-flex align-items-center gap-3 transition-all ${isActive ? 'active shadow-sm' : 'text-dark border-0'
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
                <header className="navbar navbar-light bg-white border-bottom px-4" style={{ height: '64px', zIndex: 1040 }}>
                    <button
                        onClick={handleToggleSidebar}
                        className="btn btn-link text-secondary p-0 border-0 me-3"
                    >
                        {isSidebarOpen && window.innerWidth < 992 ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <div className="ms-auto d-flex align-items-center gap-3">
                        <span className="small text-secondary d-none d-md-block">Admin Panel</span>
                        <div className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: '32px', height: '32px' }}>
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-fill overflow-auto p-3 p-md-4">
                    {children}
                </main>
            </div>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 transition-all"
                    style={{ zIndex: 1045 }}
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;
