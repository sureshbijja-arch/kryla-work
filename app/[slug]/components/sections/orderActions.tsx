'use client'
import { useState } from 'react'
import OrderModal, { type OrderItem } from '../OrderModal'
import CustomOrderModal from '../CustomOrderModal'

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
}

export function OrderActionModals({ orderItem, customOpen, onCloseOrder, onCloseCustomOrder, providerId, accentColor }: ModalsProps) {
  return (
    <>
      {orderItem && (
        <OrderModal item={orderItem} providerId={providerId} accentColor={accentColor} onClose={onCloseOrder} />
      )}
      {customOpen && (
        <CustomOrderModal providerId={providerId} accentColor={accentColor} onClose={onCloseCustomOrder} />
      )}
    </>
  )
}

export type { OrderItem }
