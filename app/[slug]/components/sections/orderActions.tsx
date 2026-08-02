'use client'
import { useState } from 'react'
import OrderModal, { type OrderItem } from '../OrderModal'
import CustomOrderModal from '../CustomOrderModal'
import type { OrderConfig } from '../../types'

/**
 * Shared Order/Custom-Order modal wiring — previously duplicated inline in
 * ServicesSection.tsx's Sizes variant (now Collection) and needed again by
 * HeroSection.tsx's HeroPdp (the v3 rebuild's size selector and CTA both open
 * these same modals). One implementation, two call sites.
 */
export function useOrderActions() {
  const [orderItem, setOrderItem] = useState<OrderItem | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  return {
    orderItem, setOrderItem,
    customOpen, setCustomOpen,
    openOrder: (item: OrderItem) => setOrderItem(item),
    openCustomOrder: () => setCustomOpen(true),
  }
}

interface ModalsProps {
  orderItem: OrderItem | null
  customOpen: boolean
  onCloseOrder: () => void
  onCloseCustomOrder: () => void
  providerId: string
  accentColor: string
  /** DB-driven order-form vocabulary for this persona (occasions,
   * fulfillment, custom-order fields) — see getOrderConfig() in
   * lib/personas.ts. Optional so existing call sites that haven't been
   * updated yet fall back to OrderModal/CustomOrderModal's own generic
   * default rather than failing to render. */
  orderConfig?: OrderConfig
  /** Persona id — lets OrderModal honour PERSONA_CONFIG's hasQuantity/
   * hasNotes flags (previously ignored entirely). Optional for the same
   * backward-compat reason as orderConfig. */
  persona?: string
}

export function OrderActionModals({ orderItem, customOpen, onCloseOrder, onCloseCustomOrder, providerId, accentColor, orderConfig, persona }: ModalsProps) {
  return (
    <>
      {orderItem && (
        <OrderModal item={orderItem} providerId={providerId} accentColor={accentColor} config={orderConfig} persona={persona} onClose={onCloseOrder} />
      )}
      {customOpen && (
        <CustomOrderModal providerId={providerId} accentColor={accentColor} config={orderConfig} onClose={onCloseCustomOrder} />
      )}
    </>
  )
}

export type { OrderItem }
