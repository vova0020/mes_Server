Описание базы данных для MES-системы мебельного производства

Дата: 10 июня 2025
Автор: [Ваше имя/Название команды]

Введение

Этот документ описывает структуру базы данных для системы управления производством (MES) мебельного предприятия. База данных предназначена для управления пользователями, производственными заказами, буферами, процессами, станками, маршрутами, материалами, комплектовщиками и упаковкой. Документ служит основой для разработчиков при создании и развитии системы. Он является "живым" и будет обновляться по мере необходимости.

Содержание

Модуль пользователей
Модуль производства
Модуль буферов
Модуль производственных процессов
Модуль станков
Модуль маршрутизации
Модуль материалов
Модуль комплектовщиков
Модуль упаковки
Модуль сборки из полуфабрикатов
Логирование и безопасность
Масштабируемость и гибкость
Рекомендации и примечания

1. Модуль пользователей

Назначение: Управляет учетными записями пользователей, их ролями и доступом. Поддерживает роли "Комплектовщик" (работа на всех участках), "Мастер" и "Рабочее место" (для упаковки).

Таблицы

Users (Пользователи)
Назначение: Хранит основные данные пользователей системы для аутентификации и идентификации.

user_id (PK, Auto-increment, Integer) — Уникальный идентификатор пользователя, используется как первичный ключ.

login (Text, Not Null) — Логин для входа в систему, уникальный текстовый идентификатор.

password (Text, Encrypted, Not Null) — Зашифрованный пароль для безопасного входа.

created_at (Date, Not Null) — Дата создания учетной записи для отслеживания истории.

updated_at (Date, Not Null) — Дата последнего обновления учетной записи для аудита изменений.

Связи: Один-к-одному с User Details (через user_id), Многие-ко-многим с Roles (через User Roles).

User Details (Детали пользователя)
Назначение: Хранит дополнительные персональные данные пользователей для управления и отчетности.

detail_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи деталей пользователя.

user_id (FK к Users, Integer, Not Null) — Ссылка на пользователя из таблицы Users.

first_name (Text, Not Null) — Имя пользователя для идентификации.

last_name (Text, Not Null) — Фамилия пользователя для идентификации.

phone (Text, Nullable) — Телефон для связи, может быть пустым.

position (Text, Nullable) — Должность для определения роли в организации.

salary (Numeric, Nullable) — Зарплата для учета затрат, может быть пустой.

Связи: Один-к-одному с Users (через user_id).

Roles (Роли)
Назначение: Определяет доступные роли в системе для управления доступом.


role_id (PK, Auto-increment, Integer) — Уникальный идентификатор роли.

role_name (Text, Not Null) — Название роли (например, "Administrator", "Picker", "Master").

Связи: Многие-ко-многим с Users (через User Roles).

User Roles (Роли пользователей)
Назначение: Связывает пользователей с их ролями для гибкого управления доступом.


user_role_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи связи.

user_id (FK к Users, Integer, Not Null) — Ссылка на пользователя.

role_id (FK к Roles, Integer, Not Null) — Ссылка на роль.

Связи: Связывает Users и Roles (через user_id и role_id).

Login Logs (Логи входа)
Назначение: Ведет учет попыток входа для аудита и обеспечения безопасности.


log_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи лога.

user_id (FK к Users, Integer, Nullable) — Ссылка на пользователя, может быть NULL при неудачной попытке.

ip_address (Text, Not Null) — IP-адрес для отслеживания источника входа.

device_info (Text, Nullable) — Информация об устройстве для анализа входов.

attempt_time (DateTime, Not Null) — Время попытки входа для хронологии событий.

success (Boolean, Not Null) — Успешность входа (TRUE — успех, FALSE — неудача).

Связи: Один-ко-многим с Users (через user_id).


2. Модуль производства

Назначение: Управляет производственными заказами, пакетами, деталями и паллетами. Обеспечивает создание сменных заданий, отслеживание статуса и связь с комплектовщиками и упаковкой.

Таблицы

Orders (Заказы)
Назначение: Хранит данные о производственных заказах для планирования и отслеживания.


