"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Card } from "@/components/ui/card";
import styles from "./page.module.scss";

interface Step {
  title: string;
  body: string;
}

interface StepsProps {
  /** Section heading ("Si comprás un curso" / "Si enseñás algo"). */
  title: string;
  steps: Step[];
}

// Client island for the buyer/creator step lists. The page itself
// stays a server component (force-static); only this reveal-on-scroll
// piece is hydrated. Translations are resolved server-side and passed
// in as plain strings — no next-intl on the client.
//
// `useReducedMotion()` collapses every variant to its visible state
// so the section is fully readable with no transform/opacity work
// when the OS asks for reduced motion (mirrors the SCSS guard the
// rest of the page already uses).
export function HowItWorksSteps({ title, steps }: StepsProps) {
  const reduce = useReducedMotion();

  const list: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.14 },
    },
  };

  const card: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 32 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 90, damping: 16 },
        },
      };

  return (
    <>
      <motion.h2
        className={styles.sectionTitle}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {title}
      </motion.h2>

      <motion.ol
        className={styles.steps}
        variants={list}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        {steps.map((step, i) => (
          <motion.li
            key={step.title}
            className={styles.stepItem}
            variants={card}
          >
            <Card variant="hover" className={styles.stepCard}>
              <span className={styles.stepNumber} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </Card>
          </motion.li>
        ))}
      </motion.ol>
    </>
  );
}
