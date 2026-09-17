const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    console.log('=== ОТЛАДКА PACKING TASK ===\n');
    
    // 1. Проверяем последнюю выполненную задачу
    const lastTask = await prisma.packingTask.findFirst({
      where: {
        completedQuantity: { gt: 0 },
      },
      orderBy: {
        completedAt: 'desc',
      },
      include: {
        machine: true,
        assignedUser: {
          include: {
            userDetail: true,
          },
        },
        operators: {
          include: {
            operator: {
              include: {
                userDetail: true,
              },
            },
          },
        },
      },
    });
    
    if (!lastTask) {
      console.log('❌ Нет выполненных задач упаковки');
      return;
    }
    
    console.log('📦 Последняя выполненная задача:');
    console.log(`   Task ID: ${lastTask.taskId}`);
    console.log(`   Machine ID: ${lastTask.machineId}`);
    console.log(`   Machine Name: ${lastTask.machine.machineName}`);
    console.log(`   Completed At: ${lastTask.completedAt}`);
    console.log(`   Completed Quantity: ${lastTask.completedQuantity}`);
    console.log(`   Assigned To: ${lastTask.assignedTo}`);
    
    if (lastTask.assignedUser) {
      console.log(`   Assigned User: ${lastTask.assignedUser.userDetail?.firstName} ${lastTask.assignedUser.userDetail?.lastName}`);
    }
    
    console.log(`\n👥 Операторы в PackingTaskOperator: ${lastTask.operators.length}`);
    
    if (lastTask.operators.length === 0) {
      console.log('   ⚠️  НЕТ ОПЕРАТОРОВ В ТАБЛИЦЕ!\n');
      
      // Проверяем привязки операторов к станку
      console.log('🔍 Проверяем привязки операторов к станку...');
      const bindings = await prisma.operatorMachineBinding.findMany({
        where: {
          machineId: lastTask.machineId,
        },
        include: {
          user: {
            include: {
              userDetail: true,
            },
          },
        },
        orderBy: {
          boundAt: 'desc',
        },
        take: 5,
      });
      
      console.log(`   Найдено привязок: ${bindings.length}`);
      bindings.forEach((binding, index) => {
        console.log(`   ${index + 1}. User ID: ${binding.userId}, Active: ${binding.isActive}, Unbound: ${binding.unboundAt ? 'Yes' : 'No'}`);
        console.log(`      Name: ${binding.user.userDetail?.firstName} ${binding.user.userDetail?.lastName}`);
        console.log(`      Bound At: ${binding.boundAt}`);
        if (binding.unboundAt) {
          console.log(`      Unbound At: ${binding.unboundAt}`);
        }
      });
      
      // Проверяем активные привязки на момент выполнения задачи
      console.log(`\n🔍 Активные привязки на момент выполнения (${lastTask.completedAt}):`);
      const activeAtCompletion = await prisma.operatorMachineBinding.findMany({
        where: {
          machineId: lastTask.machineId,
          isActive: true,
          unboundAt: null,
          boundAt: {
            lte: lastTask.completedAt,
          },
        },
        include: {
          user: {
            include: {
              userDetail: true,
            },
          },
        },
      });
      
      console.log(`   Найдено активных: ${activeAtCompletion.length}`);
      activeAtCompletion.forEach((binding, index) => {
        console.log(`   ${index + 1}. User ID: ${binding.userId}`);
        console.log(`      Name: ${binding.user.userDetail?.firstName} ${binding.user.userDetail?.lastName}`);
      });
      
    } else {
      lastTask.operators.forEach((op, index) => {
        console.log(`   ${index + 1}. Operator #${op.operatorNumber}: ${op.operator.userDetail?.firstName} ${op.operator.userDetail?.lastName} (ID: ${op.userId})`);
        console.log(`      Assigned At: ${op.assignedAt}`);
      });
    }
    
    // 2. Проверяем общее количество записей в PackingTaskOperator
    const totalOperators = await prisma.packingTaskOperator.count();
    console.log(`\n📊 Всего записей в packing_task_operators: ${totalOperators}`);
    
    if (totalOperators > 0) {
      const sample = await prisma.packingTaskOperator.findMany({
        take: 5,
        include: {
          task: true,
          operator: {
            include: {
              userDetail: true,
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
      });
      
      console.log('\n📋 Последние 5 записей:');
      sample.forEach((rec, index) => {
        console.log(`   ${index + 1}. Task ${rec.taskId}, Operator ${rec.userId} (${rec.operator.userDetail?.firstName}), Number: ${rec.operatorNumber}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
