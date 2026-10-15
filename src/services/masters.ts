/**
 * 2.1 Organizational Hierarchy & Shared Masters Service
 *
 * Manages Company → Region → Project → Site hierarchy,
 * Company → Plant, Department, CostCentre, and all shared masters.
 */

import { storage } from './storage';
import {
  Company, Region, Project, Site, Plant, Department, CostCentre,
  User, Employee, Vendor, Customer, Item, UnitOfMeasure, Warehouse,
  TaxCode, Account
} from './types';
import { generateId } from './utils';

// Adapters
const companies = storage.getAdapter<Company>('companies');
const regions = storage.getAdapter<Region>('regions');
const projects = storage.getAdapter<Project>('projects');
const sites = storage.getAdapter<Site>('sites');
const plants = storage.getAdapter<Plant>('plants');
const departments = storage.getAdapter<Department>('departments');
const costCentres = storage.getAdapter<CostCentre>('cost_centres');
const users = storage.getAdapter<User>('users');
const employees = storage.getAdapter<Employee>('employees');
const vendors = storage.getAdapter<Vendor>('vendors');
const customers = storage.getAdapter<Customer>('customers');
const items = storage.getAdapter<Item>('items');
const uoms = storage.getAdapter<UnitOfMeasure>('uoms');
const warehouses = storage.getAdapter<Warehouse>('warehouses');
const taxCodes = storage.getAdapter<TaxCode>('tax_codes');
const accounts = storage.getAdapter<Account>('accounts');

// ============================================================================
// Company
// ============================================================================

export async function createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'financialYearStart' | 'currency' | 'timezone'> & {
  financialYearStart?: Company['financialYearStart'];
  currency?: string;
  timezone?: string;
}): Promise<Company> {
  const company: Company = {
    ...data,
    id: generateId(),
    financialYearStart: data.financialYearStart || { month: 4, day: 1 },
    currency: data.currency || 'INR',
    timezone: data.timezone || 'Asia/Kolkata',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return companies.create(company);
}

export async function getCompany(id: string): Promise<Company | null> {
  return companies.findById(id);
}

export async function listCompanies(): Promise<Company[]> {
  return companies.findAll();
}

// ============================================================================
// Project
// ============================================================================

export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  const company = await companies.findById(data.companyId);
  if (!company) throw new Error(`Company ${data.companyId} not found`);

  const project: Project = {
    ...data,
    id: generateId(),
    status: data.status || 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return projects.create(project);
}

export async function getProject(id: string): Promise<Project | null> {
  return projects.findById(id);
}

export async function listProjects(companyId: string): Promise<Project[]> {
  return projects.findAll({ companyId } as Partial<Project>);
}

// ============================================================================
// Site
// ============================================================================

export async function createSite(data: Omit<Site, 'id' | 'createdAt'>): Promise<Site> {
  const project = await projects.findById(data.projectId);
  if (!project) throw new Error(`Project ${data.projectId} not found`);

  const site: Site = {
    ...data,
    id: generateId(),
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
  };
  return sites.create(site);
}

export async function listSites(projectId: string): Promise<Site[]> {
  return sites.findAll({ projectId } as Partial<Site>);
}

// ============================================================================
// Plant
// ============================================================================

export async function createPlant(data: Omit<Plant, 'id' | 'createdAt'>): Promise<Plant> {
  const company = await companies.findById(data.companyId);
  if (!company) throw new Error(`Company ${data.companyId} not found`);

  const plant: Plant = {
    ...data,
    id: generateId(),
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
  };
  return plants.create(plant);
}

export async function listPlants(companyId: string): Promise<Plant[]> {
  return plants.findAll({ companyId } as Partial<Plant>);
}

// ============================================================================
// Department & Cost Centre
// ============================================================================

export async function createDepartment(data: Omit<Department, 'id' | 'createdAt'>): Promise<Department> {
  const dept: Department = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  return departments.create(dept);
}

export async function createCostCentre(data: Omit<CostCentre, 'id' | 'createdAt'>): Promise<CostCentre> {
  const cc: CostCentre = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  return costCentres.create(cc);
}

// ============================================================================
// User
// ============================================================================

export async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const existing = await users.findOne({ username: data.username } as Partial<User>);
  if (existing) throw new Error(`Username ${data.username} already exists`);

  const emailExists = await users.findOne({ email: data.email } as Partial<User>);
  if (emailExists) throw new Error(`Email ${data.email} already exists`);

  const user: User = {
    ...data,
    id: generateId(),
    active: data.active !== false,
    mfaEnabled: data.mfaEnabled || false,
    createdAt: new Date().toISOString(),
  };
  return users.create(user);
}

