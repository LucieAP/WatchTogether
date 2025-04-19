import styles from "./Modal.module.css";

export const LeaveRoomModal = ({ isOpen, onClose, onLeave }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Подтверждение</h3>
        <p className={styles.modalMessage}>
          Вы уверены, что хотите покинуть комнату?
        </p>

        <div className={styles.modalButtons}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonNeutral}`}
          >
            Отмена
          </button>
          <button
            onClick={onLeave}
            className={`${styles.button} ${styles.buttonDanger}`}
          >
            Да, покинуть
          </button>
        </div>
      </div>
    </div>
  );
};