order_id (PK, Auto-increment, Integer) — Уникальный идентификатор заказа.

batch_number (Text, Not Null) — Номер партии для идентификации заказа.

order_name (Text, Not Null) — Название заказа для удобства работы.

completion_percentage (Numeric, 0-100, Not Null) — Процент завершения для мониторинга прогресса.

created_at (Date, Not Null) — Дата создания для учета времени.

completed_at (Date, Nullable) — Дата завершения, пустая до окончания.

launch_permission (Boolean, Not Null) — Разрешение на запуск для контроля процесса.

is_completed (Boolean, Not Null) — Флаг завершения заказа.

Связи: Один-ко-многим с Packages (через order_id).


Packages (Пакеты)
Назначение: Хранит данные о пакетах внутри заказов для группировки деталей.


package_id (PK, Auto-increment, Integer) — Уникальный идентификатор пакета.

order_id (FK к Orders, Integer, Not Null) — Ссылка на заказ.

package_code (Text, Not Null) — Код пакета для идентификации.

package_name (Text, Not Null) — Название пакета для удобства.

completion_percentage (Numeric, 0-100, Not Null) — Процент завершения пакета.

Связи: Многие-к-одному с Orders (через order_id), Многие-ко-многим с Parts (через ProductionPackageParts).


ProductionPackageParts (Пакеты-Детали для производства)
Назначение: Связывает пакеты с деталями для учета состава.

ppp_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи связи.

package_id (FK к Packages, Integer, Not Null) — Ссылка на пакет.

part_id (FK к Parts, Integer, Not Null) — Ссылка на деталь.

quantity (Numeric, Not Null) — Количество деталей в пакете.

Связи: Связывает Packages и Parts (через package_id и part_id).


Parts (Детали)
Назначение: Хранит информацию о деталях, включая сборные и полуфабрикаты, для управления производством.


part_id (PK, Auto-increment, Integer) — Уникальный идентификатор детали.

part_code (Text, Not Null) — Код детали для идентификации.

part_name (Text, Not Null) — Название детали для удобства.

material_id (FK к Materials, Integer, Not Null) — Ссылка на материал детали.

size (Text, Not Null) — Размер детали для спецификации.

total_quantity (Numeric, Not Null) — Общее количество деталей в производстве.

status (ENUM: 'PENDING', 'IN_PROGRESS', 'COMPLETED', Not Null) — Статус детали для отслеживания.

is_subassembly (Boolean, DEFAULT FALSE, Not Null) — Флаг сборной детали.

route_id (FK к Routes, Integer, Not Null) — Ссылка на маршрут обработки.

ready_for_main_flow (Boolean, DEFAULT FALSE, Not Null) — Готовность к основному потоку.

return_stage_id (FK к Route Stages, Integer, Nullable) — Стадия возврата в маршрут.

Связи: Один-ко-многим с Pallets (через part_id), Многие-к-одному с PickerTasks, Один-ко-многим с PartRouteProgress, Многие-ко-многим с Packages (через ProductionPackageParts), Многие-ко-многим с PackingPackages (через PackageParts).


BillOfMaterials (Спецификация сборки)
Назначение: Определяет состав сборных деталей из полуфабрикатов.


bom_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи.

parent_part_id (FK к Parts, Integer, Not Null) — Ссылка на сборную деталь.

child_part_id (FK к Parts, Integer, Not Null) — Ссылка на полуфабрикат.

quantity (Numeric, Not Null) — Количество полуфабрикатов в сборке.

Связи: Связывает Parts (через parent_part_id и child_part_id).

Pallets (Паллеты)
Назначение: Хранит данные о паллетах для транспортировки деталей.


pallet_id (PK, Auto-increment, Integer) — Уникальный идентификатор паллеты.

part_id (FK к Parts, Integer, Not Null) — Ссылка на деталь.

pallet_name (Text, Not Null) — Название паллеты для идентификации.

Huds*Назначение:** Многие-ко-многим с Buffer Cells (через Pallets-Buffer Cells), Один-ко-многим с MachineAssignments, Один-ко-многим с PalletStageProgress.



