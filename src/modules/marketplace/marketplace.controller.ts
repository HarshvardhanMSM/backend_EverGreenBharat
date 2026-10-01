import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentLocale } from '../../common/i18n/i18n.decorator';

@ApiTags('Marketplace Discovery')
@Controller('v1')
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Get('nurseries')
  @Public()
  @ApiOperation({ summary: 'Discover nurseries by location/pincode or search' })
  async findNurseries(
    @Query('pincode') pincode?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findNurseries(pincode, search);
  }

  @Get('nurseries/:id')
  @Public()
  @ApiOperation({ summary: 'Get full nursery store detail and catalog' })
  @ApiParam({ name: 'id', type: String })
  async findNurseryById(
    @Param('id') id: string,
    @CurrentLocale() locale: string,
  ) {
    return this.service.findNurseryById(id, locale);
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary:
      'Unified search across plant products, nurseries, and categories (multilingual)',
    description:
      'Performs unified search across English and Hindi product/category names and returns localized results',
  })
  async unifiedSearch(
    @Query('q') q: string,
    @CurrentLocale() locale: string,
  ) {
    return this.service.unifiedSearch(q, locale);
  }
}
