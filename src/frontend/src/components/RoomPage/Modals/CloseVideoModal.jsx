import styles from "./Modal.module.css";
import { useCallback } from "react";

export const CloseVideoModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const handleModalContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleCloseClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClose(e);
    },
    [onClose]
  );

  const handleConfirmClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onConfirm(e);
    },
    [onConfirm]
  );

  const handleOverlayClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClose(e);
    },
    [onClose]
  );

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={handleModalContentClick}>
        <h3 className={styles.modalTitle}>Подтверждение</h3>
        <p className={styles.modalMessage}>
          Вы уверены, что хотите закрыть видео?
        </p>

        <div className={styles.modalButtons}>
          <button
            onClick={handleCloseClick}
            className={`${styles.button} ${styles.buttonNeutral}`}
          >
            Отмена
          </button>
          <button
            onClick={handleConfirmClick}
            className={`${styles.button} ${styles.buttonDanger}`}
          >
            Да, закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
