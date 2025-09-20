import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ForgotPasswordForm = ({ onSwitchView }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('sendLink'); // 'sendLink', 'updatePassword'
  const { sendPasswordResetOtp, updateUserPassword, session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      setStep('updatePassword');
      toast({
        title: "Authenticated",
        description: "You can now set a new password.",
      });
    }
  }, [session, toast]);

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    await sendPasswordResetOtp(email);
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password should be at least 6 characters.",
      });
      return;
    }
    setLoading(true);
    const { error } = await updateUserPassword(newPassword);
    setLoading(false);
    if (!error) {
      onSwitchView();
    }
  };

  return (
    <div className="space-y-6">
      {step === 'sendLink' && (
        <form onSubmit={handleSendResetLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-forgot">Email</Label>
            <Input
              id="email-forgot"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
          </Button>
        </form>
      )}

      {step === 'updatePassword' && (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Set New Password'}
          </Button>
        </form>
      )}

      <div className="text-center text-sm">
        Remembered your password?{' '}
        <button
          type="button"
          onClick={onSwitchView}
          className="font-medium text-primary hover:underline"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;