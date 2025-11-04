import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("clients")
export class Client {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, type: "integer" })
  client_id!: number;
}
