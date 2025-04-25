import EmojiPicker from "emoji-picker-react";

const EmojiPickerButton = ({ onEmojiClick, showPicker, setShowPicker }) => {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="emoji-button"
        title="Выбрать эмодзи"
      >
        😊
      </button>
      {showPicker && (
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "-10px",
            zIndex: "100",
          }}
        >
          <EmojiPicker
            // Обработчик выбора эмодзи, передает выбранный эмодзи в родительский компонент
            onEmojiClick={(emojiData) => {
              onEmojiClick(emojiData.emoji);
            }}
            // Устанавливаем ширину и высоту окна выбора эмодзи
            width={250}
            height={350}
            // Режим предлагаемых эмодзи - показывать недавно использованные
            suggestedEmojisMode="recents"
            // Отключаем поиск эмодзи
            searchDisabled={true}
            // Отключаем выбор тона кожи для эмодзи
            skinTonesDisabled={true}
            // Настройки предпросмотра эмодзи
            previewConfig={{
              // Включаем предпросмотр
              showPreview: true,
              // Устанавливаем эмодзи по умолчанию (улыбающееся лицо)
              defaultEmoji: "1f60a",
            }}
            // Включаем ленивую загрузку эмодзи для оптимизации производительности
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPickerButton;
