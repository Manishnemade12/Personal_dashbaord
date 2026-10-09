# DECISIONS.md

1. **Indexes.** `employees.emp_code` is unique because it is the business
identifier. `employees(department, joined_on)` supports department headcount
filters. `attendance_logs(emp_code, date)` is unique because there is one
record per employee/day. `attendance_logs(date, emp_code)` supports sorted
listing and date-range analytics, and the status suffix helps filtered
attendance reads. I considered a separate status-first index, but rejected it:
the common filters include employee/date and the extra index would increase
write cost without helping the required sort.

2. **Punch-in race.** Both requests first read the employee, build the same
natural key, and attempt an insert. MongoDB's unique
`(emp_code, date)` index permits exactly one insert. The other receives
`DuplicateKeyError`, which the API returns as 409. There is no check-then-insert
decision that can race.

3. **Ties.** Rows are sorted by total minutes and employee code. The rank is
the first sorted position for each total, so equal totals share a rank and
the next rank is skipped. Filtering happens after ranking, therefore all
employees tied at the cutoff rank are returned.

4. **Headcount.** The department summary starts from employees joined by the
period end, groups those employees by department, and only then overlays
attendance logs. Thus an employee with no log still contributes to headcount.

5. **At 100x scale.** I would move the repeated monthly rollups to materialized
daily/monthly summary collections updated by a change stream or scheduled job,
while keeping the raw logs as the audit source.
