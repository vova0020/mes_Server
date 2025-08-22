/**
 * ===== WEBSOCKET INTERFACES =====
 * 
 * Файл содержит TypeScript интерфейсы для типизации данных
 * в WebSocket системе MES. Интерфейсы обеспечивают:
 * - Типобезопасность при работе с данными
 * - Автодополнение в IDE
 * - Документирование структуры данных
 * - Проверку корректности на этапе компиляции
 */

/**
 * Интерфейс для описания пользователя, подключенного к WebSocket.
 * Используется для хранения информации о пользователе в объекте Socket.
 * Эта информация помогает определять, какие сообщения должен получать конкретный пользователь.
 */
export interface SocketUser {
  /** Уникальный идентификатор пользователя (обязательное поле) */
  userId: string;
  
  /** Электронная почта пользователя (опционально, может отсутствовать у анонимных пользователей) */
  email?: string;
  
  /** Массив ролей и прав пользователя (определяет доступ к определенным функциям) */
  roles?: string[];
  
  /** Отдел или подразделение, в котором работает пользователь (используется для автоматического подключения к комнатам) */
  department?: string;
  
  /** Должность пользователя (определяет уровень доступа и типы уведомлений) */
  position?: string;
  
  /** Рабочая смена пользователя (помогает фильтровать сообщения по времени) */
  shift?: string;
}

/**
 * Интерфейс для событий, связанных с заказами.
 * Используется при отправке уведомлений о создании, изменении статуса
 * или приоритета производственных заказов.
 */
export interface OrderEvent {
  /** Уникальный идентификатор заказа */
  orderId: string;
  
  /** Текущий статус заказа (например: 'новый', 'в работе', 'завершен') */
  status: string;
  
  /** Приоритет выполнения заказа (опционально) */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  /** Производственная линия, на которой выполняется заказ (опционально) */
  productionLine?: string;
  
  /** Предполагаемое время завершения заказа (опционально) */
  estimatedCompletion?: Date;
  
  /** Идентификатор пользователя, который внес изменения */
  updatedBy: string;
  
  /** Время создания события */
  timestamp: Date;
}

/**
 * Интерфейс для событий, связанных с оборудованием.
 * Используется при отправке уведомлений о поломках, смене статуса
 * или необходимости технического обслуживания оборудования.
 */
export interface EquipmentEvent {
  /** Уникальный идентификатор оборудования */
  equipmentId: string;
  
  /** Название оборудования (человекочитаемое) */
  equipmentName: string;
  
  /** Текущий статус оборудования */
  status: 'online' | 'offline' | 'maintenance' | 'error';
  
  /** Код ошибки (если статус 'error') */
  errorCode?: string;
  
  /** Описание ошибки для оператора (если статус 'error') */
  errorDescription?: string;
  
  /** Производственная линия, на которой расположено оборудование */
  productionLine: string;
  
  /** Идентификатор пользователя, который сообщил о проблеме */
  reportedBy: string;
  
  /** Время создания события */
  timestamp: Date;
}

/**
 * Интерфейс для событий, связанных с производственными процессами.
 * Используется при отправке уведомлений о начале, приостановке
 * или завершении производственных операций.
 */
export interface ProductionEvent {
  /** Уникальный идентификатор производственной операции */
  productionId: string;
  
  /** Идентификатор связанного заказа */
  orderId: string;
  
  /** Текущий статус производственного процесса */
  status: 'started' | 'paused' | 'completed' | 'cancelled';
  
  /** Производственная линия, на которой выполняется операция */
  productionLine: string;
  
  /** Общее количество к производству (опционально) */
  quantity?: number;
  
  /** Количество уже произведенных единиц (опционально) */
  completedQuantity?: number;
  
  /** Идентификатор оператора, ответственного за операцию */
  operatorId: string;
  
  /** Время создания события */
  timestamp: Date;
}

/**
 * Интерфейс для пользовательских уведомлений.
 * Используется для отправки персональных и групповых уведомлений пользователям.
 * Поддерживает различные типы уведомлений и уровни приоритета.
 */
export interface UserNotification {
  /** Уникальный идентификатор уведомления */
  id: string;
  
  /** Заголовок уведомления (краткое описание) */
  title: string;
  
  /** Полный текст уведомления */
  message: string;
  
  /** Тип уведомления (определяет цветовую схему и иконку в UI) */
  type: 'info' | 'warning' | 'error' | 'success';
  
  /** Приоритет уведомления (влияет на порядок отображения и способ доставки) */
  priority: 'low' | 'normal' | 'high';
  
  /** ID конкретного пользователя для персональных уведомлений (опционально) */
  targetUserId?: string;
  
  /** Название комнаты для групповых уведомлений (опционально) */
  targetRoom?: string;
  
  /** Флаг прочтения уведомления пользователем */
  isRead: boolean;
  
  /** ID пользователя, создавшего уведомление */
  createdBy: string;
  
  /** Время создания уведомления */
  createdAt: Date;
}

// Структура для системных сообщений
export interface SystemMessage {
  id: string;
  message: string;
  type: 'maintenance' | 'alert' | 'announcement' | 'shutdown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAreas?: string[]; // Какие области затрагивает
  scheduledFor?: Date; // Для запланированных событий
  createdAt: Date;
}

// Структура для данных подключения к комнате
export interface RoomJoinData {
  room: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>; // Дополнительные данные
}

// Структура для ошибок WebSocket
export interface SocketError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * === НОВЫЕ ИНТЕРФЕЙСЫ ДЛЯ MES СОБЫТИЙ ===
 * Типизированные интерфейсы для событий заказов, упаковок и других сущностей
 */

// Интерфейс для событий заказов
export interface OrderEventPayload {
  orderId: string;
  action: 'created' | 'updated' | 'deleted';
  affectedRooms?: string[];
}

// Интерфейс для событий упаковок
export interface PackageEventPayload {
  packageId: string;
  action: 'created' | 'updated' | 'deleted';
  affectedRooms?: string[];
}

// Интерфейс для событий деталей
export interface DetailEventPayload {
  detailId: string;
  action: 'created' | 'updated' | 'deleted';
  affectedRooms?: string[];
}

// Интерфейс для событий материалов
export interface MaterialEventPayload {
  materialId: string;
  action: 'created' | 'updated' | 'deleted';
  affectedRooms?: string[];
}

// Интерфейс для событий настроек станков
export interface MachineSettingEventPayload {
  machineId: string;
  settingId: string;
  action: 'created' | 'updated' | 'deleted';
  affectedRooms?: string[];
}

// Базовая структура для всех WebSocket событий
export interface BaseSocketEvent {
  eventId: string;
  eventType: string;
  payload: any;
  userId: string;
  timestamp: Date;
  room?: string;
}