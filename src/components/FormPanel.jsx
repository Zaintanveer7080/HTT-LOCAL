import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FormPanel = ({ children, title, onClose }) => {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-0 bg-background z-10 flex flex-col"
    >
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </motion.div>
  );
};

export default FormPanel;