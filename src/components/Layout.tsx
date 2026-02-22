import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, ShoppingCart, Menu, X, Truck, FileSpreadsheet, ChevronDown, ChevronRight, Calculator } from 'lucide-react';

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

    const navSections = [
        {
            title: 'General',
            id: 'general',
            items: [
                { name: 'Dashboard', path: '/', icon: LayoutDashboard },
                { name: 'Products', path: '/products', icon: Package },
                { name: 'Customers', path: '/customers', icon: ShoppingCart },
                { name: 'Vendors', path: '/vendors', icon: Truck },
            ]
        },
        {
            title: 'Billing & Offline',
            id: 'billing',
            items: [
                { name: 'Billing', path: '/billing', icon: ShoppingCart },
                { name: 'Purchase Bill', path: '/purchase-billing', icon: Truck },
                { name: 'Purchase History', path: '/purchase-bills', icon: FileText },
                { name: 'Invoices', path: '/invoices', icon: FileText },
            ]
        },
        {
            title: 'Expenses',
            id: 'expenses',
            items: [
                { name: 'Record Expense', path: '/expenses/billing', icon: ShoppingCart },
                { name: 'Expense History', path: '/expenses/history', icon: FileText },
                { name: 'Manage Items', path: '/expenses/manage', icon: Package },
            ]
        },
        {
            title: 'Flipkart',
            id: 'flipkart',
            items: [
                { name: 'Flipkart Dashboard', path: '/flipkart-dashboard', icon: LayoutDashboard },
                { name: 'Flipkart Report', path: '/flipkart-report', icon: FileSpreadsheet },
                { name: 'Flipkart GST Report', path: '/flipkart-gst-report', icon: FileSpreadsheet },
                { name: 'Cash Back Report', path: '/flipkart-cashback-report', icon: FileSpreadsheet },
            ]
        },
        {
            title: 'Meesho',
            id: 'meesho',
            items: [
                { name: 'Meesho Dashboard', path: '/meesho-dashboard', icon: LayoutDashboard },
                { name: 'Meesho Report', path: '/meesho-report', icon: FileSpreadsheet },
                { name: 'Meesho Sales Report', path: '/meesho-sales-report', icon: FileSpreadsheet },
                { name: 'Meesho Sales Return', path: '/meesho-sales-return', icon: FileSpreadsheet },
            ]
        },
        {
            title: 'Calculator',
            id: 'calculator',
            items: [
                { name: 'Product Pricing', path: '/product-pricing', icon: Calculator },
            ]
        },
    ];

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const initialStates: Record<string, boolean> = {};
        navSections.forEach(section => {
            const hasActiveItem = section.items.some(item => location.pathname === item.path);
            initialStates[section.id] = hasActiveItem;
        });
        // Default first section to open if none are active
        if (!Object.values(initialStates).some(v => v)) {
            initialStates['general'] = true;
        }
        return initialStates;
    });

    const toggleSection = (id: string) => {
        setOpenSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Auto-open section when path changes
    useEffect(() => {
        navSections.forEach(section => {
            const hasActiveItem = section.items.some(item => location.pathname === item.path);
            if (hasActiveItem && !openSections[section.id]) {
                setOpenSections(prev => ({ ...prev, [section.id]: true }));
            }
        });
    }, [location.pathname]);

    const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="d-flex vh-100 overflow-hidden bg-light">
            {/* Sidebar */}
            <aside
                className={`transition-all bg-white border-end shadow-sm d-flex flex-column overflow-hidden ${isSidebarOpen ? 'active' : ''
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

                <nav className="nav nav-pills flex-column p-3 gap-1 overflow-y-auto overflow-x-hidden flex-grow-1" style={{ paddingBottom: '80px', minHeight: 0 }}>
                    {navSections.map((section) => {
                        const isOpen = openSections[section.id];
                        return (
                            <React.Fragment key={section.id}>
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="btn btn-link text-decoration-none d-flex align-items-center justify-content-between text-uppercase small fw-bold text-secondary mt-3 mb-1 px-2 border-0 w-100 text-start"
                                >
                                    <span>{section.title}</span>
                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <div className={`transition-all overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0'}`} style={{ maxHeight: isOpen ? '500px' : '0' }}>
                                    {section.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = (location.pathname + location.search) === item.path;

                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`nav-link d-flex align-items-center gap-3 transition-all mb-1 ${isActive ? 'active shadow-sm' : 'text-dark border-0'
                                                    }`}
                                                style={{ padding: '8px 12px' }}
                                            >
                                                <Icon size={18} />
                                                <span className="fw-medium">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </React.Fragment>
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
