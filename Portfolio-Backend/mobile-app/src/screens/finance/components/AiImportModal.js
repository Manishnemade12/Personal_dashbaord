import React from 'react';
import ModularAiImportModal from './ai-import/AiImportModal';

/**
 * AI Portfolio Screenshot Import Modal (Modular Wrapper)
 * Supports multi-image upload, Grok Vision / OCR extraction,
 * and review/merge verification before saving to database.
 */
export default function AiImportModal(props) {
  return (
    <ModularAiImportModal
      {...props}
      onImportSuccess={() => {
        if (props.data?.loadData) {
          props.data.loadData();
        }
      }}
    />
  );
}

export { ModularAiImportModal };
