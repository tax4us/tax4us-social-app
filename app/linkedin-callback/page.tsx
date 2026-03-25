"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LinkedInCallbackContent() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const authCode = searchParams.get('code');
    const authError = searchParams.get('error');
    
    if (authCode) {
      setCode(authCode);
    } else if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">LinkedIn Authorization</h1>
        
        {code && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 font-medium">✅ Authorization Successful!</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authorization Code (copy this):
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs"
                rows={4}
                readOnly
                value={code}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
            
            <p className="text-sm text-gray-600">
              Copy the authorization code above and provide it to Claude to complete the LinkedIn integration.
            </p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">❌ Authorization failed: {error}</p>
            <p className="text-red-600 text-sm mt-2">Please try the authorization process again.</p>
          </div>
        )}
        
        {!code && !error && (
          <div className="text-center">
            <p className="text-gray-600">Processing authorization...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LinkedInCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LinkedInCallbackContent />
    </Suspense>
  );
}