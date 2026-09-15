"use client";

import { motion, useReducedMotion } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/**
 * ظهور ناعم عند التمرير — Fade In + انزلاق بسيط لأعلى
 * يُنفَّذ مرة واحدة فقط ويحترم تفضيل تقليل الحركة
 */
export function Reveal({ children, className, delay = 0, y = 26 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
