import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import ProductManager from './pages/ProductManager';
import PurchaseBilling from './pages/PurchaseBilling';
import PurchaseBillsList from './pages/PurchaseBillsList';

import Invoices from './pages/Invoices';
import FlipkartReport from './pages/FlipkartReport';
import FlipkartGSTReport from './pages/FlipkartGSTReport';
import FlipkartCashBackReport from './pages/FlipkartCashBackReport';
import FlipkartDashboard from './pages/FlipkartDashboard';
import MeeshoReport from './pages/MeeshoReport';
import MeeshoSalesRepo from './pages/MeeshoSalesRepo';
import MeeshoSalesReturn from './pages/MeeshoSalesReturn';
import MeeshoDashboard from './pages/MeeshoDashboard';
import ProductPricing from './pages/ProductPricing';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductManager />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/purchase-billing" element={<PurchaseBilling />} />
          <Route path="/purchase-bills" element={<PurchaseBillsList />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/flipkart-report" element={<FlipkartReport />} />
          <Route path="/flipkart-gst-report" element={<FlipkartGSTReport />} />
          <Route path="/flipkart-cashback-report" element={<FlipkartCashBackReport />} />
          <Route path="/flipkart-dashboard" element={<FlipkartDashboard />} />
          <Route path="/meesho-report" element={<MeeshoReport />} />
          <Route path="/meesho-sales-report" element={<MeeshoSalesRepo />} />
          <Route path="/meesho-sales-return" element={<MeeshoSalesReturn />} />
          <Route path="/meesho-dashboard" element={<MeeshoDashboard />} />
          <Route path="/product-pricing" element={<ProductPricing />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
