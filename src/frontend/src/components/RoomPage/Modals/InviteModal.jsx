import styles from "./Modal.module.css";

export const InviteModal = ({
  isOpen,
  onClose,
  onCopy,
  showNotification,
  invitationLink,
  mouseDownOnContentRef,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      id="modal"
      onClick={onClose}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          mouseDownOnContentRef.current = false;
        }
      }}
    >
      <div
        className={styles.modalContent}
        onMouseDown={() => {
          mouseDownOnContentRef.current = true;
        }}
      >
        <h2 className={styles.modalTitle}>Пригласить</h2>
        <div className={styles.inviteLinkContainer}>
          <span className={styles.inviteLink}>{invitationLink}</span>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onCopy}
          >
            Скопировать
          </button>
        </div>
        {showNotification && (
          <div className={styles.notification}>Ссылка скопирована!</div>
        )}
      </div>
    </div>
  );
};
