import React from 'react';
import TransactionModals from './TransactionModals';
import FinanceInsightModals from './FinanceInsightModals';

export default function FinanceModals(props) {
  return <>
    <TransactionModals {...props} />
    <FinanceInsightModals {...props} />
  </>;
}
