import * as React from 'react';

interface EmailTemplateProps {
  type: 'sign-in' | 'activation';
  url: string;
  productName: string;
}

export function EmailTemplate({ type, url, productName }: EmailTemplateProps) {
  const isSignIn = type === 'sign-in';
  const title = isSignIn ? "Sign in" : "Activate your account";
  const buttonText = isSignIn ? "Sign in" : "Activate account";
  const message = isSignIn
    ? `Click the link below to sign in to your ${productName} account.`
    : `Click the link below to activate your ${productName} account.`;

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '24px' }}>{title}</h1>
      <p style={{ color: '#555', fontSize: '16px', marginBottom: '24px' }}>
        {message}
      </p>
      <a 
        href={url} 
        style={{ 
          backgroundColor: '#0070f3', 
          color: 'white', 
          padding: '12px 24px', 
          textDecoration: 'none', 
          borderRadius: '4px', 
          display: 'inline-block', 
          marginBottom: '24px' 
        }}
      >
        {buttonText}
      </a>
      <p style={{ color: '#777', fontSize: '14px' }}>
        If you didn&apos;t request this email, you can safely ignore it.
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid #eaeaea', margin: '24px 0' }} />
      <p style={{ color: '#999', fontSize: '12px' }}>
        &copy; {new Date().getFullYear()} {productName}. All rights reserved.
      </p>
    </div>
  );
}