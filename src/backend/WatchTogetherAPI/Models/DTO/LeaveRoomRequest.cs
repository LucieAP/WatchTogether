namespace WatchTogetherAPI.Models.DTO
{
    // enum тип, определяющий причину выхода из комнаты
    public enum LeaveRoomType
    {
        Manual,             // Явный (Ручной) выход по кнопке 
        BrowserClose,       // Закрытие вкладки/браузера
        Timeout,            // Таймаут неактивности
        NetworkDisconnect   // Потеря соединения
    }
    public class LeaveRoomRequest
    {
        public LeaveRoomType LeaveType { get; set; } = LeaveRoomType.Manual;
    }
}