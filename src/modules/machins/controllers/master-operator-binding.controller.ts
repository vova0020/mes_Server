import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MasterOperatorBindingService } from '../services/master-operator-binding.service';
import {
  GetMasterSegmentsQueryDto,
  GetSegmentMachinesQueryDto,
  GetOperatorsQueryDto,
  MasterBindOperatorDto,
  MasterUnbindOperatorDto,
  MasterChangeOperatorNumberDto,
  MasterSegmentResponseDto,
  SegmentMachineWithOperatorsDto,
  OperatorInfoDto,
  MasterBindOperatorResponseDto,
  MasterUnbindOperatorResponseDto,
  MasterChangeNumberResponseDto,
} from '../dto/master-operator-binding.dto';

@ApiTags('РџСЂРёРІСЏР·РєР° РѕРїРµСЂР°С‚РѕСЂРѕРІ РјР°СЃС‚РµСЂРѕРј')
@Controller('machins/master/operator-binding')
export class MasterOperatorBindingController {
  private readonly logger = new Logger(MasterOperatorBindingController.name);

  constructor(
    private readonly masterOperatorBindingService: MasterOperatorBindingService,
  ) {}

  /**
   * 1) РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє СѓС‡Р°СЃС‚РєРѕРІ, РґРѕСЃС‚СѓРїРЅС‹С… РјР°СЃС‚РµСЂСѓ
   * GET /machins/master/operator-binding/segments?masterId=1
   */
  @Get('segments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'РџРѕР»СѓС‡РёС‚СЊ СѓС‡Р°СЃС‚РєРё РјР°СЃС‚РµСЂР°',
    description:
      'Р’РѕР·РІСЂР°С‰Р°РµС‚ СЃРїРёСЃРѕРє РїСЂРѕРёР·РІРѕРґСЃС‚РІРµРЅРЅС‹С… СѓС‡Р°СЃС‚РєРѕРІ (СЌС‚Р°РїРѕРІ 1-РіРѕ СѓСЂРѕРІРЅСЏ), Рє РєРѕС‚РѕСЂС‹Рј РїСЂРёРІСЏР·Р°РЅ РјР°СЃС‚РµСЂ',
  })
  @ApiQuery({
    name: 'masterId',
    required: true,
    type: Number,
    description: 'ID РјР°СЃС‚РµСЂР° (РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)',
  })
  @ApiResponse({
    status: 200,
    description: 'РЎРїРёСЃРѕРє СѓС‡Р°СЃС‚РєРѕРІ РјР°СЃС‚РµСЂР°',
    type: [MasterSegmentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ' })
  async getMasterSegments(
    @Query() query: GetMasterSegmentsQueryDto,
  ): Promise<MasterSegmentResponseDto[]> {
    this.logger.log(
      `GET /machins/master/operator-binding/segments - masterId: ${query.masterId}`,
    );
    return this.masterOperatorBindingService.getMasterSegments(query.masterId);
  }

  /**
   * 2) РџРѕР»СѓС‡РёС‚СЊ СЃС‚Р°РЅРєРё СѓС‡Р°СЃС‚РєР° СЃ РёРЅС„РѕСЂРјР°С†РёРµР№ Рѕ РїСЂРёРІСЏР·Р°РЅРЅС‹С… РѕРїРµСЂР°С‚РѕСЂР°С…
   * GET /machins/master/operator-binding/machines?stageId=1
   */
  @Get('machines')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'РџРѕР»СѓС‡РёС‚СЊ СЃС‚Р°РЅРєРё СѓС‡Р°СЃС‚РєР° СЃ РѕРїРµСЂР°С‚РѕСЂР°РјРё',
    description:
      'Р’РѕР·РІСЂР°С‰Р°РµС‚ СЃРїРёСЃРѕРє СЃС‚Р°РЅРєРѕРІ РґР»СЏ СѓРєР°Р·Р°РЅРЅРѕРіРѕ СѓС‡Р°СЃС‚РєР° СЃ РёРЅС„РѕСЂРјР°С†РёРµР№ Рѕ РїСЂРёРІСЏР·Р°РЅРЅС‹С… РѕРїРµСЂР°С‚РѕСЂР°С… (СЃС‚Р°С‚СѓСЃ, РєРѕРґ, РЅР°Р·РІР°РЅРёРµ, РєРѕР»РёС‡РµСЃС‚РІРѕ РѕРїРµСЂР°С‚РѕСЂРѕРІ, РёС… РґР°РЅРЅС‹Рµ Рё РІСЂРµРјСЏ РїСЂРёРІСЏР·РєРё)',
  })
  @ApiQuery({
    name: 'stageId',
    required: true,
    type: Number,
    description: 'ID СѓС‡Р°СЃС‚РєР° (СЌС‚Р°РїР° 1-РіРѕ СѓСЂРѕРІРЅСЏ)',
  })
  @ApiResponse({
    status: 200,
    description: 'РЎРїРёСЃРѕРє СЃС‚Р°РЅРєРѕРІ СЃ РѕРїРµСЂР°С‚РѕСЂР°РјРё',
    type: [SegmentMachineWithOperatorsDto],
  })
  @ApiResponse({ status: 404, description: 'РЈС‡Р°СЃС‚РѕРє РЅРµ РЅР°Р№РґРµРЅ' })
  async getSegmentMachines(
    @Query() query: GetSegmentMachinesQueryDto,
  ): Promise<SegmentMachineWithOperatorsDto[]> {
    this.logger.log(
      `GET /machins/master/operator-binding/machines - stageId: ${query.stageId}`,
    );
    return this.masterOperatorBindingService.getSegmentMachinesWithOperators(
      query.stageId,
    );
  }

  /**
   * 3) РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РІСЃРµС… РѕРїРµСЂР°С‚РѕСЂРѕРІ
   * GET /machins/master/operator-binding/operators?stageId=1
   */
  @Get('operators')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РѕРїРµСЂР°С‚РѕСЂРѕРІ',
    description:
      'Р’РѕР·РІСЂР°С‰Р°РµС‚ СЃРїРёСЃРѕРє РІСЃРµС… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ СЂРѕР»СЊСЋ "РћРїРµСЂР°С‚РѕСЂ" СЃ РёРЅС„РѕСЂРјР°С†РёРµР№ Рѕ С‚РµРєСѓС‰РµР№ РїСЂРёРІСЏР·РєРµ Рє СЃС‚Р°РЅРєСѓ',
  })
  @ApiQuery({
    name: 'stageId',
    required: false,
    type: Number,
    description: 'ID СѓС‡Р°СЃС‚РєР° РґР»СЏ С„РёР»СЊС‚СЂР°С†РёРё (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)',
  })
  @ApiResponse({
    status: 200,
    description: 'РЎРїРёСЃРѕРє РѕРїРµСЂР°С‚РѕСЂРѕРІ',
    type: [OperatorInfoDto],
  })
  async getOperators(
    @Query() query: GetOperatorsQueryDto,
  ): Promise<OperatorInfoDto[]> {
    this.logger.log(
      `GET /machins/master/operator-binding/operators${query.stageId ? ` - stageId: ${query.stageId}` : ''}`,
    );
    return this.masterOperatorBindingService.getOperators(query.stageId);
  }

  /**
   * 4) РџСЂРёРІСЏР·Р°С‚СЊ РѕРїРµСЂР°С‚РѕСЂР° Рє СЃС‚Р°РЅРєСѓ
   * POST /machins/master/operator-binding/bind
   */
  @Post('bind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'РџСЂРёРІСЏР·Р°С‚СЊ РѕРїРµСЂР°С‚РѕСЂР° Рє СЃС‚Р°РЅРєСѓ',
    description:
      'РњР°СЃС‚РµСЂ РїСЂРёРІСЏР·С‹РІР°РµС‚ РѕРїРµСЂР°С‚РѕСЂР° Рє СЃС‚Р°РЅРєСѓ. РњРѕР¶РЅРѕ СѓРєР°Р·Р°С‚СЊ РЅРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° вЂ” РµСЃР»Рё РЅРѕРјРµСЂ Р·Р°РЅСЏС‚, РѕСЃС‚Р°Р»СЊРЅС‹Рµ СЃРґРІРёРіР°СЋС‚СЃСЏ.',
  })
  @ApiResponse({
    status: 200,
    description: 'РћРїРµСЂР°С‚РѕСЂ СѓСЃРїРµС€РЅРѕ РїСЂРёРІСЏР·Р°РЅ',
    type: MasterBindOperatorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'РћРїРµСЂР°С‚РѕСЂ РёР»Рё СЃС‚Р°РЅРѕРє РЅРµ РЅР°Р№РґРµРЅ',
  })
  @ApiResponse({
    status: 409,
    description: 'РћРїРµСЂР°С‚РѕСЂ СѓР¶Рµ РїСЂРёРІСЏР·Р°РЅ Рє РґСЂСѓРіРѕРјСѓ СЃС‚Р°РЅРєСѓ',
  })
  async bindOperator(
    @Body() dto: MasterBindOperatorDto,
  ): Promise<MasterBindOperatorResponseDto> {
    this.logger.log(
      `POST /machins/master/operator-binding/bind - operatorId: ${dto.operatorId}, machineId: ${dto.machineId}, operatorNumber: ${dto.operatorNumber || 'auto'}`,
    );
    return this.masterOperatorBindingService.bindOperatorToMachine(
      dto.operatorId,
      dto.machineId,
      dto.operatorNumber,
    );
  }

  /**
   * 5) РћС‚РІСЏР·Р°С‚СЊ РѕРїРµСЂР°С‚РѕСЂР° РѕС‚ СЃС‚Р°РЅРєР°
   * POST /machins/master/operator-binding/unbind
   */
  @Post('unbind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'РћС‚РІСЏР·Р°С‚СЊ РѕРїРµСЂР°С‚РѕСЂР° РѕС‚ СЃС‚Р°РЅРєР°',
    description: 'РњР°СЃС‚РµСЂ РѕС‚РІСЏР·С‹РІР°РµС‚ РѕРїРµСЂР°С‚РѕСЂР° РѕС‚ СЃС‚Р°РЅРєР°',
  })
  @ApiResponse({
    status: 200,
    description: 'РћРїРµСЂР°С‚РѕСЂ СѓСЃРїРµС€РЅРѕ РѕС‚РІСЏР·Р°РЅ',
    type: MasterUnbindOperatorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'РџСЂРёРІСЏР·РєР° РЅРµ РЅР°Р№РґРµРЅР°',
  })
  async unbindOperator(
    @Body() dto: MasterUnbindOperatorDto,
  ): Promise<MasterUnbindOperatorResponseDto> {
    this.logger.log(
      `POST /machins/master/operator-binding/unbind - operatorId: ${dto.operatorId}, machineId: ${dto.machineId}`,
    );
    return this.masterOperatorBindingService.unbindOperatorFromMachine(
      dto.operatorId,
      dto.machineId,
    );
  }

  /**
   * 6) РР·РјРµРЅРёС‚СЊ РЅРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РЅР° СЃС‚Р°РЅРєРµ
   * PUT /machins/master/operator-binding/change-number
   */
  @Put('change-number')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'РР·РјРµРЅРёС‚СЊ РЅРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РЅР° СЃС‚Р°РЅРєРµ',
    description:
      'РР·РјРµРЅСЏРµС‚ РїРѕСЂСЏРґРєРѕРІС‹Р№ РЅРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РЅР° СЃС‚Р°РЅРєРµ. Р•СЃР»Рё РЅРѕРІС‹Р№ РЅРѕРјРµСЂ Р·Р°РЅСЏС‚ вЂ” РІСЃРµ РѕРїРµСЂР°С‚РѕСЂС‹ СЃ СЌС‚РёРј Рё Р±РѕР»СЊС€РёРјРё РЅРѕРјРµСЂР°РјРё СЃРґРІРёРіР°СЋС‚СЃСЏ РЅР° +1.',
  })
  @ApiResponse({
    status: 200,
    description: 'РќРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РёР·РјРµРЅРµРЅ',
    type: MasterChangeNumberResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'РћРїРµСЂР°С‚РѕСЂ РЅРµ РїСЂРёРІСЏР·Р°РЅ Рє СЃС‚Р°РЅРєСѓ',
  })
  async changeOperatorNumber(
    @Body() dto: MasterChangeOperatorNumberDto,
  ): Promise<MasterChangeNumberResponseDto> {
    this.logger.log(
      `PUT /machins/master/operator-binding/change-number - operatorId: ${dto.operatorId}, machineId: ${dto.machineId}, newNumber: ${dto.newOperatorNumber}`,
    );
    return this.masterOperatorBindingService.changeOperatorNumber(
      dto.operatorId,
      dto.machineId,
      dto.newOperatorNumber,
    );
  }
}
