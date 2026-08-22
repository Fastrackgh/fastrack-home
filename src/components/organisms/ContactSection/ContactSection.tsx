'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Group,
  Text,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
  Button,
  Notification,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { DisplayHeading, StatusBadge } from '@/components/atoms';
import { ContactInfoItem } from '@/components/molecules';
import { businessInfo } from '@/data/businessInfo';
import { Phone, Mail, MapPin, Navigation, Send, Check } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSubmitted(true);
  };

  return (
    <Box
      id="contact"
      component="section"
      py={{ base: 60, md: 100 }}
      style={{
        background: '#ffffff',
        borderTop: '1px solid #f1f5f9',
      }}
    >
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48}>
          {/* Left Column: Office & Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Stack gap="lg">
              <Group gap="xs">
                {/* <motion.div whileHover={{ scale: 1.05 }}>
                  <StatusBadge variantStyle="red-subtle">
                    Accra Corporate Office
                  </StatusBadge>
                </motion.div> */}
              </Group>

              <DisplayHeading
                level={2}
              >
                Get In Touch With Fastrack
              </DisplayHeading>

              <Text
                size="md"
                c="dimmed"
                style={{
                  lineHeight: 1.6,
                  fontSize: '1rem',
                }}
              >
                Whether you are looking to deploy our flagship School ERP, modernize your database
                infrastructure, or launch high-throughput Bulk SMS campaigns, our team in Accra is ready to help.
              </Text>

              <Stack gap="lg" mt="sm">
                <ContactInfoItem
                  icon={<MapPin size={22} />}
                  label="Postal Address"
                  value={businessInfo.poBox}
                  subvalue="Accra, Greater Accra Region, Ghana"
                />

                <ContactInfoItem
                  icon={<Navigation size={22} />}
                  label="Digital Address (GhanaPost GPS)"
                  value={businessInfo.digitalAddress}
                  subvalue="Direct GPS Navigation Code"
                />

                <ContactInfoItem
                  icon={<Phone size={22} />}
                  label="Telephone / Support Line"
                  value={businessInfo.phone}
                  subvalue="Direct Line for Consultations & ERP Inquiries"
                  href={`tel:${businessInfo.phoneRaw}`}
                />

                <ContactInfoItem
                  icon={<Mail size={22} />}
                  label="Official Email"
                  value={businessInfo.email}
                  subvalue="Fastrack Management Services Inbox"
                  href={`mailto:${businessInfo.email}`}
                />
              </Stack>
            </Stack>
          </motion.div>

          {/* Right Column: Direct Consultation Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <Box
              style={{
                padding: '36px 32px',
                borderRadius: '24px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Text
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  color: '#0f172a',
                  marginBottom: 6,
                }}
              >
                Request a Consultation or Demo
              </Text>
              <Text size="xs" c="dimmed" mb="xl">
                Fill in your details below and a Fastrack solutions specialist will respond within 24 hours.
              </Text>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Notification
                      icon={<Check size={18} />}
                      color="teal"
                      title="Message Sent Successfully!"
                      withCloseButton={false}
                      radius="md"
                    >
                      Thank you for contacting Fastrack Management Services. Our Accra office has received your
                      inquiry and will get back to you shortly.
                    </Notification>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <TextInput
                          label="Your Name"
                          placeholder="e.g. Kwame Mensah"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          radius="md"
                        />
                        <TextInput
                          label="School or Organization"
                          placeholder="e.g. St. Thomas School"
                          value={form.organization}
                          onChange={(e) => setForm({ ...form, organization: e.target.value })}
                          radius="md"
                        />
                      </SimpleGrid>

                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <TextInput
                          label="Email Address"
                          placeholder="name@school.edu.gh"
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          radius="md"
                        />
                        <TextInput
                          label="Phone / WhatsApp Number"
                          placeholder="+233 24 123 4567"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          radius="md"
                        />
                      </SimpleGrid>

                      <Textarea
                        label="How can we assist your institution?"
                        placeholder="Tell us about your school size, current challenges, or services of interest..."
                        minRows={4}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        radius="md"
                      />

                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          color="fastrackRed"
                          size="md"
                          radius="xl"
                          fullWidth
                          rightSection={<Send size={16} />}
                          style={{
                            marginTop: 8,
                            background: 'linear-gradient(135deg, #e01a2b 0%, #cb1323 100%)',
                            boxShadow: '0 8px 24px -4px rgba(224, 26, 43, 0.35)',
                          }}
                        >
                          Send Consultation Request
                        </Button>
                      </motion.div>
                    </Stack>
                  </form>
                )}
              </AnimatePresence>
            </Box>
          </motion.div>
        </SimpleGrid>
      </Container>
    </Box>
  );
};
