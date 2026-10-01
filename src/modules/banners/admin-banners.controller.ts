import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BannersService } from './banners.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  BannerQueryDto,
} from './dto/banner.dto';

@ApiTags('Admin Content — Banners')
@Controller('v1/admin/content/banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
export class AdminBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'List all banners with filters and pagination' })
  async findAll(@Query() query: BannerQueryDto) {
    const { data, total } = await this.bannersService.findAll(query);
    return {
      message: 'Banners retrieved',
      data,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  async findOne(@Param('id') id: string) {
    const banner = await this.bannersService.findOne(id);
    return { message: 'Banner retrieved', data: banner };
  }

  @Post()
  @ApiOperation({ summary: 'Create new banner' })
  async create(@Body() dto: CreateBannerDto) {
    const banner = await this.bannersService.create(dto);
    return { message: 'Banner created successfully', data: banner };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update existing banner' })
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const banner = await this.bannersService.update(id, dto);
    return { message: 'Banner updated successfully', data: banner };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete banner' })
  async remove(@Param('id') id: string) {
    await this.bannersService.remove(id);
    return { message: 'Banner deleted successfully' };
  }
}
