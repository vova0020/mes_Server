import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { OperatorBindingService } from '../../services/operators/operator-binding.service';
import {
  BindOperatorToMachineDto,
  UnbindOperatorFromMachineDto,
  GetOperatorBindingDto,
  OperatorBindingResponseDto,
  BindOperatorResponseDto,
  UnbindOperatorResponseDto,
  GetMachineBindingsDto,
  MachineBindingsResponseDto,
  ChangeOperatorNumberDto,
  ChangeOperatorNumberResponseDto,
} from '../../dto/operators/operator-binding.dto';

@Controller('operators/bindings')
export class OperatorBindingController {
  private readonly logger = new Logger(OperatorBindingController.name);

  constructor(
    private readonly operatorBindingService: OperatorBindingService,
  ) {}

  /**
   * Получить информацию о привязке оператора
   * GET /api/operators/bindings/status?userId=123
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getOperatorBinding(
    @Query() dto: GetOperatorBindingDto,
  ): Promise<OperatorBindingResponseDto> {
    this.logger.log(
      `GET /api/operators/bindings/status - userId: ${dto.userId}`,
    );
    return this.operatorBindingService.getOperatorBinding(dto);
  }

  /**
   * Привязать оператора к станку по коду
   * POST /api/operators/bindings/bind
   * Body: { userId: 123, machineCode: "H431" }
   */
  @Post('bind')
  @HttpCode(HttpStatus.OK)
  async bindOperatorToMachine(
    @Body() dto: BindOperatorToMachineDto,
  ): Promise<BindOperatorResponseDto> {
    this.logger.log(
      `POST /api/operators/bindings/bind - userId: ${dto.userId}, machineCode: ${dto.machineCode}`,
    );
    return this.operatorBindingService.bindOperatorToMachine(dto);
  }

  /**
   * Отвязать оператора от станка
   * POST /api/operators/bindings/unbind
   * Body: { userId: 123, machineId: 5 }
   */
  @Post('unbind')
  @HttpCode(HttpStatus.OK)
  async unbindOperatorFromMachine(
    @Body() dto: UnbindOperatorFromMachineDto,
  ): Promise<UnbindOperatorResponseDto> {
    this.logger.log(
      `POST /api/operators/bindings/unbind - userId: ${dto.userId}, machineId: ${dto.machineId}`,
    );
    return this.operatorBindingService.unbindOperatorFromMachine(dto);
  }

  /**
   * Получить список привязок станка
   * GET /api/operators/bindings/machine?machineId=5&activeOnly=true
   */
  @Get('machine')
  @HttpCode(HttpStatus.OK)
  async getMachineBindings(
    @Query() dto: GetMachineBindingsDto,
  ): Promise<MachineBindingsResponseDto> {
    this.logger.log(
      `GET /api/operators/bindings/machine - machineId: ${dto.machineId}, activeOnly: ${dto.activeOnly}`,
    );
    return this.operatorBindingService.getMachineBindings(dto);
  }

  /**
   * Изменить номер оператора на станке
   * PUT /api/operators/bindings/change-number
   * Body: { userId: 123, machineId: 5, newOperatorNumber: 2 }
   */
  @Put('change-number')
  @HttpCode(HttpStatus.OK)
  async changeOperatorNumber(
    @Body() dto: ChangeOperatorNumberDto,
  ): Promise<ChangeOperatorNumberResponseDto> {
    this.logger.log(
      `PUT /api/operators/bindings/change-number - userId: ${dto.userId}, machineId: ${dto.machineId}, newOperatorNumber: ${dto.newOperatorNumber}`,
    );
    return this.operatorBindingService.changeOperatorNumber(dto);
  }
}
