import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InquiriesService } from './inquiries.service';
import {
  CreateInquiryDto,
  UpdateInquiryStatusDto,
  AddInquiryNoteDto,
  InquiryQueryDto,
} from './dto/inquiry.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Institutional Inquiries')
@Controller('v1/inquiries')
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary:
      'Public submission of 5-field institutional corporate inquiry (hospital, cafe, corporate)',
  })
  async submitInquiry(@Body() dto: CreateInquiryDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Check status of an institutional inquiry' })
  @ApiParam({ name: 'id', type: String })
  async getInquiry(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}

@ApiTags('Admin Institutional Inquiries')
@Controller('v1/admin/inquiries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminInquiriesController {
  constructor(private readonly service: InquiriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all institutional inquiries with Kanban status breakdown and pagination',
  })
  async findAll(@Query() query: InquiryQueryDto) {
    return this.service.findAllAdmin(query);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Transition inquiry status (New -> In Review -> Contacted -> In Discussion -> Converted / Closed)',
  })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInquiryStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.service.updateStatus(id, dto, adminId);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add follow-up notes to inquiry history' })
  @ApiParam({ name: 'id', type: String })
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddInquiryNoteDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.service.addNote(id, dto, adminId);
  }
}
