// Run with node scripts/check-dashboard.cjs. Uses the existing TypeScript dev dependency.
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
function load(relative) {
  const filename = path.resolve(__dirname, "..", relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(compiled, filename);
  return mod.exports;
}
const d = load("src/features/dashboard/phase-one/domain.ts");
const m = load("src/features/dashboard/model.ts");
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log(`PASS ${name}`);
}
check("tuition discount excludes other fee components and arrears", () => {
  const s = d.initialPhaseState("ADMIN", "abena");
  const b = { ...s.bills[0], discountPercent: 10, scholarshipPercent: 0 };
  const total = d.billTotals(b, s.payments);
  assert.equal(total.totalFees, 130000);
  assert.equal(total.discount, 10000);
  assert.equal(total.accumulated, 150000);
  assert.equal(total.payable, 140000);
  assert.equal(total.paid, 60000);
  assert.equal(total.balance, 80000);
});
check("scholarship applies to all current fees, excluding arrears", () => {
  const s = d.initialPhaseState("ADMIN", "abena");
  assert.equal(
    d.billTotals(
      { ...s.bills[0], discountPercent: 0, scholarshipPercent: 20 },
      [],
    ).discount,
    26000,
  );
});
check(
  "other income and other-term payments never reduce tuition balance",
  () => {
    const s = d.initialPhaseState("ADMIN", "abena");
    const b = s.bills[0];
    const baseline = d.billTotals(b, s.payments).balance;
    assert.equal(
      d.billTotals(b, [
        ...s.payments,
        { ...s.payments[0], termId: "2025-3", amount: 900000 },
        { ...s.payments[0], kind: "Other income", amount: 900000 },
      ]).balance,
      baseline,
    );
  },
);
check(
  "fee and other-income receipt numbering are independent and zero padded",
  () => {
    const s = d.initialPhaseState("ADMIN", "abena");
    assert.equal(d.nextReceipt([], "School fees"), "FEE-001");
    assert.equal(d.nextReceipt(s.payments, "School fees"), "FEE-003");
    assert.equal(d.nextReceipt(s.payments, "Other income"), "INC-002");
  },
);
check(
  "school-day calculation excludes weekends and de-duplicates active closures",
  () => {
    const event = {
      id: "x",
      termId: "2026-1",
      type: "Holiday/Closure",
      date: "2026-09-21",
      endDate: "2026-09-23",
      scope: "Whole School",
      status: "Active",
    };
    const result = d.schoolDays(
      "2026-09-21",
      "2026-09-27",
      [
        event,
        { ...event, id: "y", date: "2026-09-22", endDate: "2026-09-24" },
        {
          ...event,
          id: "z",
          date: "2026-09-25",
          endDate: "2026-09-25",
          status: "Cancelled",
        },
      ],
      "2026-1",
    );
    assert.deepEqual(result, { weekdays: 5, excluded: 4, total: 1 });
    assert.equal(
      d.schoolDays(
        "2026-09-21",
        "2026-09-27",
        [{ ...event, scope: "Primary 4" }],
        "2026-1",
        "Primary 2",
      ).total,
      5,
    );
    assert.equal(
      d.schoolDays(
        "2026-09-21",
        "2026-09-27",
        [{ ...event, status: "Postponed" }],
        "2026-1",
      ).total,
      5,
    );
  },
);
check("full payment cancels plan reminders; other income does not", () => {
  const s = d.initialPhaseState("ADMIN", "abena");
  const p = s.plans[0];
  assert.match(d.planStatus(p, s), /^Active/);
  s.payments.push({
    ...s.payments[0],
    id: "INC-002",
    kind: "Other income",
    amount: 90000,
  });
  assert.match(d.planStatus(p, s), /^Active/);
  s.payments.push({ ...s.payments[0], id: "FEE-003", amount: 90000 });
  assert.match(d.planStatus(p, s), /^Settled/);
  assert.equal(d.planStatus({ ...p, status: "Cancelled" }, s), "Cancelled");
});
check("room, class and teacher conflicts include date-specific exams", () => {
  const s = d.initialPhaseState("ACADEMIC_HEAD", "abena");
  const slot = s.slots[0];
  assert.equal(
    d.hasConflict(
      { ...slot, id: "new", start: "08:30", end: "09:30" },
      s.slots,
    ),
    true,
  );
  assert.equal(
    d.hasConflict(
      { ...slot, id: "new", start: "09:00", end: "10:00" },
      s.slots,
    ),
    false,
  );
  assert.equal(
    d.hasConflict(
      { ...slot, id: "exam", kind: "Examination", day: "2026-09-21" },
      s.slots,
    ),
    true,
  );
  assert.equal(
    d.hasConflict({ ...slot, id: "exam", day: "2026-09-22" }, s.slots),
    false,
  );
});
check("assessment weights feed report grade and GPA", () => {
  const s = d.initialPhaseState("ACADEMIC_HEAD", "abena");
  const r = d.resultFor({ ...s.assessments[0], ca: 100, exam: 50 }, s);
  assert.equal(r.total, 70);
  assert.equal(r.grade, "B");
  assert.equal(r.points, 3);
});
check(
  "parents see only selected linked-child archive and teachers only assigned class",
  () => {
    const p = d.initialPhaseState("PARENT", "kwesi");
    assert.deepEqual(
      p.students.map((s) => s.id),
      ["kwesi"],
    );
    assert.ok(p.documents.every((x) => x.studentId === "kwesi"));
    assert.equal(p.questions.length, 0);
    const t = d.initialPhaseState("TEACHER", "abena");
    assert.ok(t.students.every((s) => s.classId === "Primary 2"));
    assert.ok(t.documents.every((x) => x.classId === "Primary 2"));
  },
);
check(
  "six PDF roles have required menus; finance stays hidden from Secretary and academics",
  () => {
    for (const role of [
      "PARENT",
      "SCHOOL_HEAD",
      "TEACHER",
      "ACADEMIC_HEAD",
      "ADMIN",
      "SECRETARY",
    ]) {
      assert.ok(m.canAccess(role, "calendar"));
      assert.ok(m.canAccess(role, "archive"));
    }
    assert.ok(m.canAccess("SECRETARY", "enquiries"));
    assert.ok(m.canAccess("ACADEMIC_HEAD", "grading"));
    assert.ok(m.canAccess("ADMIN", "plans"));
    assert.equal(m.canAccess("PARENT", "questions"), false);
    for (const role of ["SECRETARY", "TEACHER", "ACADEMIC_HEAD"])
      assert.equal(m.canAccess(role, "finance"), false);
    for (const role of m.roles)
      assert.equal(m.roleConfig[role].areas.includes("resources"), false);
  },
);
console.log(`${checks} dashboard domain checks passed.`);
