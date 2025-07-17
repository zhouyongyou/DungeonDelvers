import React from 'react';
import { EmptyState } from '../components/ui/EmptyState';

const RpcStatsPage: React.FC = () => {
  return (
    <EmptyState
      title="RPC Monitoring Disabled"
      description="The RPC monitoring system has been removed to reduce overhead since direct Alchemy connections are now being used."
    />
  );
};

export default RpcStatsPage;