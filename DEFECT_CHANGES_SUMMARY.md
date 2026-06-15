# Изменения в системе отбраковки деталей

## Проблема
При полной отбраковке всех деталей с поддона, поддон деактивировался (`isActive = false`), но не удалялся. Это приводило к:
1. Накоплению "мертвых" записей в БД
2. Проблемам с поиском отбракованных деталей
3. Неверному подсчету возвращенных деталей в статистике

## Решение

### 1. Удаление пустых поддонов (вместо деактивации)

**Файл:** `src/modules/palletsProduct/services/pallets-Master.service.ts`

**Метод `defectPalletParts` (строка ~1341):**
- **Было:** `isActive = false` (soft delete)
- **Стало:** `pallet.delete()` (полное удаление)

**Метод `redistributePalletParts` (строка ~1455):**
- **Было:** `isActive = false` при `quantity = 0`
- **Стало:** `pallet.delete()` при `quantity = 0`

### 2. Исправление подсчета возвратов

**Файл:** `src/modules/statistics/services/statistics.service.ts`

#### Метод `getUnreturnedDefectsFilterOptions` (строка ~1129):
**Проблема:** Искал возвраты по `sourceReclamationId` (который НЕ заполняется в `returnPartsToProduction`)

**Решение:** Ищем возвраты по `partId`:
```typescript
// Было:
const returnMovements = await this.prisma.inventoryMovement.findMany({
  where: {
    sourceReclamationId: { in: reclamationIds },
    reason: 'RETURN_FROM_RECLAMATION',
    deltaQuantity: { gt: 0 },
  },
});

// Стало:
const returnMovements = await this.prisma.inventoryMovement.findMany({
  where: {
    partId: { in: partIds },  // По partId вместо sourceReclamationId
    reason: 'RETURN_FROM_RECLAMATION',
    deltaQuantity: { gt: 0 },
  },
});
```

#### Метод `getUnreturnedDefects` (строка ~1227):
**Аналогичное изменение** - группируем возвраты по `partId` вместо `reclamationId`

### 3. Схема БД (уже корректна)

**Файл:** `prisma/schema.prisma`

Связь `Reclamation.pallet` уже nullable с `onDelete: SetNull`:
```prisma
model Reclamation {
  palletId Int? @map("pallet_id")  // Nullable
  pallet   Pallet? @relation(..., onDelete: SetNull)  // При удалении поддона - NULL
}
```

## Как теперь работает система

### Отбраковка деталей (POST /master/defect-parts):
1. Создается запись в `Reclamation` с `palletId`
2. Уменьшается `quantity` на поддоне
3. **Если поддон пуст (`quantity = 0`)** → поддон **удаляется**
4. В `Reclamation.palletId` автоматически ставится `NULL` (благодаря `onDelete: SetNull`)

### Поиск отбракованных деталей:
1. **По заказу:** `Reclamation` → `Part` → `ProductionPackagePart` → `Package` → `Order`
2. **Подсчет возвратов:** Через `InventoryMovement` по `partId` + `reason = 'RETURN_FROM_RECLAMATION'`

### Статистика (GET /statistics/unreturned-defects):
1. Получаем все рекламации по фильтрам
2. **Считаем возвраты по `partId`** (а не по `reclamationId`!)
3. Вычисляем: `невозвращено = отбраковано - возвращено`

## Преимущества нового подхода

✅ **Чистая БД** - нет неактивных поддонов  
✅ **Не теряются данные** - все отбраковки в `Reclamation`  
✅ **Корректная статистика** - возвраты считаются по `partId`  
✅ **Связь с заказом сохраняется** - через `Part` → `Package` → `Order`  
✅ **История брака** - в `Reclamation.palletId` сохраняется, с какого поддона отбраковали (до удаления)

## Что не требует изменений

- ✅ Метод `returnPartsToProduction` - работает как есть
- ✅ Метод `getDefectStats` - уже ищет возвраты по `partId`
- ✅ Схема БД - уже поддерживает NULL в `palletId`
- ✅ `/order-statistics/:orderId` - использует правильный подсчет через `InventoryMovement`

## Проверка

После применения изменений проверьте:
1. `/master/defect-parts` - отбраковка всех деталей удаляет поддон
2. `/statistics/unreturned-defects?orderId=53` - правильно считает возвраты
3. `/order-statistics/145` - корректно показывает отбраковано/возвращено
