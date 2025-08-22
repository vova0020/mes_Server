src/
├── websockets/
│   ├── websockets.module.ts           # Главный модуль WebSocket
│   ├── gateways/                      # Gateway файлы
│   │   └── main.gateway.ts            # Основной gateway
│   ├── services/                      # Бизнес-логика
│   │   ├── socket.service.ts          # Основной сервис
│   │   └── room.service.ts            # Управление комнатами
│   ├── interfaces/                    # TypeScript интерфейсы
│   │   └── socket-user.interface.ts   # Интерфейс пользователя
│   └── constants/                     # Константы
│       ├── events.constants.ts        # Названия событий
│       └── rooms.constants.ts         # Названия комнат

Порядок создания:

constants/events.constants.ts — названия всех событий
constants/rooms.constants.ts — шаблоны названий комнат
интерфейсы/socket-user.interface.ts — базовые типы
services/room.service.ts — управление комнатами
services/socket.service.ts — основная логика
gateways/main.gateway.ts — обработчики событий
websockets.module.ts — сборка модуля

Такая структура проще и быстрее в разработке. Данные будут типизированы с помощью интерфейсов, но без лишней валидации.