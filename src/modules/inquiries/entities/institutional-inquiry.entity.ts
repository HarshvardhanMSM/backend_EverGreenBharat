import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InquiryStatus } from '../../../common/enums/nursery.enums';

@Entity('institutional_inquiries')
export class InstitutionalInquiry extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  companyName: string;

  @Index('IDX_institutional_inquiries_email')
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 25 })
  contactNumber: string;

  @Column({ type: 'text' })
  purpose: string;

  @Index('IDX_institutional_inquiries_status')
  @Column({
    type: 'enum',
    enum: InquiryStatus,
    default: InquiryStatus.NEW,
  })
  status: InquiryStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedAdminId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  notes: Array<{
    id: string;
    authorName: string;
    adminId: string;
    text: string;
    createdAt: Date;
  }>;
}
