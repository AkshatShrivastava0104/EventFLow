import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmText = 'Confirm', cancelText = 'Cancel',
  tone = 'danger', loading, onConfirm, onClose,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{cancelText}</Button>
          <Button
            variant={tone}
            onClick={onConfirm}
            loading={loading}
          >{confirmText}</Button>
        </>
      }
    >
      <div />
    </Modal>
  );
}
