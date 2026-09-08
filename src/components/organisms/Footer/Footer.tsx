'use client';

import React from 'react';
import { ActionIcon, Container, Group, Text } from '@mantine/core';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
} from '@tabler/icons-react';
import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '@/components/atoms';
import { businessInfo } from '@/data/businessInfo';
import classes from './FooterLinks.module.css';

const linkGroups = [
  {
    title: 'EduSuite',
    links: [
      { label: 'Student Admissions', href: '#school-erp' },
      { label: 'Grading & Reports', href: '#school-erp' },
      { label: 'Fees & MoMo', href: '#school-erp' },
      { label: 'Bulk SMS Gateway', href: '#school-erp' },
    ],
  },
  {
    title: 'Enterprise',
    links: [
      { label: 'IT Consultancy', href: '#services' },
      { label: 'Database Management', href: '#services' },
      { label: 'Software Engineering', href: '#services' },
      { label: 'Mobile Apps', href: '#services' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#about' },
      { label: 'Data Security', href: '#security' },
      { label: 'Contact', href: '#contact' },
      { label: 'Join Waitlist', href: '/coming-soon' },
    ],
  },
];

export const Footer: React.FC = () => {
  const groups = linkGroups.map((group) => (
    <div className={classes.wrapper} key={group.title}>
      <Text className={classes.title}>{group.title}</Text>
      {group.links.map((link) => (
        <Text key={link.label} component={Link} href={link.href} className={classes.link}>
          {link.label}
        </Text>
      ))}
    </div>
  ));

  return (
    <footer className={classes.footer}>
      <Container size="xl" className={classes.inner}>
        <div className={classes.logo}>
          <BrandLogo variant="light" size="md" withTagline />
          <Text size="sm" c="dimmed" className={classes.description}>
            Simple, reliable, and trusted school &amp; enterprise software, built in Accra,
            Ghana since 2014.
          </Text>
          <div className={classes.contact}>
            <a className={classes.contactRow} href={`tel:${businessInfo.phoneRaw}`}>
              <Phone size={15} color="#e01a2b" />
              {businessInfo.phone}
            </a>
            <a className={classes.contactRow} href={`mailto:${businessInfo.email}`}>
              <Mail size={15} color="#e01a2b" />
              {businessInfo.email}
            </a>
            <span className={classes.contactRow}>
              <MapPin size={15} color="#e01a2b" />
              {businessInfo.poBox}
            </span>
          </div>
        </div>
        <div className={classes.groups}>{groups}</div>
      </Container>

      <Container size="xl" className={classes.afterFooter}>
        <Text c="dimmed" size="sm">
          © {new Date().getFullYear()} Fastrack Management Services. All rights reserved. Mallam – Accra, Ghana.
        </Text>
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            size="lg"
            color="gray"
            variant="subtle"
            aria-label="WhatsApp"
            component="a"
            href={`https://wa.me/${businessInfo.phoneRaw}`}
          >
            <IconBrandWhatsapp size={18} stroke={1.5} />
          </ActionIcon>
          <ActionIcon size="lg" color="gray" variant="subtle" aria-label="Facebook" component="a" href="#">
            <IconBrandFacebook size={18} stroke={1.5} />
          </ActionIcon>
          <ActionIcon size="lg" color="gray" variant="subtle" aria-label="LinkedIn" component="a" href="#">
            <IconBrandLinkedin size={18} stroke={1.5} />
          </ActionIcon>
          <ActionIcon size="lg" color="gray" variant="subtle" aria-label="Instagram" component="a" href="#">
            <IconBrandInstagram size={18} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Container>
    </footer>
  );
};

