import React from 'react';
import AddHoldingModal from './AddHoldingModal';
import EditHoldingModal from './EditHoldingModal';
import BulkRemoveModal from './BulkRemoveModal';
import AddMoreModal from './AddMoreModal';
import SellHoldingModal from './SellHoldingModal';
import AiImportModal from './AiImportModal';
export default function InvestmentModals({ data }) {
  return <>
    <AddHoldingModal data={data} />
    <EditHoldingModal data={data} />
    <BulkRemoveModal data={data} />
    <AddMoreModal data={data} />
    <SellHoldingModal data={data} />
    <AiImportModal data={data} />
  </>;
}
