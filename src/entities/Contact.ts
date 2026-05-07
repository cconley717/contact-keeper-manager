import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity("contacts")
export class Contact {
  @PrimaryColumn("integer")
  contact_id!: number;

  @Index()
  @Column("text", { default: "" })
  first_name: string = "";

  @Index()
  @Column("text", { default: "" })
  last_name: string = "";

  @Index()
  @Column("text", { default: "" })
  client_id: string = "";

  @Index()
  @Column("text", { default: "" })
  client_name: string = "";

  @Index()
  @Column("text", { default: "" })
  email_address: string = "";

  @Index()
  @Column("text", { default: "" })
  phone: string = "";

  @Index()
  @Column("text", { default: "" })
  law_firm_id: string = "";

  @Index()
  @Column("text", { default: "" })
  law_firm_name: string = "";
}
