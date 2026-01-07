import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import ProductManager from './pages/ProductManager';
import PurchaseBilling from './pages/PurchaseBilling';
import PurchaseBillsList from './pages/PurchaseBillsList';

import Invoices from './pages/Invoices';

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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
