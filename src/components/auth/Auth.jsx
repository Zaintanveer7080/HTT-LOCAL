import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SignInForm from '@/components/auth/SignInForm';
import { Toaster } from '@/components/ui/toaster';

const Auth = () => {
  const [view, setView] = useState('signin'); // 'signin' is the only view now

  const renderContent = () => {
    switch (view) {
      case 'signin':
      default:
        return <SignInForm />;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-gray-800 dark:via-black dark:to-black">
      <Toaster />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md mx-auto shadow-2xl dark:shadow-primary/10 border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold gradient-text">
              Admin Login
            </CardTitle>
            <CardDescription>
              Sign in to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;