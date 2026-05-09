"use client";

import { Bubble } from "@/components/common/bubble";
import {
  BoltIcon,
  BookIcon,
  CoinIcon,
  HeartIcon,
  MathSymbolIcon,
  MusicNoteIcon,
  PaletteIcon,
  TrophyIcon,
} from "@/components/icons";
import styles from "./hero.module.scss";

export function HeroBubbles() {
  return (
    <div className={styles.bubbles} aria-hidden="true">
      <Bubble
        size={84}
        color="blue"
        variant="icon"
        icon={<BookIcon />}
        opacity={0.32}
        position={{ top: "8%", left: "4%" }}
        animation="float"
        delay={0}
      />
      <Bubble
        size={56}
        color="lime"
        variant="icon"
        icon={<MathSymbolIcon />}
        opacity={0.32}
        position={{ top: "22%", left: "14%" }}
        animation="drift"
        delay={1.2}
      />
      <Bubble
        size={42}
        color="pink"
        variant="solid"
        opacity={0.18}
        position={{ top: "60%", left: "9%" }}
        animation="float-slow"
        delay={0.4}
      />
      <Bubble
        size={70}
        color="cyan"
        variant="icon"
        icon={<MusicNoteIcon />}
        opacity={0.3}
        position={{ bottom: "12%", left: "5%" }}
        animation="float"
        delay={2.1}
      />
      <Bubble
        size={48}
        color="gold"
        variant="icon"
        icon={<CoinIcon />}
        opacity={0.32}
        position={{ top: "12%", right: "8%" }}
        animation="drift"
        delay={0.8}
      />
      <Bubble
        size={92}
        color="pink"
        variant="icon"
        icon={<PaletteIcon />}
        opacity={0.28}
        position={{ top: "30%", right: "4%" }}
        animation="float-slow"
        delay={1.6}
      />
      <Bubble
        size={60}
        color="blue"
        variant="icon"
        icon={<MusicNoteIcon />}
        opacity={0.3}
        position={{ bottom: "20%", right: "12%" }}
        animation="float"
        delay={2.4}
      />
      <Bubble
        size={36}
        color="orange"
        variant="solid"
        opacity={0.2}
        position={{ bottom: "8%", right: "6%" }}
        animation="drift"
        delay={0.2}
      />
      <Bubble
        size={50}
        color="lime"
        variant="icon"
        icon={<HeartIcon />}
        opacity={0.28}
        position={{ top: "55%", right: "20%" }}
        animation="float-slow"
        delay={1.0}
      />
      <Bubble
        size={44}
        color="gold"
        variant="icon"
        icon={<TrophyIcon />}
        opacity={0.3}
        position={{ top: "45%", left: "30%" }}
        animation="float"
        delay={1.8}
      />
      <Bubble
        size={32}
        color="cyan"
        variant="gradient"
        gradientTo="blue"
        opacity={0.22}
        position={{ top: "70%", left: "40%" }}
        animation="drift"
        delay={0.6}
      />
      <Bubble
        size={56}
        color="pink"
        variant="icon"
        icon={<BoltIcon />}
        opacity={0.28}
        position={{ top: "16%", left: "48%" }}
        animation="float-slow"
        delay={2.0}
      />
      <Bubble
        size={40}
        color="blue"
        variant="icon"
        icon={<MusicNoteIcon />}
        opacity={0.3}
        position={{ top: "5%", right: "32%" }}
        animation="drift"
        delay={1.4}
      />
      <Bubble
        size={38}
        color="lime"
        variant="icon"
        icon={<MusicNoteIcon />}
        opacity={0.28}
        position={{ bottom: "30%", left: "22%" }}
        animation="float"
        delay={0.5}
      />
    </div>
  );
}
