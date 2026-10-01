import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EconomyConfigService } from '../services/economy-config.service';
import { UpdateEconomyConfigDto } from '../dto/economy-config.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../../common/enums/permission-keys.enum';

@ApiTags('Admin Economy & Payment Configuration')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/admin/economy-config')
export class EconomyConfigController {
  constructor(private readonly economyConfigService: EconomyConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current platform coin and economy configuration',
  })
  async getConfig() {
    const data = await this.economyConfigService.getConfig();
    return {
      success: true,
      message: 'Economy configuration retrieved successfully',
      data,
    };
  }

  @Patch()
  @Permissions(PermissionKeys.FINANCE_SETTINGS)
  @ApiOperation({
    summary:
      'Update platform coin conversion rates, commission, and withdrawal threshold',
  })
  async updateConfig(@Body() dto: UpdateEconomyConfigDto) {
    const data = await this.economyConfigService.updateConfig(dto);
    return {
      success: true,
      message: 'Economy configuration updated successfully',
      data,
    };
  }
}
