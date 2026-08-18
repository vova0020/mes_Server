-- ============================================
-- Скрипт для добавления системы привязки операторов к станкам
-- Дата: 2026-08-18
-- Описание: Добавляет поле machine_code в таблицу machines
--           и создает таблицу operator_machine_bindings
-- ============================================

-- Шаг 1: Добавить поле machine_code в таблицу machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS machine_code TEXT;

-- Шаг 2: Создать уникальный индекс для machine_code
CREATE UNIQUE INDEX IF NOT EXISTS machines_machine_code_key ON machines(machine_code);

-- Шаг 3: Создать таблицу привязок операторов к станкам
CREATE TABLE IF NOT EXISTS operator_machine_bindings (
    binding_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    machine_id INTEGER NOT NULL,
    operator_number INTEGER NOT NULL,
    bound_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unbound_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Внешние ключи
    CONSTRAINT operator_machine_bindings_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT operator_machine_bindings_machine_id_fkey 
        FOREIGN KEY (machine_id) 
        REFERENCES machines(machine_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Шаг 4: Создать индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS operator_machine_bindings_user_id_idx 
    ON operator_machine_bindings(user_id);
    
CREATE INDEX IF NOT EXISTS operator_machine_bindings_machine_id_is_active_idx 
    ON operator_machine_bindings(machine_id, is_active);
    
CREATE INDEX IF NOT EXISTS operator_machine_bindings_machine_id_operator_number_is_act_idx 
    ON operator_machine_bindings(machine_id, operator_number, is_active);

-- Шаг 5: Добавить комментарии к таблице и полям
COMMENT ON TABLE operator_machine_bindings IS 'Таблица привязок операторов к станкам';
COMMENT ON COLUMN operator_machine_bindings.binding_id IS 'Уникальный идентификатор привязки';
COMMENT ON COLUMN operator_machine_bindings.user_id IS 'ID оператора (пользователя)';
COMMENT ON COLUMN operator_machine_bindings.machine_id IS 'ID станка';
COMMENT ON COLUMN operator_machine_bindings.operator_number IS 'Порядковый номер оператора на станке (1, 2, 3...)';
COMMENT ON COLUMN operator_machine_bindings.bound_at IS 'Время привязки к станку';
COMMENT ON COLUMN operator_machine_bindings.unbound_at IS 'Время отвязки от станка (NULL = активная привязка)';
COMMENT ON COLUMN operator_machine_bindings.is_active IS 'Флаг активности привязки';

COMMENT ON COLUMN machines.machine_code IS 'Уникальный код станка для привязки операторов (формат: буква + 3 цифры, например H431)';

-- Готово!
SELECT 'Изменения успешно применены!' AS status;
SELECT 'Следующий шаг: запустите скрипт генерации кодов станков' AS next_step;
SELECT 'Команда: npx ts-node prisma/generate-machine-codes.ts' AS command;
