import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity("contacts")
export class Contact {
  @PrimaryColumn("integer")
  contact_id!: number;

  @Index()
  @Column("text", { nullable: true })
  first_name: string | null = null;

  @Index()
  @Column("text", { nullable: true })
  last_name: string | null = null;

  @Index()
  @Column("text", { nullable: true })
  program: string | null = null;

  @Index()
  @Column("text", { nullable: true })
  email_address: string | null = null;

  @Index()
  @Column("text", { nullable: true })
  phone: string | null = null;

  @Index()
  @Column("text", { nullable: true })
  contact_created_date: string | null = null;

  @Index()
  @Column("text", { nullable: true })
  action: string | null = null;

  @Index()
  @Column("integer", { nullable: true })
  law_firm_id: number | null = null;

  @Index()
  @Column("text", { nullable: true })
  law_firm_name: string | null = null;
}
