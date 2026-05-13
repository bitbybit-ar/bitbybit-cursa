"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";
import styles from "./dropdown.module.scss";

export interface DropdownOption {
  value: string;
  label: string;
}

interface BaseProps {
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
  allLabel?: string;
  summaryFormatter?: (count: number) => string;
}

type DropdownProps = SingleProps | MultiProps;

export function Dropdown(props: DropdownProps) {
  const {
    options,
    placeholder,
    disabled,
    id,
    className,
    buttonClassName,
    multiple,
  } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const singleValue = multiple ? undefined : props.value;
  const multiValue = multiple ? props.value : undefined;
  const allLabel = multiple ? props.allLabel : undefined;
  const summaryFormatter = multiple ? props.summaryFormatter : undefined;

  const label = useMemo(() => {
    if (multiple) {
      const selected = multiValue ?? [];
      if (selected.length === 0) {
        return allLabel ?? placeholder ?? "";
      }
      if (selected.length === 1) {
        return options.find((o) => o.value === selected[0])?.label ?? "";
      }
      return summaryFormatter
        ? summaryFormatter(selected.length)
        : `${selected.length} selected`;
    }
    const match = options.find((o) => o.value === singleValue);
    return match?.label ?? placeholder ?? "";
  }, [
    multiple,
    options,
    placeholder,
    singleValue,
    multiValue,
    allLabel,
    summaryFormatter,
  ]);

  const handleSelect = (value: string) => {
    if (multiple) {
      const current = props.value;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      props.onChange(next);
      return;
    }
    props.onChange(value);
    setOpen(false);
  };

  const isSelected = (value: string): boolean => {
    if (multiple) return props.value.includes(value);
    return props.value === value;
  };

  return (
    <div ref={ref} className={cn(styles.dropdown, className)}>
      <button
        id={id}
        type="button"
        className={cn(
          styles.trigger,
          open && styles.triggerOpen,
          buttonClassName
        )}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={props["aria-label"]}
      >
        <span className={styles.triggerLabel}>{label}</span>
        <span aria-hidden="true" className={styles.chevron}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <ul
          className={styles.menu}
          role="listbox"
          aria-multiselectable={multiple}
        >
          {options.map((opt) => {
            const selected = isSelected(opt.value);
            return (
              <li key={opt.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(styles.item, selected && styles.itemSelected)}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className={styles.itemLabel}>{opt.label}</span>
                  {selected && (
                    <span className={styles.itemCheck} aria-hidden="true">
                      <CheckIcon size={14} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
