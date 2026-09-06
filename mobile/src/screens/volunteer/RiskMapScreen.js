import React from 'react';
import RiskMapView from '../shared/RiskMapView';

// Same read-only map component as the Citizen dashboard (PRD sec.10.2:
// "Risk Map" can reuse the Citizen "Nearby Risk Map").
export default function RiskMapScreen() {
  return <RiskMapView />;
}
