import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../../services/users/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../../dto/users/user-management.dto';
import {
  CreateUserRoleDto,
  CreateRoleBindingDto,
  UserRolesResponseDto,
  UserRoleType,
} from '../../dto/users/user-roles.dto';
import {
  CreatePickerDto,
  UpdatePickerDto,
  PickerResponseDto,
  CreatePickerWithRoleDto,
  PickerWithRoleResponseDto,
} from '../../dto/users/picker-management.dto';

@ApiTags('Управление пользователями')
@Controller('settings/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // ========================================
  // CRUD операции с пользователями
  // ========================================

  @Post()
  @ApiOperation({ summary: 'Создать нового пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь создан успешно',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким логином уже существует',
  })
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(
      `REST: Создание пользователя с логином: ${createUserDto.login}`,
    );
    return await this.usersService.createUser(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех пользователей' })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей получен',
    type: [UserResponseDto],
  })
  async getAllUsers(): Promise<UserResponseDto[]> {
    this.logger.log('REST: Получение списка всех пользователей');
    return await this.usersService.getAllUsers();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь найден',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async getUserById(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserResponseDto> {
    this.logger.log(`REST: Получение пользователя по ID: ${userId}`);
    return await this.usersService.getUserById(userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Обновить данные пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь обновлён',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 409, description: 'Логин уже занят' })
  async updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`REST: Обновление пользователя ID: ${userId}`);
    return await this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 204, description: 'Пользователь удалён' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async deleteUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    this.logger.log(`REST: Удаление пользователя ID: ${userId}`);
    await this.usersService.deleteUser(userId);
  }

  // ========================================
  // Управление глобальными ролями
  // ========================================

  @Post('roles/global')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Назначить глобальную роль пользователю' })
  @ApiResponse({ status: 201, description: 'Роль назначена успешно' })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 409, description: 'Роль уже назначена' })
  async assignGlobalRole(
    @Body() createUserRoleDto: CreateUserRoleDto,
  ): Promise<void> {
    this.logger.log(
      `REST: Назначение глобальной роли ${createUserRoleDto.role} пользователю ID: ${createUserRoleDto.userId}`,
    );
    await this.usersService.assignGlobalRole(createUserRoleDto);
  }

  @Delete('roles/global/:userId/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить глобальную роль у пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiParam({ name: 'role', description: 'Название роли', enum: UserRoleType })
  @ApiResponse({ status: 204, description: 'Роль удалена успешно' })
  @ApiResponse({ status: 404, description: 'Пользователь или роль не найдены' })
  async removeGlobalRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('role') role: UserRoleType,
  ): Promise<void> {
    this.logger.log(
      `REST: Удаление глобальной роли ${role} у пользователя ID: ${userId}`,
    );
    await this.usersService.removeGlobalRole(userId, role);
  }

  // ========================================
  // Управление контекстными привязками
  // ========================================

  @Post('roles/bindings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать контекстную привязку роли' })
  @ApiResponse({ status: 201, description: 'Привязка создана успешно' })
  @ApiResponse({
    status: 400,
    description: 'Неверные данные или несовместимая роль с контекстом',
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь или объект контекста не найден',
  })
  @ApiResponse({ status: 409, description: 'Такая привязка уже существует' })
  async createRoleBinding(
    @Body() createRoleBindingDto: CreateRoleBindingDto,
  ): Promise<void> {
    this.logger.log(
      `REST: Создание контекстной привязки роли ${createRoleBindingDto.role} для пользователя ID: ${createRoleBindingDto.userId}`,
    );
    await this.usersService.createRoleBinding(createRoleBindingDto);
  }

  @Delete('roles/bindings/:bindingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить контекстную привязку роли' })
  @ApiParam({ name: 'bindingId', description: 'ID привязки' })
  @ApiResponse({ status: 204, description: 'Привязка удалена успешно' })
  @ApiResponse({ status: 404, description: 'Привязка не найдена' })
  async removeRoleBinding(
    @Param('bindingId', ParseIntPipe) bindingId: number,
  ): Promise<void> {
    this.logger.log(`REST: Удаление контекстной привязки ID: ${bindingId}`);
    await this.usersService.removeRoleBinding(bindingId);
  }

  // ========================================
  // Получение информации о ролях
  // ========================================

  @Get(':userId/roles')
  @ApiOperation({ summary: 'Получить все роли пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Роли пользователя получены',
    type: UserRolesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async getUserRoles(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserRolesResponseDto> {
    this.logger.log(`REST: Получение ролей пользователя ID: ${userId}`);
    return await this.usersService.getUserRoles(userId);
  }

  // ========================================
  // Управление комплектовщиками
  // ========================================

  @Post('pickers')
  @ApiOperation({ summary: 'Создать комплектовщика' })
  @ApiResponse({
    status: 201,
    description: 'Комплектовщик создан успешно',
    type: PickerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({
    status: 409,
    description: 'Пользователь уже является комплектовщиком',
  })
  async createPicker(
    @Body() createPickerDto: CreatePickerDto,
  ): Promise<PickerResponseDto> {
    this.logger.log(
      `REST: Создание комплектовщика для пользователя ID: ${createPickerDto.userId}`,
    );
    return await this.usersService.createPicker(createPickerDto);
  }

  @Post('pickers/with-role')
  @ApiOperation({ summary: 'Создать комплектовщика с автоматическим назначением роли' })
  @ApiResponse({
    status: 201,
    description: 'Комплектовщик создан с ролью',
    type: PickerWithRoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({
    status: 409,
    description: 'Пользователь уже является комплектовщиком',
  })
  async createPickerWithRole(
    @Body() createPickerWithRoleDto: CreatePickerWithRoleDto,
  ): Promise<PickerWithRoleResponseDto> {
    this.logger.log(
      `REST: Создание комплектовщика с ролью для пользователя ID: ${createPickerWithRoleDto.userId}`,
    );
    return await this.usersService.createPickerWithRole(createPickerWithRoleDto);
  }

  @Get('pickers')
  @ApiOperation({ summary: 'Получить список всех комплектовщиков' })
  @ApiResponse({
    status: 200,
    description: 'Список комплектовщиков получен',
    type: [PickerResponseDto],
  })
  async getAllPickers(): Promise<PickerResponseDto[]> {
    this.logger.log('REST: Получение списка всех комплектовщиков');
    return await this.usersService.getAllPickers();
  }

  @Get('pickers/:pickerId')
  @ApiOperation({ summary: 'Получить комплектовщика по ID' })
  @ApiParam({ name: 'pickerId', description: 'ID комплектовщика' })
  @ApiResponse({
    status: 200,
    description: 'Комплектовщик найден',
    type: PickerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Комплектовщик не найден' })
  async getPickerById(
    @Param('pickerId', ParseIntPipe) pickerId: number,
  ): Promise<PickerResponseDto> {
    this.logger.log(`REST: Получение комплектовщика по ID: ${pickerId}`);
    return await this.usersService.getPickerById(pickerId);
  }

  @Get('pickers/by-user/:userId')
  @ApiOperation({ summary: 'Получить комплектовщика по ID пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Комплектовщик найден',
    type: PickerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Комплектовщик не найден' })
  async getPickerByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<PickerResponseDto> {
    this.logger.log(`REST: Получение комплектовщика по ID пользователя: ${userId}`);
    return await this.usersService.getPickerByUserId(userId);
  }

  @Put('pickers/:pickerId')
  @ApiOperation({ summary: 'Обновить данные комплектовщика' })
  @ApiParam({ name: 'pickerId', description: 'ID комплектовщика' })
  @ApiResponse({
    status: 200,
    description: 'Комплектовщик обновлён',
    type: PickerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Комплектовщик не на��ден' })
  @ApiResponse({
    status: 409,
    description: 'Пользователь уже является комплектовщиком',
  })
  async updatePicker(
    @Param('pickerId', ParseIntPipe) pickerId: number,
    @Body() updatePickerDto: UpdatePickerDto,
  ): Promise<PickerResponseDto> {
    this.logger.log(`REST: Обновление комплектовщика ID: ${pickerId}`);
    return await this.usersService.updatePicker(pickerId, updatePickerDto);
  }

  @Delete('pickers/:pickerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить комплектовщика' })
  @ApiParam({ name: 'pickerId', description: 'ID комплектовщика' })
  @ApiResponse({ status: 204, description: 'Комплектовщик удалён' })
  @ApiResponse({ status: 404, description: 'Комплектовщик не найден' })
  async deletePicker(
    @Param('pickerId', ParseIntPipe) pickerId: number,
  ): Promise<void> {
    this.logger.log(`REST: Удаление комплектовщика ID: ${pickerId}`);
    await this.usersService.deletePicker(pickerId);
  }

  // ========================================
  // Вспомогательные эндпоинты
  // ========================================

  @Get('roles/available')
  @ApiOperation({ summary: 'Получить список доступных ролей' })
  @ApiResponse({ status: 200, description: 'Список ролей получен' })
  async getAvailableRoles(): Promise<{ roles: UserRoleType[] }> {
    this.logger.log('REST: Получение списка доступных ролей');
    return {
      roles: Object.values(UserRoleType),
    };
  }

  @Get('context/machines')
  @ApiOperation({ summary: 'Получить список станков для привязки' })
  @ApiResponse({ status: 200, description: 'Список станков получен' })
  async getMachinesForBinding(): Promise<{
    machines: Array<{ machineId: number; machineName: string }>;
  }> {
    this.logger.log('REST: Получение списка станков для привязки');
    return await this.usersService.getMachinesForBinding();
  }

  @Get('context/stages')
  @ApiOperation({ summary: 'Получить список этапов для привязки' })
  @ApiResponse({ status: 200, description: 'Список этапов получен' })
  async getStagesForBinding(): Promise<{
    stages: Array<{ stageId: number; stageName: string }>;
  }> {
    this.logger.log('REST: Получение списка этапов для привязки');
    return await this.usersService.getStagesForBinding();
  }

  @Get('context/pickers')
  @ApiOperation({ summary: 'Получить список комплектовщиков для привязки' })
  @ApiResponse({ status: 200, description: 'Список комплектовщиков получен' })
  async getPickersForBinding(): Promise<{
    pickers: Array<{ pickerId: number; pickerName: string }>;
  }> {
    this.logger.log('REST: Получение списка комплектовщиков для привязки');
    return await this.usersService.getPickersForBinding();
  }
}