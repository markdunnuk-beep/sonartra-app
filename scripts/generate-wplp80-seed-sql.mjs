import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CSV_PATH = path.join(process.cwd(), 'data', 'wplp80_questions_v1.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'db', 'seeds', '0002_wplp80_question_bank_seed.sql');

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

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} columns, expected ${headers.length}.`);
    }

    return Object.fromEntries(headers.map((header, colIndex) => [header, values[colIndex]]));
  });
}

function sqlLiteral(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

const csvRaw = await readFile(CSV_PATH, 'utf8');
const rows = parseCsv(csvRaw);

if (rows.length !== 320) {
  throw new Error(`Expected 320 CSV rows (80 questions x 4 options) but found ${rows.length}.`);
}

const valueRows = rows.map((row) => {
  const cols = [
    row.question_id,
    row.section_key,
    row.section_name,
    row.prompt,
    row.reverse_scored,
    row.question_weight_default,
    row.scoring_family,
    row.notes,
    row.option_key,
    row.option_text,
    row.signal_code,
    row.signal_weight,
  ];

  return `  (${cols.map(sqlLiteral).join(', ')})`;
});

const sql = `-- Generated from data/wplp80_questions_v1.csv via scripts/generate-wplp80-seed-sql.mjs\n-- Portable manual seed for Supabase SQL Editor (Block 2A question bank).\n\nBEGIN;\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM assessment_versions\n    WHERE key = 'wplp80-v1'\n  ) THEN\n    RAISE EXCEPTION 'assessment_versions.key="wplp80-v1" is required before running this seed.';\n  END IF;\nEND$$;\n\nCREATE TEMP TABLE tmp_wplp80_seed_rows (\n  question_id INTEGER NOT NULL,\n  section_key TEXT NOT NULL,\n  section_name TEXT,\n  prompt TEXT NOT NULL,\n  reverse_scored TEXT NOT NULL,\n  question_weight_default NUMERIC(8,4) NOT NULL,\n  scoring_family TEXT,\n  notes TEXT,\n  option_key TEXT NOT NULL,\n  option_text TEXT NOT NULL,\n  signal_code TEXT NOT NULL,\n  signal_weight NUMERIC(10,4) NOT NULL\n) ON COMMIT DROP;\n\nINSERT INTO tmp_wplp80_seed_rows (\n  question_id,\n  section_key,\n  section_name,\n  prompt,\n  reverse_scored,\n  question_weight_default,\n  scoring_family,\n  notes,\n  option_key,\n  option_text,\n  signal_code,\n  signal_weight\n)\nVALUES\n${valueRows.join(',\n')};\n\nINSERT INTO assessment_question_sets (\n  assessment_version_id,\n  key,\n  name,\n  description,\n  is_active\n)\nSELECT\n  av.id,\n  'wplp80-v1-main',\n  'WPLP-80 Main Question Set',\n  'Primary question set for WPLP-80 Sonartra Signals',\n  TRUE\nFROM assessment_versions av\nWHERE av.key = 'wplp80-v1'\nON CONFLICT (key)\nDO UPDATE SET\n  assessment_version_id = EXCLUDED.assessment_version_id,\n  name = EXCLUDED.name,\n  description = EXCLUDED.description,\n  is_active = TRUE,\n  updated_at = NOW();\n\nWITH question_set AS (\n  SELECT id\n  FROM assessment_question_sets\n  WHERE key = 'wplp80-v1-main'\n),\nquestion_rows AS (\n  SELECT\n    question_id AS question_number,\n    MAX(prompt) AS prompt,\n    MAX(section_key) AS section_key,\n    MAX(NULLIF(section_name, '')) AS section_name,\n    BOOL_OR(LOWER(reverse_scored) IN ('true', 't', '1', 'yes', 'y')) AS reverse_scored,\n    MAX(question_weight_default) AS question_weight_default,\n    MAX(NULLIF(scoring_family, '')) AS scoring_family,\n    MAX(NULLIF(notes, '')) AS notes\n  FROM tmp_wplp80_seed_rows\n  GROUP BY question_id\n)\nINSERT INTO assessment_questions (\n  question_set_id,\n  question_number,\n  question_key,\n  prompt,\n  section_key,\n  section_name,\n  reverse_scored,\n  question_weight_default,\n  scoring_family,\n  notes,\n  is_active\n)\nSELECT\n  qs.id,\n  qr.question_number,\n  'wplp80_q' || LPAD(qr.question_number::TEXT, 2, '0'),\n  qr.prompt,\n  qr.section_key,\n  qr.section_name,\n  qr.reverse_scored,\n  qr.question_weight_default,\n  qr.scoring_family,\n  qr.notes,\n  TRUE\nFROM question_rows qr\nCROSS JOIN question_set qs\nON CONFLICT (question_set_id, question_number)\nDO UPDATE SET\n  question_key = EXCLUDED.question_key,\n  prompt = EXCLUDED.prompt,\n  section_key = EXCLUDED.section_key,\n  section_name = EXCLUDED.section_name,\n  reverse_scored = EXCLUDED.reverse_scored,\n  question_weight_default = EXCLUDED.question_weight_default,\n  scoring_family = EXCLUDED.scoring_family,\n  notes = EXCLUDED.notes,\n  is_active = TRUE,\n  updated_at = NOW();\n\nWITH question_set AS (\n  SELECT id\n  FROM assessment_question_sets\n  WHERE key = 'wplp80-v1-main'\n),\nquestion_lookup AS (\n  SELECT id, question_number\n  FROM assessment_questions\n  WHERE question_set_id = (SELECT id FROM question_set)\n),\noption_rows AS (\n  SELECT DISTINCT\n    r.question_id,\n    UPPER(r.option_key) AS option_key,\n    r.option_text,\n    CASE UPPER(r.option_key)\n      WHEN 'A' THEN 1\n      WHEN 'B' THEN 2\n      WHEN 'C' THEN 3\n      WHEN 'D' THEN 4\n      ELSE NULL\n    END AS display_order\n  FROM tmp_wplp80_seed_rows r\n)\nINSERT INTO assessment_question_options (\n  question_id,\n  option_key,\n  option_text,\n  display_order,\n  numeric_value\n)\nSELECT\n  ql.id,\n  o.option_key,\n  o.option_text,\n  o.display_order,\n  o.display_order\nFROM option_rows o\nJOIN question_lookup ql ON ql.question_number = o.question_id\nWHERE o.display_order IS NOT NULL\nON CONFLICT (question_id, option_key)\nDO UPDATE SET\n  option_text = EXCLUDED.option_text,\n  display_order = EXCLUDED.display_order,\n  numeric_value = EXCLUDED.numeric_value,\n  updated_at = NOW();\n\nWITH question_set AS (\n  SELECT id\n  FROM assessment_question_sets\n  WHERE key = 'wplp80-v1-main'\n),\nquestion_lookup AS (\n  SELECT id, question_number\n  FROM assessment_questions\n  WHERE question_set_id = (SELECT id FROM question_set)\n),\noption_lookup AS (\n  SELECT\n    o.id,\n    q.question_number,\n    o.option_key\n  FROM assessment_question_options o\n  JOIN question_lookup q ON q.id = o.question_id\n)\nINSERT INTO assessment_option_signal_mappings (\n  question_option_id,\n  signal_code,\n  signal_weight\n)\nSELECT\n  ol.id AS question_option_id,\n  r.signal_code,\n  r.signal_weight\nFROM tmp_wplp80_seed_rows r\nJOIN option_lookup ol\n  ON ol.question_number = r.question_id\n AND ol.option_key = UPPER(r.option_key)\nON CONFLICT (question_option_id, signal_code)\nDO UPDATE SET\n  signal_weight = EXCLUDED.signal_weight;\n\nCOMMIT;\n\n-- Optional validation queries (run after COMMIT)\n-- 1) Question set exists and is active for wplp80-v1\nSELECT\n  av.key AS assessment_version_key,\n  qs.key AS question_set_key,\n  qs.is_active\nFROM assessment_question_sets qs\nJOIN assessment_versions av ON av.id = qs.assessment_version_id\nWHERE av.key = 'wplp80-v1'\n  AND qs.key = 'wplp80-v1-main';\n\n-- 2) Question count should be 80\nSELECT COUNT(*) AS question_count\nFROM assessment_questions q\nJOIN assessment_question_sets qs ON qs.id = q.question_set_id\nWHERE qs.key = 'wplp80-v1-main';\n\n-- 3) Option count should be 320\nSELECT COUNT(*) AS option_count\nFROM assessment_question_options o\nJOIN assessment_questions q ON q.id = o.question_id\nJOIN assessment_question_sets qs ON qs.id = q.question_set_id\nWHERE qs.key = 'wplp80-v1-main';\n\n-- 4) Every question should have exactly 4 options\nSELECT COUNT(*) AS invalid_question_option_counts\nFROM (\n  SELECT q.id, COUNT(o.id) AS option_count\n  FROM assessment_questions q\n  JOIN assessment_question_sets qs ON qs.id = q.question_set_id\n  LEFT JOIN assessment_question_options o ON o.question_id = q.id\n  WHERE qs.key = 'wplp80-v1-main'\n  GROUP BY q.id\n) grouped\nWHERE grouped.option_count <> 4;\n`;

await writeFile(OUTPUT_PATH, sql, 'utf8');
console.log(`Generated ${OUTPUT_PATH}`);
