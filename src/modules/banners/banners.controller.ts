import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BannersService } from './banners.service';

@ApiTags('Home Banners')
@Controller('v1/home/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get active promotional banners for home feed' })
  async getActiveBanners() {
    const banners = await this.bannersService.getActiveBanners();
    return { message: 'Active banners retrieved', data: banners };
  }

  @Post(':id/click')
  @Public()
  @ApiOperation({ summary: 'Record click metric for banner' })
  async recordClick(@Param('id') id: string) {
    await this.bannersService.recordClick(id);
    return { message: 'Banner click recorded' };
  }
}
