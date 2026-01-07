import React from 'react';

const Dashboard: React.FC = () => {
    return (
        <div className="container-fluid p-0">
            <h1 className="h3 mb-4 text-dark">Dashboard</h1>
            <div className="row g-4">
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted fw-bold text-uppercase small">Total Sales</h6>
                            <p className="card-text h2 fw-bold text-primary mb-0">₹0.00</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted fw-bold text-uppercase small">Invoices</h6>
                            <p className="card-text h2 fw-bold text-primary mb-0">0</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted fw-bold text-uppercase small">Products</h6>
                            <p className="card-text h2 fw-bold text-primary mb-0">0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
