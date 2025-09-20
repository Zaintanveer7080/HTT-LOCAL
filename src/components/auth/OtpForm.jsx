import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const OtpForm = ({ email, onSwitchView }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyOtp } = useAuth();

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    await verifyOtp(email, otp);
    setLoading(false);
  };

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="otp">One-Time Password</Label>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Sign In'}
      </Button>
      <div className="text-center text-sm">
        Entered the wrong email?{' '}
        <button
          type="button"
          onClick={onSwitchView}
          className="font-medium text-primary hover:underline"
        >
          Go Back
        </button>
      </div>
    </form>
  );
};

export default OtpForm;