export async function getUser(id: string): Promise<User | null> {
  return users.findById(id);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return users.findOne({ username } as Partial<User>);
}

export async function listUsers(companyId: string): Promise<User[]> {
  return users.findAll({ companyId } as Partial<User>);
}

// ============================================================================
// Employee
// ============================================================================

export async function createEmployee(data: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  const emp: Employee = { ...data, id: generateId(), active: data.active !== false, createdAt: new Date().toISOString() };
  return employees.create(emp);
}

// ============================================================================
// Vendor & Customer
// ============================================================================

export async function createVendor(data: Omit<Vendor, 'id' | 'createdAt'>): Promise<Vendor> {
  const vendor: Vendor = { ...data, id: generateId(), active: data.active !== false, createdAt: new Date().toISOString() };
  return vendors.create(vendor);
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
  const customer: Customer = { ...data, id: generateId(), active: data.active !== false, createdAt: new Date().toISOString() };
  return customers.create(customer);
}

// ============================================================================
// Item
// ============================================================================

export async function createItem(data: Omit<Item, 'id' | 'createdAt'>): Promise<Item> {
  const item: Item = {
    ...data,
    id: generateId(),
    isFuelItem: data.isFuelItem || false,
    isRmcMaterial: data.isRmcMaterial || false,
    isSpare: data.isSpare || false,
    active: data.active !== false,
    createdAt: new Date().toISOString(),
  };
  return items.create(item);
}

export async function listItems(companyId: string, category?: Item['category']): Promise<Item[]> {
  const filter: Partial<Item> = { companyId } as Partial<Item>;
  if (category) filter.category = category;
  return items.findAll(filter);
}

// ============================================================================
// Unit of Measure
// ============================================================================

export async function createUoM(data: Omit<UnitOfMeasure, 'id' | 'createdAt'>): Promise<UnitOfMeasure> {
  const uom: UnitOfMeasure = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  return uoms.create(uom);
}

export async function getUoM(id: string): Promise<UnitOfMeasure | null> {
  return uoms.findById(id);
}

export async function getUoMByCode(code: string): Promise<UnitOfMeasure | null> {
  return uoms.findOne({ code } as Partial<UnitOfMeasure>);
}

export async function listUoMs(): Promise<UnitOfMeasure[]> {
  return uoms.findAll();
}

export function convertUoM(value: number, fromCode: string, toCode: string, uomList: UnitOfMeasure[]): number {
  const from = uomList.find(u => u.code === fromCode);
  const to = uomList.find(u => u.code === toCode);
  if (!from || !to) throw new Error(`UoM not found: ${fromCode} or ${toCode}`);
  if (from.category !== to.category) throw new Error(`Cannot convert between ${from.category} and ${to.category}`);

  // Convert to base, then to target
  const baseValue = value * from.factorToBase;
  const result = baseValue / to.factorToBase;

  // Apply rounding
  switch (to.roundingRule) {
    case 'floor': return Math.floor(result * Math.pow(10, to.decimalPlaces)) / Math.pow(10, to.decimalPlaces);
    case 'ceil': return Math.ceil(result * Math.pow(10, to.decimalPlaces)) / Math.pow(10, to.decimalPlaces);
    case 'half_up': return Math.round(result * Math.pow(10, to.decimalPlaces)) / Math.pow(10, to.decimalPlaces);
    default: return parseFloat(result.toFixed(to.decimalPlaces));
  }
}

// ============================================================================
// Warehouse, Tax Code, Account
// ============================================================================

export async function createWarehouse(data: Omit<Warehouse, 'id' | 'createdAt'>): Promise<Warehouse> {
  const wh: Warehouse = { ...data, id: generateId(), active: data.active !== false, createdAt: new Date().toISOString() };
  return warehouses.create(wh);
}

export async function createTaxCode(data: Omit<TaxCode, 'id' | 'createdAt'>): Promise<TaxCode> {
  const tc: TaxCode = { ...data, id: generateId(), active: data.active !== false, createdAt: new Date().toISOString() };
  return taxCodes.create(tc);
}

export async function createAccount(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  const acc: Account = { ...data, id: generateId(), active: data.active !== false, createdAt: new Date().toISOString() };
  return accounts.create(acc);
}

export async function listAccounts(companyId: string, type?: Account['type']): Promise<Account[]> {
  const filter: Partial<Account> = { companyId } as Partial<Account>;
  if (type) filter.type = type;
  return accounts.findAll(filter);
}
