import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        </div>
        <div className="p-4 text-slate-300">
          {children}
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};