3. Модуль буферов

Назначение: Управляет буферами и ячейками для временного хранения паллет. Поддерживает взаимодействие с комплектовщиками для перемещения деталей.

Таблицы


Buffers (Буферы)
Назначение: Хранит данные о буферах для организации хранения.


buffer_id (PK, Auto-increment, Integer) — Уникальный идентификатор буфера.

buffer_name (Text, Not Null) — Название буфера для удобства.

description (Text, Nullable) — Описание буфера для документации.

location (Text, Not Null) — Местоположение буфера для логистики.

Связи: Один-ко-многим с Buffer Cells (через buffer_id).


Buffer Cells (Ячейки буфера)
Назначение: Хранит данные о ячейках для управления их состоянием.


cell_id (PK, Auto-increment, Integer) — Уникальный идентификатор ячейки.

buffer_id (FK к Buffers, Integer, Not Null) — Ссылка на буфер.

cell_code (Text, Not Null) — Код ячейки для идентификации.

status (ENUM: 'AVAILABLE', 'OCCUPIED', 'RESERVED', Not Null) — Статус ячейки.

capacity (Numeric, Not Null) — Максимальная вместимость ячейки.

current_load (Numeric, Not Null) — Текущая загрузка ячейки.

created_at (Date, Not Null) — Дата создания ячейки.

updated_at (Date, Not Null) — Дата последнего обновления.

Связи: Многие-к-одному с Buffers (через buffer_id), Многие-ко-многим с Pallets (через Pallets-Buffer Cells).


Pallets-Buffer Cells (Паллеты-Ячейки)
Назначение: Связывает паллеты с ячейками для отслеживания их местоположения.


pallet_cell_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи.

pallet_id (FK к Pallets, Integer, Not Null) — Ссылка на паллету.

cell_id (FK к Buffer Cells, Integer, Not Null) — Ссылка на ячейку.

placed_at (DateTime, Not Null) — Время размещения паллеты.

removed_at (DateTime, Nullable) — Время удаления паллеты, может быть пустым.

Связи: Связывает Pallets и Buffer Cells (через pallet_id и cell_id).

4. Модуль производственных процессов

Назначение: Определяет линии и стадии производства. Поддерживает автоматическое добавление этапа "упаковка" как финального.

Таблицы

Production Lines (Производственные линии)
Назначение: Хранит данные о линиях для организации производства.


line_id (PK, Auto-increment, Integer) — Уникальный идентификатор линии.

line_name (Text, Not Null) — Название линии для идентификации.

line_type (Text, Not Null) — Тип линии для классификации.

Связи: Многие-ко-многим с Production Stages Level 1 (через Lines-Stages).


Production Stages Level 1 (Стадии 1 уровня)
Назначение: Хранит основные стадии производства.


stage_id (PK, Auto-increment, Integer) — Уникальный идентификатор стадии.

stage_name (Text, Not Null) — Название стадии для удобства.

description (Text, Nullable) — Описание стадии для документации.

created_at (Date, Not Null) — Дата создания стадии.

updated_at (Date, Not Null) — Дата последнего обновления.

Связи: Один-ко-многим с Production Stages Level 2 (через stage_id).


Production Stages Level 2 (Стадии 2 уровня)
Назначение: Хранит подстадии для детализации процессов.


substage_id (PK, Auto-increment, Integer) — Уникальный идентификатор подстадии.

stage_id (FK к Production Stages Level 1, Integer, Not Null) — Ссылка на стадию 1 уровня.

substage_name (Text, Not Null) — Название подстадии.

description (Text, Nullable) — Описание подстадии.

allowance (Numeric, Not Null) — Допуск для контроля качества.

Связи: Многие-к-одному с Production Stages Level 1 (через stage_id).

5. Модуль станков

Назначение: Управляет станками и их задачами, включая станки упаковки.

Таблицы

Machines (Станки)
Назначение: Хранит данные о станках для управления их работой.

