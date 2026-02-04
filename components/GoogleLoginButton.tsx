"use client";

import { GoogleLogin } from '@react-oauth/google';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getOrCreateKeypairForUser } from '@/lib/keypair';
import { LottieLoading } from '@/components/ui/LottieLoading';
import { useToast } from '@/components/ui/Toast';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      console.log('Google OAuth success!');

      // credentialResponse.credential is the ID Token (JWT)
      const idToken = credentialResponse.credential;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('ID Token received, authenticating with backend...');

      // Decode JWT to get user info (without verification)
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));

      console.log('User info:', { email: payload.email, sub: payload.sub });

      // Send ID Token (JWT) to backend for verification
      const authResponse = await authAPI.login(idToken);

      if (authResponse.success && authResponse.user) {
        console.log('Authentication successful!');
        
        // Generate deterministic keypair from Google sub
        // Same Google account = Same Sui address, always
        const keypair = await getOrCreateKeypairForUser(payload.sub);
        const suiAddress = keypair.getPublicKey().toSuiAddress();
        console.log('User Sui Address (deterministic from Google sub):', suiAddress);

        // Store user in zustand with deterministic address
        login(
          {
            id: authResponse.user.sub,
            email: payload.email,
            name: payload.name || payload.email,
            address: suiAddress,
            avatar: payload.picture,
          },
          idToken
        );

        // Call success callback
        if (onSuccess) {
          onSuccess();
        } else {
          // Default: redirect to dashboard
          router.push('/dashboard');
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Login failed';

      if (onError) {
        onError(errorMsg);
      } else {
        toast.error("Login Failed", errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    console.error('Google OAuth error');
    const errorMsg = 'Google login failed';

    if (onError) {
      onError(errorMsg);
    } else {
      toast.error("Login Failed", errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 py-3 px-6 bg-[#F0E6D0] rounded-lg">
          <LottieLoading size="sm" text="Signing in..." />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="filled_blue"
        size="large"
        width="100%"
      />
    </div>
  );
}
