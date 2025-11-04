import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("clients")
export class Client {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, type: "text" })
  client_id!: string;
}