machine_id (PK, Auto-increment, Integer) — Уникальный идентификатор станка.

machine_name (Text, Not Null) — Название станка для идентификации.

status (ENUM: 'ACTIVE', 'INACTIVE', 'MAINTENANCE', Not Null) — Статус станка.

recommended_load (Numeric, Not Null) — Рекомендуемая нагрузка станка.

load_unit (Text, Not Null) — Единица измерения нагрузки.

is_task_changeable (Boolean, Not Null) — Возможность смены задачи.

Связи: Многие-ко-многим с Production Stages Level 1 (через Machines-Stages).

Machines-Stages (Станки-Стадии)
Назначение: Связывает станки со стадиями для планирования.

machine_stage_id (PK, Auto-increment, Integer) — Уникальный идентификатор связи.

machine_id (FK к Machines, Integer, Not Null) — Ссылка на станок.

stage_id (FK к Production Stages Level 1, Integer, Not Null) — Ссылка на стадию.

Связи: Связывает Machines и Production Stages Level 1 (через machine_id и stage_id).

6. Модуль маршрутизации

Назначение: Определяет маршруты и последовательность стадий, включая финальный этап "упаковка".

Таблицы

Routes (Маршруты)
Назначение: Хранит данные о маршрутах для управления процессами.

route_id (PK, Auto-increment, Integer) — Уникальный идентификатор маршрута.

route_name (Text, Not Null) — Название маршрута для удобства.

Связи: Один-ко-многим с Route Stages (через route_id).


Route Stages (Стадии маршрута)
Назначение: Определяет последовательность стадий в маршруте.

route_stage_id (PK, Auto-increment, Integer) — Уникальный идентификатор стадии маршрута.

route_id (FK к Routes, Integer, Not Null) — Ссылка на маршрут.

stage_id (FK к Production Stages Level 1, Integer, Not Null) — Ссылка на стадию 1 уровня.

substage_id (FK к Production Stages Level 2, Integer, Nullable) — Ссылка на подстадию, может быть пустой.

sequence_number (Numeric, Not Null) — Порядок стадии в маршруте.

Связи: Многие-к-одному с Routes (через route_id).


7. Модуль материалов

Назначение: Управляет материалами и их группами для учета сырья.

Таблицы

Material Groups (Группы материалов)
Назначение: Хранит группы материалов для классификации.

group_id (PK, Auto-increment, Integer) — Уникальный идентификатор группы.

group_name (Text, Not Null) — Название группы для удобства.

Связи: Многие-ко-многим с Materials (через Groups-Materials).

Materials (Материалы)
Назначение: Хранит данные о материалах для производства деталей.

material_id (PK, Auto-increment, Integer) — Уникальный идентификатор материала.

material_name (Text, Not Null) — Название материала.

unit (Text, Not Null) — Единица измерения материала.

Связи: Многие-ко-многим с Material Groups (через Groups-Materials).



8. Модуль комплектовщиков

Назначение: Управляет комплектовщиками для перемещения деталей на всех участках.

Таблицы

Pickers (Комплектовщики)
Назначение: Хранит данные о комплектовщиках для управления их задачами.

picker_id (PK, Auto-increment, Integer) — Уникальный идентификатор комплектовщика.

user_id (FK к Users, Integer, Nullable) — Ссылка на пользователя, может быть пустой.

Связи: Один-ко-многим с PickerTasks (через picker_id).


PickerTasks (Задачи комплектовщиков)
Назначение: Хранит задачи комплектовщиков для перемещения деталей.


task_id (PK, Auto-increment, Integer) — Уникальный идентификатор задачи.

picker_id (FK к Pickers, Integer, Nullable) — Ссылка на комплектовщика, может быть пустой.

part_id (FK к Parts, Integer, Not Null) — Ссылка на деталь.

from_cell_id (FK к Buffer Cells, Integer, Nullable) — Исходная ячейка.

to_cell_id (FK к Buffer Cells, Integer, Nullable) — Целевая ячейка.

to_machine_id (FK к Machines, Integer, Nullable) — Целевой станок.

