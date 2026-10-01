import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpCode, OtpChannel, OtpPurpose } from '../entities/otp-code.entity';

@Injectable()
export class OtpCodesRepository {
  constructor(
    @InjectRepository(OtpCode)
    private readonly repo: Repository<OtpCode>,
  ) {}

  get repository(): Repository<OtpCode> {
    return this.repo;
  }

  async findLatest(
    purpose: OtpPurpose,
    channel: OtpChannel,
    destination: string,
  ): Promise<OtpCode | null> {
    return this.repo.findOne({
      where: { purpose, channel, destination },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<OtpCode | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<OtpCode>): OtpCode {
    return this.repo.create(data);
  }

  async save(otp: OtpCode): Promise<OtpCode> {
    return this.repo.save(otp);
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { isUsed: true, usedAt: new Date() });
  }

  async incrementAttempts(id: string, attempts: number): Promise<void> {
    await this.repo.update({ id }, { attempts });
  }
}
