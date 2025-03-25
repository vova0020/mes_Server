import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleEnum } from '../../../common/enums/role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Регистрация нового пользователя (доступно только для администратора)
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.createUser(createUserDto);
  }

  // Удаление пользователя по id (только администратор)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.deleteUser(Number(id));
  }
}
