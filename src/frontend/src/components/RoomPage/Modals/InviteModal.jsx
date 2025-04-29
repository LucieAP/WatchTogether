import styles from "./Modal.module.css";
import { toast } from "react-hot-toast";

export const InviteModal = ({
  isOpen,
  onClose,
  onCopy,
  invitationLink,
  mouseDownOnContentRef,
}) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(invitationLink)
      .then(() => {
        toast.success("Ссылка скопирована!");
        onCopy();
      })
      .catch((err) => {
        console.error("Ошибка копирования:", err);
        toast.error("Не удалось скопировать ссылку");
      });
  };

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
            onClick={handleCopy}
          >
            Скопировать
          </button>
        </div>
      </div>
    </div>
  );
};
