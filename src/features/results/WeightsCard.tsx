import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { Plus, Trash2 } from 'lucide-react';
import type { Component, Preset, Settings } from './api';
import {
  evenSplit,
  newPart,
  sampleResult,
  weightTotal,
  weightsProblem,
  type PresetEdit,
} from './setup-model';

/** One weighting's parts: names, weights (0% = recorded, not counted), papers and how many count, with a worked example. */
export function WeightsCard({
  title,
  preset,
  edit,
  settings,
  onChange,
}: {
  title: string;
  preset: Preset;
  edit: PresetEdit;
  settings: Settings;
  onChange: (edit: PresetEdit) => void;
}) {
  const update = (i: number, change: Partial<Component>) =>
    onChange({
      ...edit,
      components: edit.components.map((c, j) => (j === i ? { ...c, ...change } : c)),
    });
  const remove = (i: number) =>
    onChange({ ...edit, components: edit.components.filter((_, j) => j !== i) });
  const presetKeys = new Set(preset.scheme.components.map((c) => c.key));
  const keys = edit.components.map((c) => c.key);
  const addPart = () =>
    onChange({
      ...edit,
      components: [
        ...edit.components,
        newPart(keys.includes('mocks') ? 'New part' : 'Mocks', keys),
      ],
    });
  // Parts at 0 stay out of the split: they're recorded, not counted, until the school weighs them.
  const splitCounted = () => {
    const counted = edit.components.filter((c) => c.weight > 0);
    const split = evenSplit(counted.length ? counted : edit.components);
    onChange({
      ...edit,
      components: edit.components.map((c) => split.find((s) => s.key === c.key) ?? c),
    });
  };
  if (preset.scheme.mode === 'descriptor')
    return (
      <Card withBorder radius="lg" p="lg">
        <Text fw={700}>{title}</Text>
        <Text size="sm" c="dimmed" mb="sm">
          Rated in words, with no marks to add up. Teachers rate each of these:
        </Text>
        <Group gap="xs">
          {edit.components.map((c) => (
            <Badge key={c.key} variant="light" color="gray">
              {c.label}
            </Badge>
          ))}
        </Group>
      </Card>
    );
  const total = weightTotal(edit.components);
  const sample = sampleResult(edit, settings);
  const problem = weightsProblem(edit, preset.scheme.mode);
  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>{title}</Text>
        <Group gap="xs">
          <Badge color={total === 100 ? 'green' : 'red'} variant="light">
            Total {total} / 100
          </Badge>
          <Button size="compact-xs" variant="subtle" onClick={splitCounted}>
            Split evenly
          </Button>
        </Group>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Stack gap="xs">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Part</Table.Th>
                <Table.Th w={100}>Weight</Table.Th>
                <Table.Th w={150}>Papers</Table.Th>
                <Table.Th w={36} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {edit.components.map((c, i) => (
                <Table.Tr key={c.key}>
                  <Table.Td>
                    <TextInput
                      aria-label={`Name of ${c.label || 'a part'}`}
                      value={c.label}
                      onChange={(e) => update(i, { label: e.currentTarget.value })}
                      size="xs"
                      radius="md"
                    />
                    {c.weight === 0 && (
                      <Text size="xs" c="dimmed" mt={2}>
                        Recorded, not counted
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      aria-label={`Weight of ${c.label || 'a part'}`}
                      value={c.weight}
                      onChange={(v) => update(i, { weight: Number(v) || 0 })}
                      min={0}
                      max={100}
                      decimalScale={2}
                      suffix="%"
                      size="xs"
                      radius="md"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      {!presetKeys.has(c.key) && (
                        <Select
                          aria-label={`Papers for ${c.label || 'a part'}`}
                          data={[
                            { value: 'items', label: 'Several papers' },
                            { value: 'single', label: 'One paper' },
                          ]}
                          value={c.entry}
                          onChange={(v) =>
                            v &&
                            update(i, {
                              entry: v as Component['entry'],
                              bestOf: v === 'single' ? null : c.bestOf,
                            })
                          }
                          allowDeselect={false}
                          size="xs"
                          radius="md"
                        />
                      )}
                      {c.entry === 'items' ? (
                        <NumberInput
                          aria-label={`Best papers counted for ${c.label || 'a part'}`}
                          value={c.bestOf ?? ''}
                          onChange={(v) => update(i, { bestOf: v === '' ? null : Number(v) })}
                          min={1}
                          max={50}
                          allowDecimal={false}
                          placeholder="All papers"
                          prefix={c.bestOf ? 'Best ' : undefined}
                          size="xs"
                          radius="md"
                        />
                      ) : (
                        presetKeys.has(c.key) && (
                          <Text size="xs" c="dimmed">
                            One paper
                          </Text>
                        )
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Remove ${c.label || 'this part'}`}
                      onClick={() => remove(i)}
                      disabled={edit.components.length === 1}
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Add a part such as Mocks, with as many papers as you set. At 0% it is recorded but not
              counted in totals or grades.
            </Text>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<Plus size={12} />}
              onClick={addPart}
            >
              Add a part
            </Button>
          </Group>
        </Stack>
        <Card bg="var(--mantine-color-default-hover)" radius="md" p="md">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>
            Worked example
          </Text>
          {!problem ? (
            <Stack gap={4}>
              {edit.components.map((c, i) => (
                <Text key={c.key} size="sm">
                  {c.label}:{' '}
                  {c.entry === 'items'
                    ? `papers 6, 8, 7, 9 out of 10${c.bestOf ? `, best ${c.bestOf}` : ''}`
                    : '61 out of 80'}{' '}
                  {c.weight > 0 ? (
                    <>
                      → <b>{sample.result.componentScores[i]?.score ?? '—'}</b> of {c.weight}
                    </>
                  ) : (
                    <Text span size="sm" c="dimmed">
                      → recorded, not counted
                    </Text>
                  )}
                </Text>
              ))}
              <Text size="sm" fw={700}>
                Total {sample.result.total} → grade {sample.result.grade ?? '—'}
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {problem}
            </Text>
          )}
        </Card>
      </SimpleGrid>
    </Card>
  );
}
