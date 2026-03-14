'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function FadeIn({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  )
}
