/**
 * ===== WEBSOCKET ROOMS CONSTANTS =====
 *
 * Константы для названий WebSocket комнат в MES системе.
 * Комнаты используются для группировки пользователей по:
 * - Отделам/участкам производства
 * - Производственным линиям
 * - Ролям и должностям
 * - Типам уведомлений
 */

/**
 * Объект ROOMS содержит все доступные комнаты для WebSocket соединений.
 * Каждая комната представляет собой логическую группу пользователей,
 * которые должны получать определенные типы сообщений.
 */
export const ROOMS = {
  /**
   * === КОМНАТЫ ПО ОТДЕЛАМ ===
   * Группировка пользователей по производственным участкам
   */
  /** Комната мастеров */
  MASTER_CEH: 'room:masterceh',
  /** Комната мастера упаковки */
  MASTER_YPACK: 'room:masterypack',
  /** Комната станков со сменным заданием упаковки */
  MACHINES_YPACK: 'room:machinesypack',
  /** Комната станков со сменным заданием */
  MACHINES: 'room:machines',
  /** Комната станков без сменного задания */
  MACHINES_NO_SMEN: 'room:machinesnosmen',
  /** Комната технолога  */
  TECHNOLOGIST: 'room:technologist',
  /** Комната директора  */
  DIRECTOR: 'room:director',
  /** Комната директора  */
  STATISTICKS: 'room:statisticks',
};

/**
 * Типы комнат для TypeScript
 * Обеспечивает автодополнение и проверку типов
 */
export type RoomType = (typeof ROOMS)[keyof typeof ROOMS];

/**
 * Категории комнат для удобной группировки
 * Полезно для массовых операций с комнатами определенного типа
 */
// export const ROOM_CATEGORIES = {
//   /** Все комнаты отделов */
//   DEPARTMENTS: [ROOMS.PRODUCTION_FLOOR, ROOMS.WAREHOUSE, ROOMS.QUALITY_CONTROL, ROOMS.MAINTENANCE],

//   /** Все комнаты производственных линий */
//   PRODUCTION_LINES: [ROOMS.LINE_1, ROOMS.LINE_2],

//   /** Все комнаты по ролям */
//   ROLES: [ROOMS.SUPERVISORS, ROOMS.OPERATORS],

//   /** Все системные комнаты */
//   SYSTEM: [ROOMS.ALERTS, ROOMS.GLOBAL_UPDATES],
// } as const;
