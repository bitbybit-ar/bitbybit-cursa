import { Block } from "@/components/common/block";
import styles from "./logo-blocks.module.scss";

export function LogoBlocks() {
  return (
    <div className={styles.stack} aria-hidden="true">
      <Block size="tiny" color="blue" />
      <Block size="tiny" color="lime" />
      <Block size="tiny" color="pink" />
    </div>
  );
}

export default LogoBlocks;
