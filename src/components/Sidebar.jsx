import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, ShoppingCart, TrendingUp, CreditCard, User, Users, Package, Settings, BarChart2, DollarSign, Banknote, History } from 'lucide-react';
import { useData } from '@/contexts/DataContext';

const navItems = [
  { name: 'dashboard', label: 'Dashboard', icon: Home },
  { name: 'sales', label: 'Sales', icon: TrendingUp },
  { name: 'purchase', label: 'Purchases', icon: ShoppingCart },
  { name: 'transactions', label: 'Transactions', icon: History },
  { name: 'expenses', label: 'Expenses', icon: CreditCard },
  { type: 'divider', label: 'Management' },
  { name: 'items', label: 'Items', icon: Package },
  { name: 'customers', label: 'Customers', icon: Users },
  { name: 'suppliers', label: 'Suppliers', icon: User },
  { type: 'divider', label: 'Finance' },
  { name: 'cashAndBank', label: 'Cash & Bank', icon: Banknote },
  { name: 'payments', label: 'Payments', icon: DollarSign },
  { name: 'reports', label: 'Reports', icon: BarChart2 },
  { type: 'divider' },
  { name: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ activeModule, setActiveModule }) => {
  const { data } = useData();
  const companyLogo = data?.settings?.companyLogo;
  const companyName = data?.settings?.companyName || 'ERP System';
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      className={`relative flex flex-col bg-gray-900 text-gray-200 sidebar-gradient transition-all duration-300 ease-in-out`}
      initial={{ width: isExpanded ? '16rem' : '5rem' }}
      animate={{ width: isExpanded ? '16rem' : '5rem' }}
    >
      <div className="flex items-center justify-center p-4 border-b border-gray-700/50">
        {companyLogo ? (
          <img src={companyLogo} alt="Logo" className="h-10 w-10 rounded-full" />
        ) : (
          <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
            {companyName.charAt(0)}
          </div>
        )}
        {isExpanded && <h1 className="ml-3 text-xl font-bold">{companyName}</h1>}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto no-scrollbar">
        {navItems.map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div key={index} className="pt-2">
                {isExpanded && <h3 className="px-3 text-xs font-semibold uppercase text-gray-500">{item.label}</h3>}
                {!isExpanded && <hr className="border-gray-700 mx-3 my-2" />}
              </div>
            );
          }
          return (
            <motion.a
              key={item.name}
              href="#"
              onClick={() => setActiveModule(item.name)}
              className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                activeModule === item.name
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-700'
              } ${!isExpanded ? 'justify-center' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <item.icon className="h-5 w-5" />
              {isExpanded && <span className="ml-4 font-medium">{item.label}</span>}
            </motion.a>
          );
        })}
      </nav>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gray-700 text-white rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-primary z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: `rotate(${isExpanded ? '180deg' : '0deg'})` }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </motion.div>
  );
};

export default Sidebar;