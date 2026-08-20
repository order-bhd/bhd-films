import { Wrench, CreditCard, ReceiptText, WalletCards, AlertTriangle, XCircle, FileText, HelpCircle } from 'lucide-react'

// Single source of truth for the 8 issue categories, shared by the
// customer ticket form and the admin support panel.
export const CATEGORIES = [
  { value: 'technical', label: 'Run Issue / Technical Issue', icon: Wrench },
  { value: 'payment', label: 'Payment Issue', icon: CreditCard },
  { value: 'order', label: 'Order Issue', icon: ReceiptText },
  { value: 'wallet', label: 'Wallet Issue', icon: WalletCards },
  { value: 'dropped', label: 'Dropped / Failed Process', icon: AlertTriangle },
  { value: 'failed_transaction', label: 'Failed Transaction', icon: XCircle },
  { value: 'receipt', label: 'Receipt / Invoice Issue', icon: FileText },
  { value: 'other', label: 'Other Issue', icon: HelpCircle }
]

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value
}

export const DROPPED_PROCESS_OPTIONS = [
  { value: 'order_process', label: 'Order process' },
  { value: 'payment_process', label: 'Payment process' },
  { value: 'registration_process', label: 'Registration process' },
  { value: 'wallet_process', label: 'Wallet process' },
  { value: 'other_process', label: 'Other process' }
]

export const WALLET_ISSUE_TYPES = [
  { value: 'balance_mismatch', label: 'Balance looks incorrect' },
  { value: 'fund_not_credited', label: 'Added funds not credited' },
  { value: 'fund_used_incorrectly', label: 'Funds deducted incorrectly' },
  { value: 'other', label: 'Other wallet issue' }
]

export const ORDER_ISSUE_TYPES = [
  { value: 'wrong_quantity', label: 'Wrong quantity delivered' },
  { value: 'not_started', label: 'Order not started' },
  { value: 'delayed', label: 'Order delayed' },
  { value: 'incomplete', label: 'Order incomplete' },
  { value: 'other', label: 'Other order issue' }
]

export const RECEIPT_TYPES = [
  { value: 'order_receipt', label: 'Order receipt' },
  { value: 'payment_receipt', label: 'Payment receipt' },
  { value: 'other', label: 'Other document' }
]

export const STATUSES = [
  { value: 'open', label: 'Open', chip: 'chip-info' },
  { value: 'in_progress', label: 'In Progress', chip: 'chip-warning' },
  { value: 'waiting_customer', label: 'Waiting for Customer', chip: 'chip-gold' },
  { value: 'resolved', label: 'Resolved', chip: 'chip-success' },
  { value: 'closed', label: 'Closed', chip: 'chip-danger' }
]

export function statusMeta(value) {
  return STATUSES.find((s) => s.value === value) || STATUSES[0]
}
