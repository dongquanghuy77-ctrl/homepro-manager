const fs = require('fs');

const schemaPath = 'src/db/schema.ts';
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Replace customers
const customersTarget = `export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});`;

const customersReplacement = `export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  taxCode: text('tax_code'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  projectAddress: text('project_address'),
  customerType: text('customer_type').default('INDIVIDUAL'), // INDIVIDUAL, ENTERPRISE
  customerGroup: text('customer_group'),
  assignedTo: integer('assigned_to').references(() => users.id),
  totalContractValue: doublePrecision('total_contract_value').default(0),
  totalDebt: doublePrecision('total_debt').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: text('position'),
  phone: text('phone'),
  email: text('email'),
  zalo: text('zalo'),
  role: text('role'),
  isPrimary: boolean('is_primary').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});`;

schema = schema.replace(customersTarget, customersReplacement);

// 2. Replace leads
const leadsTarget = `export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  company: text('company'),
  source: text('source'),
  status: text('status').notNull().default('NEW'), // NEW, CONTACTED, QUALIFIED, LOST, CONVERTED
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

const leadsReplacement = `export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  company: text('company'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  region: text('region'),
  source: text('source'), // FB, Zalo, Web, Referral, etc.
  type: text('type').default('INDIVIDUAL'),
  status: text('status').notNull().default('NEW'), // NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED, LOST
  potentialLevel: text('potential_level').default('MEDIUM'), // HIGH, MEDIUM, LOW
  estimatedValue: doublePrecision('estimated_value').default(0),
  assignedTo: integer('assigned_to').references(() => users.id),
  notes: text('notes'),
  followUpDate: timestamp('follow_up_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

schema = schema.replace(leadsTarget, leadsReplacement);

// 3. Replace opportunities
const oppsTarget = `export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  leadId: integer('lead_id').references(() => leads.id),
  estimatedValue: doublePrecision('estimated_value').default(0),
  probability: integer('probability').default(0), // 0-100%
  status: text('status').notNull().default('NEW'), // NEW, PROPOSAL, NEGOTIATION, WON, LOST
  expectedCloseDate: timestamp('expected_close_date'),
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

const oppsReplacement = `export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  leadId: integer('lead_id').references(() => leads.id),
  projectId: integer('project_id'), // fk to projects.id but avoid circular initially or add later. we use integer for now.
  projectType: text('project_type'), // TỦ BẾP, FULL NỘI THẤT...
  location: text('location'),
  area: doublePrecision('area'),
  budget: doublePrecision('budget'),
  estimatedValue: doublePrecision('estimated_value').default(0),
  probability: integer('probability').default(0), // 0-100%
  stage: text('stage').notNull().default('NEW'), // NEW, SURVEY, REQUIREMENT, DESIGN, BOQ, QUOTATION, NEGOTIATION, WON, LOST
  expectedCloseDate: timestamp('expected_close_date'),
  assignedTo: integer('assigned_to').references(() => users.id),
  designerId: integer('designer_id').references(() => users.id),
  source: text('source'),
  competitors: text('competitors'),
  nextAction: text('next_action'),
  nextContactDate: timestamp('next_contact_date'),
  lostReason: text('lost_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const crmActivities = pgTable('crm_activities', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // CALL, MEETING, SURVEY, QUOTE, EMAIL, NOTE, TASK
  title: text('title').notNull(),
  description: text('description'),
  leadId: integer('lead_id').references(() => leads.id),
  customerId: integer('customer_id').references(() => customers.id),
  contactId: integer('contact_id').references(() => contacts.id),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  projectId: integer('project_id'),
  quoteId: integer('quote_id'),
  assignedTo: integer('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  status: text('status').default('PENDING'), // PENDING, COMPLETED, CANCELLED
  priority: text('priority').default('MEDIUM'), // HIGH, MEDIUM, LOW
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

schema = schema.replace(oppsTarget, oppsReplacement);

// 4. Replace surveys
const surveysTarget = `export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  surveyDate: timestamp('survey_date'),
  status: text('status').notNull().default('PENDING'), // PENDING, IN_PROGRESS, COMPLETED
  notes: text('notes'),
  documents: jsonb('documents'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

const surveysReplacement = `export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  opportunityId: integer('opportunity_id').references(() => opportunities.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  surveyDate: timestamp('survey_date'),
  status: text('status').notNull().default('PLANNED'), // PLANNED, SCHEDULED, COMPLETED, CANCELLED
  location: text('location'),
  projectType: text('project_type'),
  area: doublePrecision('area'),
  floors: integer('floors'),
  rooms: integer('rooms'),
  style: text('style'),
  budget: doublePrecision('budget'),
  materials: text('materials'),
  colors: text('colors'),
  equipment: text('equipment'),
  deadline: timestamp('deadline'),
  specialRequests: text('special_requests'),
  surveyorId: integer('surveyor_id').references(() => users.id),
  notes: text('notes'),
  documents: jsonb('documents'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

schema = schema.replace(surveysTarget, surveysReplacement);

// 5. Replace quotes
const quotesTarget = `export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  leadId: integer('lead_id').references(() => leads.id),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SENT, ACCEPTED, REJECTED
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

const quotesReplacement = `export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  version: integer('version').default(1),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  projectId: integer('project_id'), // fk to projects
  boqId: integer('boq_id'), // fk to boqs
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  costAmount: doublePrecision('cost_amount').default(0),
  margin: doublePrecision('margin').default(0),
  vat: doublePrecision('vat').default(0),
  paymentTerms: text('payment_terms'),
  deliveryTime: text('delivery_time'),
  productionTime: text('production_time'),
  notes: text('notes'),
  preparedBy: integer('prepared_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  status: text('status').notNull().default('DRAFT'), // DRAFT, INTERNAL_REVIEW, SENT, NEGOTIATING, ACCEPTED, REJECTED, EXPIRED
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});`;

schema = schema.replace(quotesTarget, quotesReplacement);


fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully');
