var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryColumn, Column, Index } from "typeorm";
let Contact = class Contact {
    contact_id;
    first_name = "";
    last_name = "";
    program = "";
    email_address = "";
    phone = "";
    contact_created_date = "";
    law_firm_id = 0;
    law_firm_name = "";
};
__decorate([
    PrimaryColumn("integer"),
    __metadata("design:type", Number)
], Contact.prototype, "contact_id", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "first_name", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "last_name", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "program", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "email_address", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "phone", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "contact_created_date", void 0);
__decorate([
    Index(),
    Column("integer", { default: 0 }),
    __metadata("design:type", Number)
], Contact.prototype, "law_firm_id", void 0);
__decorate([
    Index(),
    Column("text", { default: "" }),
    __metadata("design:type", String)
], Contact.prototype, "law_firm_name", void 0);
Contact = __decorate([
    Entity("contacts")
], Contact);
export { Contact };
//# sourceMappingURL=Contact.js.map