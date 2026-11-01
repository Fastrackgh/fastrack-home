'use client';

import React from 'react';
import Link from 'next/link';
import { Anchor, Card, Group, Pagination, UnstyledButton } from '@mantine/core';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE } from '@/lib/pagination';
import classes from './ui.module.css';

/** `← Fees` above a detail page. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Anchor component={Link} href={href} size="sm" c="dimmed" mb="md" className={classes.backLink}>
      <ArrowLeft size={14} /> {children}
    </Anchor>
  );
}

/** A tappable card in a list that opens a detail page. */
export function LinkCard({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <UnstyledButton component={Link} href={href}>
      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" wrap="nowrap">
          {children}
        </Group>
      </Card>
    </UnstyledButton>
  );
}

/** The `>` at the end of a `LinkCard`. */
export function RowChevron() {
  return <ChevronRight size={18} color="var(--mantine-color-gray-5)" />;
}

/** Page numbers under a list, shown only when it spans more than one page. */
export function ListPagination({
  total,
  page,
  onChange,
}: {
  total: number;
  page: number;
  onChange: (page: number) => void;
}) {
  if (total <= PAGE_SIZE) return null;
  return (
    <Group justify="center">
      <Pagination
        total={Math.ceil(total / PAGE_SIZE)}
        value={page}
        onChange={onChange}
        color="fastrackRed"
        size="sm"
      />
    </Group>
  );
}
