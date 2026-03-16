import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const CSV_PATH = path.join(process.cwd(), 'data', 'wplp80_questions_v1.csv');
const VERSION_KEY = 'wplp80-v1';
const QUESTION_SET_KEY = 'wplp80-v1-main';

const OPTION_ORDER = { A: 1, B: 2, C: 3, D: 4 };

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

function parseCsv(csvRaw) {
  const lines = csvRaw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV has no data rows.');
  }

  const headers = parseCsvLine(lines[0]);
  const requiredHeaders = [
    'question_id',
    'section_key',
    'section_name',
    'prompt',
    'reverse_scored',
    'question_weight_default',
    'scoring_family',
    'notes',
    'option_key',
    'option_text',
    'signal_code',
    'signal_weight',
  ];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`Missing required CSV header: ${header}`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} columns, expected ${headers.length}.`);
    }

    return Object.fromEntries(headers.map((header, colIndex) => [header, values[colIndex]]));
  });
}

function toBoolean(raw) {
  return ['true', 't', '1', 'yes', 'y'].includes(String(raw).toLowerCase());
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run seed script.');
}

const client = new Client({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

try {
  const csvRaw = await readFile(CSV_PATH, 'utf8');
  const rows = parseCsv(csvRaw);

  await client.query('BEGIN');

  const versionResult = await client.query(
    `SELECT id
     FROM assessment_versions
     WHERE key = $1`,
    [VERSION_KEY]
  );

  const versionId = versionResult.rows[0]?.id;
  if (!versionId) {
    throw new Error(`Assessment version '${VERSION_KEY}' not found.`);
  }

  const questionSetResult = await client.query(
    `INSERT INTO assessment_question_sets (
       assessment_version_id,
       key,
       name,
       description,
       is_active
     ) VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (key)
     DO UPDATE SET
       assessment_version_id = EXCLUDED.assessment_version_id,
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id`,
    [
      versionId,
      QUESTION_SET_KEY,
      'WPLP-80 Main Question Set',
      'Primary question set for WPLP-80 Sonartra Signals',
    ]
  );

  const questionSetId = questionSetResult.rows[0].id;

  const groupedByQuestion = new Map();

  for (const row of rows) {
    const questionId = Number(row.question_id);
    if (!Number.isInteger(questionId) || questionId < 1) {
      throw new Error(`Invalid question_id: ${row.question_id}`);
    }

    const optionKey = String(row.option_key).toUpperCase();
    if (!OPTION_ORDER[optionKey]) {
      throw new Error(`Invalid option_key '${row.option_key}' for question ${questionId}.`);
    }

    if (!groupedByQuestion.has(questionId)) {
      groupedByQuestion.set(questionId, []);
    }

    groupedByQuestion.get(questionId).push(row);
  }

  for (const [questionNumber, questionRows] of groupedByQuestion.entries()) {
    const canonical = questionRows[0];
    const questionKey = `wplp80_q${String(questionNumber).padStart(2, '0')}`;

    const questionResult = await client.query(
      `INSERT INTO assessment_questions (
         question_set_id,
         question_number,
         question_key,
         prompt,
         section_key,
         section_name,
         reverse_scored,
         question_weight_default,
         scoring_family,
         notes,
         is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
       ON CONFLICT (question_set_id, question_number)
       DO UPDATE SET
         question_key = EXCLUDED.question_key,
         prompt = EXCLUDED.prompt,
         section_key = EXCLUDED.section_key,
         section_name = EXCLUDED.section_name,
         reverse_scored = EXCLUDED.reverse_scored,
         question_weight_default = EXCLUDED.question_weight_default,
         scoring_family = EXCLUDED.scoring_family,
         notes = EXCLUDED.notes,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING id`,
      [
        questionSetId,
        questionNumber,
        questionKey,
        canonical.prompt,
        canonical.section_key,
        canonical.section_name || null,
        toBoolean(canonical.reverse_scored),
        Number(canonical.question_weight_default || 1),
        canonical.scoring_family || null,
        canonical.notes || null,
      ]
    );

    const questionDbId = questionResult.rows[0].id;
    const seenOptions = new Set();

    for (const optionRow of questionRows) {
      const optionKey = String(optionRow.option_key).toUpperCase();
      const optionUniq = `${questionNumber}-${optionKey}`;

      if (seenOptions.has(optionUniq)) {
        continue;
      }
      seenOptions.add(optionUniq);

      const optionResult = await client.query(
        `INSERT INTO assessment_question_options (
           question_id,
           option_key,
           option_text,
           display_order,
           numeric_value
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (question_id, option_key)
         DO UPDATE SET
           option_text = EXCLUDED.option_text,
           display_order = EXCLUDED.display_order,
           numeric_value = EXCLUDED.numeric_value,
           updated_at = NOW()
         RETURNING id`,
        [
          questionDbId,
          optionKey,
          optionRow.option_text,
          OPTION_ORDER[optionKey],
          OPTION_ORDER[optionKey],
        ]
      );

      const questionOptionId = optionResult.rows[0].id;

      for (const mappingRow of questionRows.filter((candidate) => String(candidate.option_key).toUpperCase() === optionKey)) {
        await client.query(
          `INSERT INTO assessment_option_signal_mappings (
             question_option_id,
             signal_code,
             signal_weight
           ) VALUES ($1, $2, $3)
           ON CONFLICT (question_option_id, signal_code)
           DO UPDATE SET
             signal_weight = EXCLUDED.signal_weight`,
          [questionOptionId, mappingRow.signal_code, Number(mappingRow.signal_weight || 1)]
        );
      }
    }
  }

  const countQuestionsResult = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM assessment_questions
     WHERE question_set_id = $1`,
    [questionSetId]
  );

  const questionCount = Number(countQuestionsResult.rows[0]?.count ?? 0);
  if (questionCount !== 80) {
    throw new Error(`Validation failed: expected 80 questions but found ${questionCount}.`);
  }

  const optionCountResult = await client.query(
    `SELECT COUNT(*)::int AS invalid_count
     FROM (
       SELECT q.id, COUNT(o.id) AS option_count
       FROM assessment_questions q
       LEFT JOIN assessment_question_options o ON o.question_id = q.id
       WHERE q.question_set_id = $1
       GROUP BY q.id
     ) grouped
     WHERE grouped.option_count <> 4`,
    [questionSetId]
  );

  const invalidOptionCount = Number(optionCountResult.rows[0]?.invalid_count ?? 0);
  if (invalidOptionCount !== 0) {
    throw new Error(`Validation failed: ${invalidOptionCount} questions do not have exactly 4 options.`);
  }

  await client.query('COMMIT');
  console.log('WPLP-80 question bank seeded successfully.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
