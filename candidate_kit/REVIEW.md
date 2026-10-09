# REVIEW.md

List every defect you found in the starter `app/main.py` (helpers and endpoints). For each one:

| # | Where (function / line) | What is wrong | How you'd notice it (test, input, or symptom) | How you fixed it |
|---|---|---|---|---|
| 1 | `compute_late_minutes` | Used a naive replacement of the punch-in date, which is wrong for IST and overnight shifts and did not enforce the strict grace boundary. | A UTC timestamp around midnight or a punch at exactly 10 minutes after shift start produces the wrong date/late value. | Convert instants to IST, calculate the record's shift start, and apply `> 10` minutes. |
| 2 | `compute_work_hours` | Python float rounding is not the specified half-up rounding. | A duration whose third decimal is 5 can round down under banker's/float rounding. | Use `Decimal` with `ROUND_HALF_UP`. |
| 3 | `compute_overtime` | Built shift end from the calendar date without handling overnight shifts and counted all positive minutes rather than requiring 30 minutes. | A night-shift checkout after midnight or 19:00 on a normal shift gives an incorrect value. | Calculate the shift end on the correct day and apply the 30-minute threshold. |
| 4 | `create_employee` | Duplicate detection was a check-then-insert race and `created_at` was not normalized for API output. | Concurrent creates can both pass the check; returned datetimes are not epoch milliseconds. | Add a unique index and translate `DuplicateKeyError`; centralize serialization. |
| 5 | `list_employees` | Skipped `page * page_size` instead of `(page - 1) * page_size`, counted unfiltered documents, and had no bounds validation or sort. | Page 1 omits the first page and department totals are wrong. | Validate pagination, count the filtered query, and sort by `emp_code`. |
| 6 | `punch_in` | Did not reject an unknown employee, used local naive time, allowed invalid statuses, and relied on a race-prone pre-check. | Unknown employees cause a server error and simultaneous requests can create duplicates. | Validate the employee, use UTC/IST conversion, validate status, and rely on the unique natural-key index. |
| 7 | `list_attendance` | Loaded and sorted the entire collection in Python, returned `_id`, and did not validate dates/status/page values. | Performance collapses on the grader's large dataset and the response leaks internal identifiers. | Query, sort, count, and paginate in MongoDB, then serialize only public fields. |
| 8 | Missing endpoints | Punch-out, corrections, all analytics, and explain were absent. | The documented routes return 404. | Implemented the complete contract and shared derivation/serialization helpers. |

The starter's use of the two named MongoDB collections was not a defect: it
matches the supplied data model. The default `status` and shift values were
also retained, but are now validated against the contract.

Also note anything you looked at and decided was **not** a defect, and why.
