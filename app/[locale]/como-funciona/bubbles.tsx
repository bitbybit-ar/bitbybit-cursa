"use client";

import { Bubble } from "@/components/common/bubble";
import {
  BoltIcon,
  CoinIcon,
  HeartIcon,
  MathSymbolIcon,
} from "@/components/icons";
import styles from "./page.module.scss";

// A smaller bubble set than the landing hero (~5 bubbles instead of
// 14) tuned for the contained ~60vh hero on this page. Icons lean
// into the page's theme: a bolt for Lightning, a coin for pesos.
export function HowItWorksBubbles() {
  return (
    <div className={styles.bubbles} aria-hidden="true">
      <Bubble
        size={72}
        color="blue"
        variant="icon"
        icon={<BoltIcon />}
        opacity={0.32}
        position={{ top: "12%", left: "8%" }}
        animation="float"
        delay={0}
      />
      <Bubble
        size={56}
        color="lime"
        variant="icon"
        icon={<CoinIcon />}
        opacity={0.32}
        position={{ top: "20%", right: "10%" }}
        animation="drift"
        delay={0.8}
      />
      <Bubble
        size={36}
        color="pink"
        variant="solid"
        opacity={0.18}
        position={{ bottom: "22%", left: "14%" }}
        animation="float-slow"
        delay={0.4}
      />
      <Bubble
        size={60}
        color="cyan"
        variant="icon"
        icon={<MathSymbolIcon />}
        opacity={0.28}
        position={{ bottom: "16%", right: "16%" }}
        animation="float"
        delay={1.6}
      />
      <Bubble
        size={32}
        color="gold"
        variant="solid"
        opacity={0.22}
        position={{ top: "55%", left: "48%" }}
        animation="drift"
        delay={1.0}
      />
      <Bubble
        size={44}
        color="lime"
        variant="icon"
        icon={<HeartIcon />}
        opacity={0.26}
        position={{ top: "8%", right: "32%" }}
        animation="float-slow"
        delay={1.4}
      />
    </div>
  );
}
