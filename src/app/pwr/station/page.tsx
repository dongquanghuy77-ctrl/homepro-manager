import React from 'react';
import MobileStationClient from '@/components/pwr/station/MobileStationClient';

export default function PwrMobileStationPage() {
  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', width: '100%' }}>
      <MobileStationClient />
    </div>
  );
}
