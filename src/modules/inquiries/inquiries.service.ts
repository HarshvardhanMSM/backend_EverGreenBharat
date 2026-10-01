import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstitutionalInquiry } from './entities/institutional-inquiry.entity';
import {
  CreateInquiryDto,
  UpdateInquiryStatusDto,
  AddInquiryNoteDto,
  InquiryQueryDto,
} from './dto/inquiry.dto';
import { InquiryStatus } from '../../common/enums/nursery.enums';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(InstitutionalInquiry)
    private readonly inquiryRepository: Repository<InstitutionalInquiry>,
  ) {}

  async create(dto: CreateInquiryDto) {
    const inquiry = this.inquiryRepository.create({
      ...dto,
      status: InquiryStatus.NEW,
      notes: [],
    });
    return this.inquiryRepository.save(inquiry);
  }

  async findOne(id: string) {
    const inquiry = await this.inquiryRepository.findOne({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async findAllAdmin(query: InquiryQueryDto) {
    const { page = 1, limit = 20, status, search } = query;
    const qb = this.inquiryRepository.createQueryBuilder('i');

    if (status) {
      qb.andWhere('i.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(i.companyName ILIKE :s OR i.name ILIKE :s OR i.email ILIKE :s)',
        { s: `%${search.trim()}%` },
      );
    }

    qb.orderBy('i.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Group metrics by status for Kanban view
    const statusCountsRaw = await this.inquiryRepository
      .createQueryBuilder('i')
      .select('i.status', 'status')
      .addSelect('COUNT(i.id)', 'count')
      .groupBy('i.status')
      .getRawMany();

    const kanbanCounts: Record<string, number> = {};
    for (const row of statusCountsRaw) {
      kanbanCounts[row.status] = parseInt(row.count, 10);
    }

    return {
      data,
      kanbanCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateInquiryStatusDto,
    adminId: string,
    adminName = 'Admin',
  ) {
    const inquiry = await this.findOne(id);
    inquiry.status = dto.status;
    if (dto.assignedAdminId !== undefined) {
      inquiry.assignedAdminId = dto.assignedAdminId;
    }

    if (dto.note) {
      inquiry.notes = inquiry.notes || [];
      inquiry.notes.push({
        id: crypto.randomUUID(),
        authorName: adminName,
        adminId,
        text: dto.note,
        createdAt: new Date(),
      });
    }

    return this.inquiryRepository.save(inquiry);
  }

  async addNote(
    id: string,
    dto: AddInquiryNoteDto,
    adminId: string,
    adminName = 'Admin',
  ) {
    const inquiry = await this.findOne(id);
    inquiry.notes = inquiry.notes || [];
    const note = {
      id: crypto.randomUUID(),
      authorName: adminName,
      adminId,
      text: dto.text,
      createdAt: new Date(),
    };
    inquiry.notes.push(note);
    await this.inquiryRepository.save(inquiry);
    return note;
  }
}
