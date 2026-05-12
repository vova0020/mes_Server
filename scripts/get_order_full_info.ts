import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getOrderFullInfo(orderId: number) {
  console.log('='.repeat(80));
  console.log(`ПОЛНАЯ ИНФОРМАЦИЯ ПО ЗАКАЗУ ID: ${orderId}`);
  console.log('='.repeat(80));

  try {
    // 1. Основная информация о заказе
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        packages: {
          include: {
            composition: true,
            productionPackageParts: {
              include: {
                part: {
                  include: {
                    material: true,
                    route: true,
                  },
                },
              },
            },
            palletAssignments: {
              include: {
                pallet: {
                  include: {
                    part: true,
                  },
                },
              },
            },
            packingTasks: {
              include: {
                machine: true,
                assignedUser: {
                  include: {
                    userDetail: true,
                  },
                },
              },
            },
            statusHistory: {
              include: {
                user: {
                  include: {
                    userDetail: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
        statusHistory: {
          include: {
            user: {
              include: {
                userDetail: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      console.log(`❌ Заказ с ID ${orderId} не найден`);
      return;
    }

    // Вывод основной информации о заказе
    console.log('\n📋 ОСНОВНАЯ ИНФОРМАЦИЯ О ЗАКАЗЕ');
    console.log('-'.repeat(80));
    console.log(`Номер партии: ${order.batchNumber}`);
    console.log(`Название: ${order.orderName}`);
    console.log(`Статус: ${order.status}`);
    console.log(`Завершен: ${order.isCompleted ? 'Да' : 'Нет'}`);
    console.log(`Процент выполнения: ${order.completionPercentage}%`);
    console.log(`Приоритет: ${order.priority}`);
    console.log(`Разрешение на запуск: ${order.launchPermission ? 'Да' : 'Нет'}`);
    console.log(`Детали объединены: ${order.partsConsolidated ? 'Да' : 'Нет'}`);
    console.log(`Дата создания: ${order.createdAt.toLocaleString('ru-RU')}`);
    console.log(`Дата обновления: ${order.updatedAt ? order.updatedAt.toLocaleString('ru-RU') : 'Не обновлялся'}`);
    console.log(`Дата завершения: ${order.completedAt ? order.completedAt.toLocaleString('ru-RU') : 'Не завершен'}`);
    console.log(`Требуемая дата: ${order.requiredDate.toLocaleString('ru-RU')}`);

    // История статусов заказа
    if (order.statusHistory.length > 0) {
      console.log('\n📊 ИСТОРИЯ СТАТУСОВ ЗАКАЗА');
      console.log('-'.repeat(80));
      for (const history of order.statusHistory) {
        const userName = history.user
          ? `${history.user.userDetail?.firstName || ''} ${history.user.userDetail?.lastName || ''} (${history.user.login})`
          : 'Система';
        console.log(`  ${history.createdAt.toLocaleString('ru-RU')}`);
        console.log(`    Изменение: ${history.oldStatus} → ${history.newStatus}`);
        console.log(`    Кем: ${userName}`);
        if (history.reason) {
          console.log(`    Причина: ${history.reason}`);
        }
        console.log();
      }
    }

    // Информация об упаковках
    console.log('\n📦 УПАКОВКИ ЗАКАЗА');
    console.log('-'.repeat(80));
    console.log(`Всего упаковок: ${order.packages.length}`);

    for (const pkg of order.packages) {
      console.log('\n' + '='.repeat(80));
      console.log(`📦 УПАКОВКА ID: ${pkg.packageId}`);
      console.log('='.repeat(80));
      console.log(`Код: ${pkg.packageCode}`);
      console.log(`Название: ${pkg.packageName}`);
      console.log(`Количество: ${pkg.quantity}`);
      console.log(`Процент готовности: ${pkg.completionPercentage}%`);
      console.log(`Статус упаковки: ${pkg.packingStatus}`);
      console.log(`Назначена на упаковку: ${pkg.packingAssignedAt ? pkg.packingAssignedAt.toLocaleString('ru-RU') : 'Нет'}`);
      console.log(`Упаковка завершена: ${pkg.packingCompletedAt ? pkg.packingCompletedAt.toLocaleString('ru-RU') : 'Нет'}`);

      // Исходный состав упаковки
      if (pkg.composition.length > 0) {
        console.log('\n  📝 ИСХОДНЫЙ СОСТАВ УПАКОВКИ:');
        console.log('  ' + '-'.repeat(76));
        for (const comp of pkg.composition) {
          console.log(`    • ${comp.partName} (${comp.partCode})`);
          console.log(`      Размер: ${comp.partSize}`);
          console.log(`      Материал: ${comp.materialName} (${comp.materialSku})`);
          console.log(`      Количество на упаковку: ${comp.quantityPerPackage}`);
          console.log(`      Общее количество: ${comp.quantity}`);
          if (comp.thickness) console.log(`      Толщина: ${comp.thickness} мм`);
          if (comp.finishedLength) console.log(`      Длина: ${comp.finishedLength} мм`);
          if (comp.finishedWidth) console.log(`      Ширина: ${comp.finishedWidth} мм`);
          if (comp.edgingNameL1) console.log(`      Кромка L1: ${comp.edgingNameL1}`);
          if (comp.edgingNameL2) console.log(`      Кромка L2: ${comp.edgingNameL2}`);
          if (comp.edgingNameW1) console.log(`      Кромка W1: ${comp.edgingNameW1}`);
          if (comp.edgingNameW2) console.log(`      Кромка W2: ${comp.edgingNameW2}`);
          console.log();
        }
      }

      // Производственные детали
      if (pkg.productionPackageParts.length > 0) {
        console.log('\n  🔧 ПРОИЗВОДСТВЕННЫЕ ДЕТАЛИ:');
        console.log('  ' + '-'.repeat(76));
        for (const ppp of pkg.productionPackageParts) {
          console.log(`    • Деталь ID: ${ppp.part.partId}`);
          console.log(`      Код: ${ppp.part.partCode}`);
          console.log(`      Название: ${ppp.part.partName}`);
          console.log(`      Статус: ${ppp.part.status}`);
          console.log(`      Количество в упаковке: ${ppp.quantity}`);
          console.log(`      Общее количество: ${ppp.part.totalQuantity}`);
          console.log(`      Размер: ${ppp.part.size}`);
          if (ppp.part.material) {
            console.log(`      Материал: ${ppp.part.material.materialName}`);
          }
          console.log(`      Маршрут ID: ${ppp.part.routeId}`);
          console.log(`      Субсборка: ${ppp.part.isSubassembly ? 'Да' : 'Нет'}`);
          console.log(`      Готова к основному потоку: ${ppp.part.readyForMainFlow ? 'Да' : 'Нет'}`);
          console.log();
        }
      }

      // Назначения поддонов
      if (pkg.palletAssignments.length > 0) {
        console.log('\n  🏗️ НАЗНАЧЕНИЯ ПОДДОНОВ:');
        console.log('  ' + '-'.repeat(76));
        for (const assignment of pkg.palletAssignments) {
          console.log(`    • Поддон ID: ${assignment.palletId} (${assignment.pallet.palletName})`);
          console.log(`      Деталь: ${assignment.pallet.part.partName} (${assignment.pallet.part.partCode})`);
          console.log(`      Статус назначения: ${assignment.status}`);
          console.log(`      Количество для упаковки: ${assignment.quantity}`);
          console.log(`      Исходное количество: ${assignment.originalQuantity}`);
          console.log(`      Использовано: ${assignment.usedQuantity}`);
          console.log(`      Назначено: ${assignment.assignedAt.toLocaleString('ru-RU')}`);
          console.log();
        }
      }

      // Задачи упаковки
      if (pkg.packingTasks.length > 0) {
        console.log('\n  📋 ЗАДАЧИ УПАКОВКИ:');
        console.log('  ' + '-'.repeat(76));
        for (const task of pkg.packingTasks) {
          console.log(`    • Задача ID: ${task.taskId}`);
          console.log(`      Станок: ${task.machine.machineName}`);
          console.log(`      Статус: ${task.status}`);
          console.log(`      Приоритет: ${task.priority}`);
          console.log(`      Назначенное количество: ${task.assignedQuantity}`);
          console.log(`      Выполненное количество: ${task.completedQuantity}`);
          if (task.assignedUser) {
            const userName = `${task.assignedUser.userDetail?.firstName || ''} ${task.assignedUser.userDetail?.lastName || ''}`.trim();
            console.log(`      Назначено: ${userName || task.assignedUser.login}`);
          }
          console.log(`      Время назначения: ${task.assignedAt.toLocaleString('ru-RU')}`);
          console.log(`      Время завершения: ${task.completedAt ? task.completedAt.toLocaleString('ru-RU') : 'Не завершено'}`);
          console.log();
        }
      }

      // История статусов упаковки
      if (pkg.statusHistory.length > 0) {
        console.log('\n  📊 ИСТОРИЯ СТАТУСОВ УПАКОВКИ:');
        console.log('  ' + '-'.repeat(76));
        for (const history of pkg.statusHistory) {
          const userName = history.user
            ? `${history.user.userDetail?.firstName || ''} ${history.user.userDetail?.lastName || ''} (${history.user.login})`
            : 'Система';
          console.log(`    ${history.createdAt.toLocaleString('ru-RU')}`);
          console.log(`      Изменение: ${history.oldStatus} → ${history.newStatus}`);
          console.log(`      Кем: ${userName}`);
          console.log();
        }
      }
    }

    // Получаем все детали заказа для анализа поддонов и этапов
    const allPartIds = order.packages.flatMap(pkg =>
      pkg.productionPackageParts.map(ppp => ppp.partId)
    );

    if (allPartIds.length > 0) {
      // Поддоны по деталям
      console.log('\n🏗️ ПОДДОНЫ ПО ДЕТАЛЯМ ЗАКАЗА');
      console.log('-'.repeat(80));

      const pallets = await prisma.pallet.findMany({
        where: {
          partId: { in: allPartIds },
        },
        include: {
          part: true,
          palletBufferCells: {
            include: {
              cell: {
                include: {
                  buffer: true,
                },
              },
            },
            orderBy: {
              placedAt: 'desc',
            },
          },
          machineAssignments: {
            include: {
              machine: true,
            },
            orderBy: {
              assignedAt: 'desc',
            },
          },
          palletStageProgress: {
            include: {
              routeStage: {
                include: {
                  stage: true,
                  substage: true,
                },
              },
            },
            orderBy: {
              completedAt: 'asc',
            },
          },
          movementHistory: {
            include: {
              fromCell: {
                include: {
                  buffer: true,
                },
              },
              toCell: {
                include: {
                  buffer: true,
                },
              },
              machine: true,
              user: {
                include: {
                  userDetail: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          operationHistory: {
            include: {
              machine: true,
              routeStage: {
                include: {
                  stage: true,
                  substage: true,
                },
              },
              operator: {
                include: {
                  userDetail: true,
                },
              },
            },
            orderBy: {
              startedAt: 'asc',
            },
          },
        },
      });

      for (const pallet of pallets) {
        console.log('\n' + '='.repeat(80));
        console.log(`🏗️ ПОДДОН ID: ${pallet.palletId} - ${pallet.palletName}`);
        console.log('='.repeat(80));
        console.log(`Деталь: ${pallet.part.partName} (${pallet.part.partCode})`);
        console.log(`Количество: ${pallet.quantity}`);
        console.log(`Активен: ${pallet.isActive ? 'Да' : 'Нет'}`);

        // История размещения в буферах
        if (pallet.palletBufferCells.length > 0) {
          console.log('\n  📍 РАЗМЕЩЕНИЕ В БУФЕРАХ:');
          console.log('  ' + '-'.repeat(76));
          for (const placement of pallet.palletBufferCells) {
            console.log(`    • Буфер: ${placement.cell.buffer.bufferName}`);
            console.log(`      Ячейка: ${placement.cell.cellCode}`);
            console.log(`      Размещен: ${placement.placedAt.toLocaleString('ru-RU')}`);
            console.log(`      Удален: ${placement.removedAt ? placement.removedAt.toLocaleString('ru-RU') : 'Еще в ячейке'}`);
            console.log();
          }
        }

        // Назначения на станки
        if (pallet.machineAssignments.length > 0) {
          console.log('\n  🔧 НАЗНАЧЕНИЯ НА СТАНКИ:');
          console.log('  ' + '-'.repeat(76));
          for (const assignment of pallet.machineAssignments) {
            console.log(`    • Станок: ${assignment.machine.machineName}`);
            console.log(`      Назначено: ${assignment.assignedAt.toLocaleString('ru-RU')}`);
            console.log(`      Завершено: ${assignment.completedAt ? assignment.completedAt.toLocaleString('ru-RU') : 'В работе'}`);
            console.log(`      Обработано: ${assignment.processedQuantity} шт.`);
            console.log();
          }
        }

        // Прогресс по этапам
        if (pallet.palletStageProgress.length > 0) {
          console.log('\n  📊 ПРОГРЕСС ПО ЭТАПАМ:');
          console.log('  ' + '-'.repeat(76));
          for (const progress of pallet.palletStageProgress) {
            const stageName = progress.routeStage.stage.stageName;
            const substageName = progress.routeStage.substage?.substageName;
            console.log(`    • Этап: ${stageName}${substageName ? ` / ${substageName}` : ''}`);
            console.log(`      Статус: ${progress.status}`);
            console.log(`      Завершено: ${progress.completedAt ? progress.completedAt.toLocaleString('ru-RU') : 'В процессе'}`);
            console.log();
          }
        }

        // История перемещений
        if (pallet.movementHistory.length > 0) {
          console.log('\n  🚚 ИСТОРИЯ ПЕРЕМЕЩЕНИЙ:');
          console.log('  ' + '-'.repeat(76));
          for (const movement of pallet.movementHistory) {
            console.log(`    • ${movement.createdAt.toLocaleString('ru-RU')}`);
            console.log(`      Тип: ${movement.movementType}`);
            console.log(`      Количество: ${movement.quantity}`);
            if (movement.fromCell) {
              console.log(`      Откуда: ${movement.fromCell.buffer.bufferName} / ${movement.fromCell.cellCode}`);
            }
            if (movement.toCell) {
              console.log(`      Куда: ${movement.toCell.buffer.bufferName} / ${movement.toCell.cellCode}`);
            }
            if (movement.machine) {
              console.log(`      Станок: ${movement.machine.machineName}`);
            }
            if (movement.user) {
              const userName = `${movement.user.userDetail?.firstName || ''} ${movement.user.userDetail?.lastName || ''}`.trim();
              console.log(`      Кем: ${userName || movement.user.login}`);
            }
            console.log();
          }
        }

        // История операций
        if (pallet.operationHistory.length > 0) {
          console.log('\n  ⚙️ ИСТОРИЯ ОПЕРАЦИЙ:');
          console.log('  ' + '-'.repeat(76));
          for (const operation of pallet.operationHistory) {
            const stageName = operation.routeStage.stage.stageName;
            const substageName = operation.routeStage.substage?.substageName;
            console.log(`    • Операция ID: ${operation.operationId}`);
            console.log(`      Станок: ${operation.machine.machineName}`);
            console.log(`      Этап: ${stageName}${substageName ? ` / ${substageName}` : ''}`);
            console.log(`      Обработано: ${operation.quantityProcessed} шт.`);
            console.log(`      Начало: ${operation.startedAt.toLocaleString('ru-RU')}`);
            console.log(`      Завершение: ${operation.completedAt.toLocaleString('ru-RU')}`);
            console.log(`      Длительность: ${Math.floor(operation.duration / 60)} мин ${operation.duration % 60} сек`);
            if (operation.operator) {
              const operatorName = `${operation.operator.userDetail?.firstName || ''} ${operation.operator.userDetail?.lastName || ''}`.trim();
              console.log(`      Оператор: ${operatorName || operation.operator.login}`);
            }
            console.log();
          }
        }
      }

      // Рекламации и брак
      console.log('\n❌ РЕКЛАМАЦИИ И БРАК ПО ЗАКАЗУ');
      console.log('-'.repeat(80));

      const reclamations = await prisma.reclamation.findMany({
        where: {
          partId: { in: allPartIds },
        },
        include: {
          part: true,
          routeStage: {
            include: {
              stage: true,
              substage: true,
            },
          },
          machine: true,
          pallet: true,
          reportedBy: {
            include: {
              userDetail: true,
            },
          },
          confirmedBy: {
            include: {
              userDetail: true,
            },
          },
          defects: {
            include: {
              defectType: true,
            },
          },
          attachments: true,
          movements: {
            include: {
              returnToStage: {
                include: {
                  stage: true,
                },
              },
              returnToMachine: true,
            },
          },
          history: {
            include: {
              user: {
                include: {
                  userDetail: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (reclamations.length > 0) {
        console.log(`Всего рекламаций: ${reclamations.length}\n`);

        for (const reclamation of reclamations) {
          console.log('='.repeat(80));
          console.log(`❌ РЕКЛАМАЦИЯ ID: ${reclamation.reclamationId}`);
          console.log('='.repeat(80));
          console.log(`Деталь: ${reclamation.part.partName} (${reclamation.part.partCode})`);
          console.log(`Количество брака: ${reclamation.quantity}`);
          console.log(`Статус: ${reclamation.status}`);
          
          const stageName = reclamation.routeStage.stage.stageName;
          const substageName = reclamation.routeStage.substage?.substageName;
          console.log(`Этап: ${stageName}${substageName ? ` / ${substageName}` : ''}`);
          
          if (reclamation.machine) {
            console.log(`Станок: ${reclamation.machine.machineName}`);
          }
          if (reclamation.pallet) {
            console.log(`Поддон: ${reclamation.pallet.palletName}`);
          }
          
          if (reclamation.reportedBy) {
            const reporterName = `${reclamation.reportedBy.userDetail?.firstName || ''} ${reclamation.reportedBy.userDetail?.lastName || ''}`.trim();
            console.log(`Сообщил: ${reporterName || reclamation.reportedBy.login}`);
          }
          
          if (reclamation.confirmedBy) {
            const confirmerName = `${reclamation.confirmedBy.userDetail?.firstName || ''} ${reclamation.confirmedBy.userDetail?.lastName || ''}`.trim();
            console.log(`Подтвердил: ${confirmerName || reclamation.confirmedBy.login}`);
          }
          
          console.log(`Создано: ${reclamation.createdAt.toLocaleString('ru-RU')}`);
          console.log(`Обработано: ${reclamation.processedAt ? reclamation.processedAt.toLocaleString('ru-RU') : 'Не обработано'}`);
          
          if (reclamation.qualityAction) {
            console.log(`Действие ОТК: ${reclamation.qualityAction}`);
          }
          if (reclamation.note) {
            console.log(`Примечание: ${reclamation.note}`);
          }

          // Причины брака
          if (reclamation.defects.length > 0) {
            console.log('\n  🔍 ПРИЧИНЫ БРАКА:');
            console.log('  ' + '-'.repeat(76));
            for (const defect of reclamation.defects) {
              console.log(`    • ${defect.defectType.name} (${defect.defectType.code})`);
              if (defect.quantity) {
                console.log(`      Количество: ${defect.quantity}`);
              }
              if (defect.defectType.description) {
                console.log(`      Описание: ${defect.defectType.description}`);
              }
              console.log();
            }
          }

          // Вложения
          if (reclamation.attachments.length > 0) {
            console.log('\n  📎 ВЛОЖЕНИЯ:');
            console.log('  ' + '-'.repeat(76));
            for (const attachment of reclamation.attachments) {
              console.log(`    • ${attachment.fileName}`);
              console.log(`      Путь: ${attachment.filePath}`);
              console.log(`      Тип: ${attachment.fileType || 'Не указан'}`);
              console.log(`      Добавлено: ${attachment.createdAt.toLocaleString('ru-RU')}`);
              console.log();
            }
          }

          // Движения (возвраты)
          if (reclamation.movements.length > 0) {
            console.log('\n  🔄 ДВИЖЕНИЯ/ВОЗВРАТЫ:');
            console.log('  ' + '-'.repeat(76));
            for (const movement of reclamation.movements) {
              console.log(`    • Изменение количества: ${movement.deltaQuantity}`);
              console.log(`      Причина: ${movement.reason}`);
              if (movement.returnToStage) {
                console.log(`      Возврат на этап: ${movement.returnToStage.stage.stageName}`);
              }
              if (movement.returnToMachine) {
                console.log(`      Возврат на станок: ${movement.returnToMachine.machineName}`);
              }
              console.log(`      Время: ${movement.createdAt.toLocaleString('ru-RU')}`);
              console.log();
            }
          }

          // История рекламации
          if (reclamation.history.length > 0) {
            console.log('\n  📊 ИСТОРИЯ РЕКЛАМАЦИИ:');
            console.log('  ' + '-'.repeat(76));
            for (const history of reclamation.history) {
              console.log(`    • ${history.createdAt.toLocaleString('ru-RU')}`);
              console.log(`      Действие: ${history.action}`);
              if (history.oldStatus && history.newStatus) {
                console.log(`      Изменение статуса: ${history.oldStatus} → ${history.newStatus}`);
              }
              if (history.user) {
                const userName = `${history.user.userDetail?.firstName || ''} ${history.user.userDetail?.lastName || ''}`.trim();
                console.log(`      Кем: ${userName || history.user.login}`);
              }
              if (history.comment) {
                console.log(`      Комментарий: ${history.comment}`);
              }
              console.log();
            }
          }
          console.log();
        }
      } else {
        console.log('Рекламаций по данному заказу не найдено.\n');
      }

      // Движения запасов
      console.log('\n📊 ДВИЖЕНИЯ ЗАПАСОВ ПО ЗАКАЗУ');
      console.log('-'.repeat(80));

      const inventoryMovements = await prisma.inventoryMovement.findMany({
        where: {
          partId: { in: allPartIds },
        },
        include: {
          part: true,
          pallet: true,
          sourceReclam: true,
          returnToStage: {
            include: {
              stage: true,
            },
          },
          returnToMachine: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (inventoryMovements.length > 0) {
        console.log(`Всего движений: ${inventoryMovements.length}\n`);

        for (const movement of inventoryMovements) {
          console.log(`  • ${movement.createdAt.toLocaleString('ru-RU')}`);
          if (movement.part) {
            console.log(`    Деталь: ${movement.part.partName} (${movement.part.partCode})`);
          }
          if (movement.pallet) {
            console.log(`    Поддон: ${movement.pallet.palletName}`);
          }
          const deltaQty = Number(movement.deltaQuantity);
          console.log(`    Изменение: ${deltaQty > 0 ? '+' : ''}${movement.deltaQuantity}`);
          console.log(`    Причина: ${movement.reason}`);
          if (movement.sourceReclam) {
            console.log(`    Рекламация ID: ${movement.sourceReclam.reclamationId}`);
          }
          if (movement.returnToStage) {
            console.log(`    Возврат на этап: ${movement.returnToStage.stage.stageName}`);
          }
          if (movement.returnToMachine) {
            console.log(`    Возврат на станок: ${movement.returnToMachine.machineName}`);
          }
          console.log();
        }
      } else {
        console.log('Движений запасов по данному заказу не найдено.\n');
      }

      // События по заказу
      console.log('\n📝 СОБЫТИЯ ПО ЗАКАЗУ');
      console.log('-'.repeat(80));

      const events = await prisma.eventLog.findMany({
        where: {
          OR: [
            { entityType: 'order', entityId: orderId },
            { entityType: 'package', entityId: { in: order.packages.map(p => p.packageId) } },
            { entityType: 'pallet', entityId: { in: pallets.map(p => p.palletId) } },
            { entityType: 'part', entityId: { in: allPartIds } },
          ],
        },
        include: {
          user: {
            include: {
              userDetail: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (events.length > 0) {
        console.log(`Всего событий: ${events.length}\n`);

        for (const event of events) {
          console.log(`  • ${event.createdAt.toLocaleString('ru-RU')}`);
          console.log(`    Тип: ${event.eventType}`);
          console.log(`    Сущность: ${event.entityType} ID: ${event.entityId}`);
          if (event.user) {
            const userName = `${event.user.userDetail?.firstName || ''} ${event.user.userDetail?.lastName || ''}`.trim();
            console.log(`    Пользователь: ${userName || event.user.login}`);
          }
          if (event.oldValue) {
            console.log(`    Старое значение: ${JSON.stringify(event.oldValue)}`);
          }
          if (event.newValue) {
            console.log(`    Новое значение: ${JSON.stringify(event.newValue)}`);
          }
          if (event.metadata) {
            console.log(`    Метаданные: ${JSON.stringify(event.metadata)}`);
          }
          console.log();
        }
      } else {
        console.log('События по данному заказу не найдены.\n');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ОТЧЕТ ЗАВЕРШЕН');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Ошибка при получении информации о заказе:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
const orderId = 73;
getOrderFullInfo(orderId)
  .then(() => {
    console.log('\n✅ Скрипт успешно выполнен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });