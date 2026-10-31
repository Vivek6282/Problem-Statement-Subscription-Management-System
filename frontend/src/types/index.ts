export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: Role;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  full_name: string;
  customer_id?: number | null;
}

export type CustomerStatus = 'ACTIVE' | 'ARCHIVED';

export interface Customer {
  id: number;
  reference: string;
  user?: number | null;
  name: string;
  company: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
  subscriptions_count?: number;
  active_subscriptions_count?: number;
  outstanding_balance?: number;
}

export type ProductType = 'SERVICE' | 'SOFTWARE' | 'HARDWARE' | 'SUBSCRIPTION';

export interface ProductVariant {
  id: number;
  product: number;
  name: string;
  sku_suffix: string;
  price_adjustment: string | number;
  effective_sku: string;
  final_unit_price: string | number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  product_type: ProductType;
  sales_price: string | number;
  cost_price: string | number;
  description: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  variants_count?: number;
}

export type BillingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: number;
  name: string;
  code: string;
  description: string;
  price: string | number;
  billing_interval: BillingInterval;
  interval_display: string;
  min_quantity: number;
  availability_start_date: string | null;
  availability_end_date: string | null;
  allow_pause: boolean;
  allow_early_close: boolean;
  allow_renewal: boolean;
  auto_close_on_expiry: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  active_subscriptions_count?: number;
}

export interface TaxRule {
  id: number;
  name: string;
  percentage: string | number;
  applicable_products: number[];
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Discount {
  id: number;
  code: string;
  name: string;
  discount_type: DiscountType;
  value: string | number;
  min_purchase_amount: string | number;
  min_quantity: number;
  usage_limit: number | null;
  times_redeemed: number;
  start_date: string;
  end_date: string | null;
  applicable_products: number[];
  applicable_plans: number[];
  is_active: boolean;
  is_valid_now: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type PaymentTerms = 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';

export interface SubscriptionItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  variant: number | null;
  variant_name: string;
  quantity: number;
  unit_price: string | number;
  tax_rule: number | null;
  discount: number | null;
  line_subtotal: string | number;
}

export interface PricingLine {
  item: number | null;
  name: string;
  variant: string;
  quantity: number;
  unit_price: string;
  discount: string;
  tax: string;
  tax_breakdown: Array<{ name: string; rate: string; amount: string }>;
  line_total: string;
}

export interface SubscriptionPricing {
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  applied_discounts: Array<{ id?: number; code: string; name: string; amount: string }>;
  lines: PricingLine[];
}

export interface HistoryEvent {
  id: number;
  action: string;
  description: string;
  user: string;
  created_at: string;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  customer: number;
  customer_details?: Customer;
  plan: number;
  plan_details?: Plan;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string | null;
  next_billing_date: string;
  last_billing_date: string | null;
  payment_terms: PaymentTerms;
  auto_renew: boolean;
  notes: string;
  discount?: number | null;
  discount_details?: { id: number; code: string; name: string; discount_type: DiscountType; value: string; end_date: string | null } | null;
  pricing?: SubscriptionPricing;
  recurring_subtotal: string | number;
  normalized_mrr: string | number;
  created_at: string;
  updated_at: string;
  items?: SubscriptionItem[];
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: number;
  product_name: string;
  product_sku: string;
  variant_name: string;
  quantity: number;
  unit_price: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  tax_breakdown?: Array<{ name: string; rate: string; amount: string }>;
  line_total: string | number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subscription: number | null;
  customer: number;
  customer_details?: Customer;
  billing_period_start: string | null;
  billing_period_end: string | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  paid_amount: string | number;
  balance_due: string | number;
  is_overdue: boolean;
  subscription_number?: string;
  applied_discounts?: Array<{ id?: number; code: string; name: string; amount: string }>;
  tax_summary?: Array<{ name: string; rate: string; amount: string }>;
  sent_at?: string | null;
  notes: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export type PaymentMethodType = 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CARD' | 'OTHER';

export interface Payment {
  id: number;
  payment_number: string;
  invoice: number;
  invoice_number?: string;
  customer: number;
  customer_name?: string;
  customer_company?: string;
  amount: string | number;
  payment_method: PaymentMethodType;
  payment_date: string;
  transaction_reference: string;
  notes: string;
  status?: 'COMPLETED' | 'REVERSED';
  reversed_at?: string | null;
  reversal_reason?: string;
  created_at: string;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface QuotationItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  variant: number | null;
  variant_name: string;
  description: string;
  quantity: number;
  unit_price: string | number;
  discount?: number | null;
  discount_amount: string | number;
  tax_percentage: string | number;
  tax_amount?: string | number;
  line_total: string | number;
}

export interface QuotationTemplateItem {
  id?: number;
  product: number;
  product_name?: string;
  variant: number | null;
  variant_name?: string;
  quantity: number;
  description?: string;
}

export interface QuotationTemplate {
  id: number;
  name: string;
  description: string;
  plan: number | null;
  plan_name?: string;
  validity_days: number;
  payment_terms: PaymentTerms;
  discount: number | null;
  is_active: boolean;
  items: QuotationTemplateItem[];
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer: number;
  customer_details?: Customer;
  plan: number | null;
  plan_details?: Plan;
  validity_days: number;
  payment_terms?: PaymentTerms;
  discount?: number | null;
  template?: number | null;
  template_name?: string;
  subscription_number?: string;
  subscription_status?: string;
  issue_date: string;
  expiry_date: string | null;
  status: QuotationStatus;
  subtotal: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  converted_subscription: number | null;
  notes: string;
  terms_and_conditions: string;
  items?: QuotationItem[];
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: number;
  user: number | null;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  filters?: Record<string, string | number | null>;
  metrics: {
    total_customers: number;
    active_subscriptions: number;
    total_subscriptions?: number;
    filtered_subscriptions?: number;
    mrr: number;
    arr: number;
    revenue_received?: number;
    revenue_this_month: number;
    invoiced_total?: number;
    total_invoices?: number;
    outstanding_balance: number;
    overdue_count: number;
    overdue_amount?: number;
    due_next_month?: number;
    avg_days_to_pay?: number;
    instant_payout_available?: number;
    upcoming_renewals_count: number;
  };
  revenue_trend: Array<{
    month: string;
    billed: number;
    collected: number;
  }>;
  subscription_distribution: Array<{
    name: string;
    count: number;
  }>;
  invoice_status_summary?: Array<{ status: string; count: number; total: number }>;
  payment_summary?: Array<{ method: string; total_amount: number; count: number }>;
  recent_subscriptions: any[];
  recent_invoices: any[];
  recent_payments: any[];
  overdue_invoices: any[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

