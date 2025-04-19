import styles from "./Modal.module.css";

export const CloseVideoModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose} // Закрываем модалку при клике на оверлей
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Подтверждение</h3>
        <p className={styles.modalMessage}>
          Вы уверены, что хотите закрыть видео?
        </p>

        <div className={styles.modalButtons}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonNeutral}`}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.button} ${styles.buttonDanger}`}
          >
            Да, закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
