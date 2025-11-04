import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryColumn('integer')
  contact_id!: number;

  @Column('text', { nullable: true })
  first_name: string | null = null;

  @Column('text', { nullable: true })
  last_name: string | null = null;

  @Column('text', { nullable: true })
  program: string | null = null;

  @Column('text', { nullable: true })
  email_address: string | null = null;

  @Column('text', { nullable: true })
  phone: string | null = null;

  @Column('text', { nullable: true })
  contact_created_date: string | null = null;

  @Column('text', { nullable: true })
  action: string | null = null;

  @Column('integer', { nullable: true })
  law_firm_id: number | null = null;

  @Column('text', { nullable: true })
  law_firm_name: string | null = null;
}
