var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryColumn, Column } from 'typeorm';
let Contact = class Contact {
    contact_id;
    first_name = null;
    last_name = null;
    program = null;
    email_address = null;
    phone = null;
    contact_created_date = null;
    action = null;
    law_firm_id = null;
    law_firm_name = null;
};
__decorate([
    PrimaryColumn('integer'),
    __metadata("design:type", Number)
], Contact.prototype, "contact_id", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "first_name", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "last_name", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "program", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "email_address", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "phone", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "contact_created_date", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "action", void 0);
__decorate([
    Column('integer', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "law_firm_id", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", Object)
], Contact.prototype, "law_firm_name", void 0);
Contact = __decorate([
    Entity('contacts')
], Contact);
export { Contact };
//# sourceMappingURL=Contact.js.map