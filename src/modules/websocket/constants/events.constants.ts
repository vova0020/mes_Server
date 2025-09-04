/* eslint-disable prettier/prettier */
/**
 * ===== WEBSOCKET EVENTS CONSTANTS =====
 * 
 * Этот файл содержит константы для всех WebSocket событий в MES системе.
 * Использование констант вместо строковых литералов обеспечивает:
 * - Типобезопасность
 * - Автодополнение в IDE
 * - Легкость рефакторинга
 * - Предотвращение опечаток
 * 
 * Структура названий событий: "категория:действие"
 * Это позволяет легко группировать и фильтровать события по типам.
 */

/**
 * Объект EVENTS содержит все доступные WebSocket события в системе.
 * Каждое событие имеет уникальное строковое значение, которое используется
 * для идентификации типа события при отправке и получении сообщений.
 */
export const EVENTS = {
  /**
   * === СОБЫТИЯ ЗАКАЗОВ ===
   * События, связанные с жизненным циклом производственных заказов
   */

  /** Событие о изменениях в заказе */
  ORDER_EVENT: 'order:event',
  /** Событие о создании заказа */
  ORDER_CREATED: 'order:created',
  /** Событие для статистики заказов */
  ORDER_STATS: 'order:stats',

  /**
 * === СОБЫТИЯ УПАКОВОК ===
 * События, связанные с жизненным циклом упаковок
 */
  /** Событие о изменениях в упаковке */
  PACKAGE_EVENT: 'package:event',
  /** Событие о создании упаковки */
  PACKAGE_CREATED: 'package:created',
  /** Событие о удалении упаковки */
  PACKAGE_DELETED: 'package:deleted',


  /**
  * === СОБЫТИЯ ДЕТАЛЕЙ ===
  * События, связанные с жизненным циклом деталей
  */
  /** Событие о изменениях в детали */
  DETAIL_EVENT: 'detail:event',
  /** Событие о создании детали */
  DETAIL_CREATED: 'detail:created',
  /** Событие о удалении детали */
  DETAIL_DELETED: 'detail:deleted',

  /**
  * === СОБЫТИЯ ПОДДОНОВ ===
  * События, связанные с жизненным циклом поддонов
  */
  /** Событие о изменениях в поддоне */
  PALLET_EVENT: 'pallet:event',
  /** Событие о создании поддона */
  PALLET_CREATED: 'pallet:created',
  /** Событие о удалении поддона */
  PALLET_DELETED: 'pallet:deleted',

  /**
  * === СОБЫТИЯ заданий на станки ===
  * События, связанные с жизненным циклом заданий на станки
  */
  /** Событие о изменениях в задании на станок */
  MACHINE_TASK_EVENT: 'machine_task:event',
  /** Событие о создании задания на станок */
  MACHINE_TASK_CREATED: 'machine_task:created',
  /** Событие о удалении задания на станок */
  MACHINE_TASK_DELETED: 'machine_task:deleted',

  /**
  * === СОБЫТИЯ СТАНКОВ ===
  * События, связанные с жизненным циклом станков
  */
  /** Событие о изменениях в станке */
  MACHINE_EVENT: 'machine:event',
  /** Событие о создании станка */
  MACHINE_CREATED: 'machine:created',
  /** Событие о удалении станка */
  MACHINE_DELETED: 'machine:deleted',

 /**
  * === СОБЫТИЯ НАСТРОЕК ===
  * События, связанные с жизненным циклом настроек
  */

  //  ==== Пользователи =======

  /** Событие о изменениях в пользователе */
  USER_EVENT: 'user:event',
  /** Событие о создании пользователя */
  USER_CREATED: 'user:created',
  /** Событие о удалении пользователя */
  USER_DELETED: 'user:deleted',

  //  ==== Материалы =======

  /** Событие о изменениях в материале */
  MATERIAL_EVENT: 'material:event',
  /** Событие о создании материала */
  MATERIAL_CREATED: 'material:created',
  /** Событие о удалении материала */
  MATERIAL_DELETED: 'material:deleted',

 //  ==== Потоки =======

  /** Событие о изменениях в потоке */
  STREAM_EVENT: 'stream:event',
  /** Событие о создании потока */
  STREAM_CREATED: 'stream:created',
  /** Событие о удалении потока */
  STREAM_DELETED: 'stream:deleted',

 //  ==== Этап производства уровень 1 =======

  /** Событие о изменениях в этапе производства уровень 1 */
  STAGE1_EVENT: 'stage1:event',
  /** Событие о создании этапа производства уровень 1 */
  STAGE1_CREATED: 'stage1:created',
  /** Событие о удалении этапа производства уровень 1 */
  STAGE1_DELETED: 'stage1:deleted',

 //  ==== Этап производства уровень 2 =======

  /** Событие о изменениях в этапе производства уровень 2 */
  STAGE2_EVENT: 'stage2:event',
  /** Событие о создании этапа производства уровень 2 */
  STAGE2_CREATED: 'stage2:created',
  /** Событие о удалении этапа производства уровень 2 */
  STAGE2_DELETED: 'stage2:deleted',

   //  ==== Технологические маршруты =======

  /** Событие о изменениях в технологическом маршруте */
  TECHNOLOGY_ROUTE_EVENT: 'technology_route:event',
  /** Событие о создании технологического маршрута */
  TECHNOLOGY_ROUTE_CREATED: 'technology_route:created',
  /** Событие о удалении технологического маршрута */
  TECHNOLOGY_ROUTE_DELETED: 'technology_route:deleted',

 //  ==== Настройка станков =======

  /** Событие о изменениях в настройке станка */
  MACHINE_SETTING_EVENT: 'machine_setting:event',
  /** Событие о создании настройки станка */
  MACHINE_SETTING_CREATED: 'machine_setting:created',
  /** Событие о удалении настройки станка */
  MACHINE_SETTING_DELETED: 'machine_setting:deleted',

   //  ==== Справочник упаковок =======

  /** Событие о изменениях в справочнике упаковок */
  PACKAGE_CATALOG_EVENT: 'package_catalog:event',
  /** Событие о создании справочника упаковок */
  PACKAGE_CATALOG_CREATED: 'package_catalog:created',
  /** Событие о удалении справочника упаковок */
  PACKAGE_CATALOG_DELETED: 'package_catalog:deleted',

   //  ==== Справочник деталей =======

  /** Событие о изменениях в справочнике деталей */
  DETAIL_CATALOG_EVENT: 'detail_catalog:event',
  /** Событие о создании справочника деталей */
  DETAIL_CATALOG_CREATED: 'detail_catalog:created',
  /** Событие о удалении справочника деталей */
  DETAIL_CATALOG_DELETED: 'detail_catalog:deleted',

   //  ==== Настройки пользователей =======

   /** Событие о изменениях в настройках пользователей */
   USER_SETTINGS_EVENT: 'user_settings:event',
   /** Событие о создании настройки пользователя */
   USER_SETTINGS_CREATED: 'user_settings:created',
   /** Событие о удалении настройки пользователя */
   USER_SETTINGS_DELETED: 'user_settings:deleted',

 //  ==== Настройка буфера =======

 /** Событие о изменениях в настройке буфера */
 BUFFER_SETTINGS_EVENT: 'buffer_settings:event',
 /** Событие о создании настройки буфера */
 BUFFER_SETTINGS_CREATED: 'buffer_settings:created',
 /** Событие о удалении настройки буфера */
 BUFFER_SETTINGS_DELETED: 'buffer_settings:deleted',





};



/**
 * Типы событий для TypeScript
 * Позволяет использовать автодополнение и проверку типов при работе с событиями
 */
export type EventType = typeof EVENTS[keyof typeof EVENTS];

/**
 * Категории событий для группировки и фильтрации
 * Полезно для создания подписок на определенные типы событий
 */
// export const EVENT_CATEGORIES = {
//   /** Все события, связанные с заказами */
//   ORDERS: ['order:created', 'order:status_changed'],

// } as const;
