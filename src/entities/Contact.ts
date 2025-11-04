import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity("contacts")
export class Contact {
  @PrimaryColumn("text")
  contact_id!: string;

  @Index()
  @Column("text", { default: "" })
  first_name: string = "";

  @Index()
  @Column("text", { default: "" })
  last_name: string = "";

  @Index()
  @Column("text", { default: "" })
  program: string = "";

  @Index()
  @Column("text", { default: "" })
  email_address: string = "";

  @Index()
  @Column("text", { default: "" })
  phone: string = "";

  @Index()
  @Column("text", { default: "" })
  contact_created_date: string = "";

  @Index()
  @Column("text", { default: "" })
  action: string = "";

  @Index()
  @Column("text", { default: "" })
  law_firm_id: string = "";

  @Index()
  @Column("text", { default: "" })
  law_firm_name: string = "";
}