status (ENUM: 'PENDING', 'IN_PROGRESS', 'COMPLETED', Not Null) — Статус задачи.

assigned_at (DateTime, Not Null) — Время назначения задачи.

completed_at (DateTime, Nullable) — Время завершения, может быть пустым.

Связи: Многие-к-одному с Pickers (через picker_id), Parts (через part_id), Buffer Cells (через from_cell_id и to_cell_id), Machines (через to_machine_id).

9. Модуль упаковки

Назначение: Управляет упаковками и процессом упаковки на финальном этапе.

Таблицы

PackingPackages (Упаковки)
Назначение: Хранит данные об упаковках для завершения производства.

package_id (PK, Auto-increment, Integer) — Уникальный идентификатор упаковки.

package_name (Text, Not Null) — Название упаковки для идентификации.

status (ENUM: 'PENDING', 'IN_PROGRESS', 'COMPLETED', Not Null) — Статус упаковки.

created_at (Date, Not Null) — Дата создания упаковки.

completed_at (Date, Nullable) — Дата завершения, может быть пустой.

Связи: Один-ко-многим с PackingTasks (через package_id), Многие-ко-многим с Parts (через PackageParts).

PackageParts (Упаковки-Детали)
Назначение: Связывает упаковки с деталями для учета состава.

package_part_id (PK, Auto-increment, Integer) — Уникальный идентификатор связи.

package_id (FK к PackingPackages, Integer, Not Null) — Ссылка на упаковку.

part_id (FK к Parts, Integer, Not Null) — Ссылка на деталь.

Связи: Связывает PackingPackages и Parts (через package_id и part_id).

PackingTasks (Задачи упаковки)
Назначение: Хранит задачи упаковки для управления процессом.

task_id (PK, Auto-increment, Integer) — Уникальный идентификатор задачи.

package_id (FK к PackingPackages, Integer, Not Null) — Ссылка на упаковку.

machine_id (FK к Machines, Integer, Not Null) — Ссылка на станок упаковки.

assigned_to (FK к Users, Integer, Nullable) — Ссылка на мастера, может быть пустой.

status (ENUM: 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED', Not Null) — Статус задачи.

priority (Numeric, Not Null) — Приоритет задачи для планирования.

assigned_at (DateTime, Not Null) — Время назначения задачи.

completed_at (DateTime, Nullable) — Время завершения, может быть пустым.

Связи: Многие-к-одному с PackingPackages (через package_id), Machines (через machine_id), Users (через assigned_to).

10. Модуль сборки из полуфабрикатов

Назначение: Управляет сборкой деталей из полуфабрикатов.

Таблицы

SubassemblyProgress (Прогресс сборки)
Назначение: Отслеживает прогресс сборки сборных деталей.

sap_id (PK, Auto-increment, Integer) — Уникальный идентификатор записи.

parent_part_id (FK к Parts, Integer, Not Null) — Ссылка на сборную деталь.

route_stage_id (FK к Route Stages, Integer, Not Null) — Ссылка на стадию маршрута.

status (ENUM: 'PENDING', 'IN_PROGRESS', 'COMPLETED', Not Null) — Статус сборки.

completed_at (DateTime, Nullable) — Время завершения, может быть пустым.
Связи: Многие-к-одному с Parts (через parent_part_id), Route Stages (через route_stage_id).
11. Логирование и безопасность
Описание: Обеспечивает аудит входов через Login Logs и ролевой доступ через Roles и User Roles. Логирует действия комплектовщиков и мастеров для контроля.
12. Масштабируемость и гибкость
Описание: Поддерживает добавление новых сущностей (комплектовщики, станки, упаковки) через связи многие-ко-многим. Работает с/без комплектовщиков.
13. Рекомендации и примечания
Использовать триггеры для автообновления статусов в Parts и PackingPackages.
Добавить индексы на machine_id, pallet_id, part_id для производительности.
Создать ER-диаграммы для визуализации связей.
Заключение

Документ готов для создания базы данных MES-системы мебельного производства. Он охватывает все модули и будет обновляться по мере развития проекта.