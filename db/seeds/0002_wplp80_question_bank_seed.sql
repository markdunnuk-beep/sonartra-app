-- Generated from data/wplp80_questions_v1.csv via scripts/generate-wplp80-seed-sql.mjs
-- Portable manual seed for Supabase SQL Editor (Block 2A question bank).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM assessment_versions
    WHERE key = 'wplp80-v1'
  ) THEN
    RAISE EXCEPTION 'assessment_versions.key="wplp80-v1" is required before running this seed.';
  END IF;
END$$;

CREATE TEMP TABLE tmp_wplp80_seed_rows (
  question_id INTEGER NOT NULL,
  section_key TEXT NOT NULL,
  section_name TEXT,
  prompt TEXT NOT NULL,
  reverse_scored TEXT NOT NULL,
  question_weight_default NUMERIC(8,4) NOT NULL,
  scoring_family TEXT,
  notes TEXT,
  option_key TEXT NOT NULL,
  option_text TEXT NOT NULL,
  signal_code TEXT NOT NULL,
  signal_weight NUMERIC(10,4) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_wplp80_seed_rows (
  question_id,
  section_key,
  section_name,
  prompt,
  reverse_scored,
  question_weight_default,
  scoring_family,
  notes,
  option_key,
  option_text,
  signal_code,
  signal_weight
)
VALUES
  ('1', 'core_behaviour', 'Core Behaviour Signals', 'When starting a new piece of work, I usually:', 'False', '1.0', 'core', NULL, 'A', 'move quickly and refine as I go', 'Core_Driver', '1.0'),
  ('1', 'core_behaviour', 'Core Behaviour Signals', 'When starting a new piece of work, I usually:', 'False', '1.0', 'core', NULL, 'B', 'talk through the approach with others before moving', 'Core_Influencer', '1.0'),
  ('1', 'core_behaviour', 'Core Behaviour Signals', 'When starting a new piece of work, I usually:', 'False', '1.0', 'core', NULL, 'C', 'make sure expectations are clear and people are aligned', 'Core_Stabiliser', '1.0'),
  ('1', 'core_behaviour', 'Core Behaviour Signals', 'When starting a new piece of work, I usually:', 'False', '1.0', 'core', NULL, 'D', 'review the detail before taking action', 'Core_Analyst', '1.0'),
  ('2', 'core_behaviour', 'Core Behaviour Signals', 'My natural pace of work is usually:', 'False', '1.0', 'core', NULL, 'A', 'fast and outcome-focused', 'Core_Driver', '1.0'),
  ('2', 'core_behaviour', 'Core Behaviour Signals', 'My natural pace of work is usually:', 'False', '1.0', 'core', NULL, 'B', 'energetic and interactive', 'Core_Influencer', '1.0'),
  ('2', 'core_behaviour', 'Core Behaviour Signals', 'My natural pace of work is usually:', 'False', '1.0', 'core', NULL, 'C', 'steady and consistent', 'Core_Stabiliser', '1.0'),
  ('2', 'core_behaviour', 'Core Behaviour Signals', 'My natural pace of work is usually:', 'False', '1.0', 'core', NULL, 'D', 'methodical and deliberate', 'Core_Analyst', '1.0'),
  ('3', 'core_behaviour', 'Core Behaviour Signals', 'When priorities change suddenly, I tend to:', 'False', '1.0', 'core', NULL, 'A', 'adjust quickly and keep moving', 'Core_Driver', '1.0'),
  ('3', 'core_behaviour', 'Core Behaviour Signals', 'When priorities change suddenly, I tend to:', 'False', '1.0', 'core', NULL, 'B', 'speak with others to get alignment', 'Core_Influencer', '1.0'),
  ('3', 'core_behaviour', 'Core Behaviour Signals', 'When priorities change suddenly, I tend to:', 'False', '1.0', 'core', NULL, 'C', 'look for a stable way to keep work on track', 'Core_Stabiliser', '1.0'),
  ('3', 'core_behaviour', 'Core Behaviour Signals', 'When priorities change suddenly, I tend to:', 'False', '1.0', 'core', NULL, 'D', 'reassess the implications before acting', 'Core_Analyst', '1.0'),
  ('4', 'core_behaviour', 'Core Behaviour Signals', 'I am usually most comfortable with work that is:', 'False', '1.0', 'core', NULL, 'A', 'stretching and outcome-focused', 'Core_Driver', '1.0'),
  ('4', 'core_behaviour', 'Core Behaviour Signals', 'I am usually most comfortable with work that is:', 'False', '1.0', 'core', NULL, 'B', 'people-facing and interactive', 'Core_Influencer', '1.0'),
  ('4', 'core_behaviour', 'Core Behaviour Signals', 'I am usually most comfortable with work that is:', 'False', '1.0', 'core', NULL, 'C', 'cooperative and dependable', 'Core_Stabiliser', '1.0'),
  ('4', 'core_behaviour', 'Core Behaviour Signals', 'I am usually most comfortable with work that is:', 'False', '1.0', 'core', NULL, 'D', 'technical or analytical', 'Core_Analyst', '1.0'),
  ('5', 'core_behaviour', 'Core Behaviour Signals', 'In uncertain situations, I usually:', 'False', '1.0', 'core', NULL, 'A', 'move forward and adjust if needed', 'Core_Driver', '1.0'),
  ('5', 'core_behaviour', 'Core Behaviour Signals', 'In uncertain situations, I usually:', 'False', '1.0', 'core', NULL, 'B', 'check in with others before deciding', 'Core_Influencer', '1.0'),
  ('5', 'core_behaviour', 'Core Behaviour Signals', 'In uncertain situations, I usually:', 'False', '1.0', 'core', NULL, 'C', 'look for reassurance that the plan is workable', 'Core_Stabiliser', '1.0'),
  ('5', 'core_behaviour', 'Core Behaviour Signals', 'In uncertain situations, I usually:', 'False', '1.0', 'core', NULL, 'D', 'gather more information first', 'Core_Analyst', '1.0'),
  ('6', 'core_behaviour', 'Core Behaviour Signals', 'My attention to detail is usually:', 'False', '1.0', 'core', NULL, 'A', 'focused mainly on what most affects the outcome', 'Core_Driver', '1.0'),
  ('6', 'core_behaviour', 'Core Behaviour Signals', 'My attention to detail is usually:', 'False', '1.0', 'core', NULL, 'B', 'balanced with keeping communication moving', 'Core_Influencer', '1.0'),
  ('6', 'core_behaviour', 'Core Behaviour Signals', 'My attention to detail is usually:', 'False', '1.0', 'core', NULL, 'C', 'applied to consistency and follow-through', 'Core_Stabiliser', '1.0'),
  ('6', 'core_behaviour', 'Core Behaviour Signals', 'My attention to detail is usually:', 'False', '1.0', 'core', NULL, 'D', 'highly focused on accuracy and precision', 'Core_Analyst', '1.0'),
  ('7', 'core_behaviour', 'Core Behaviour Signals', 'Feedback usually has the biggest impact on me when it:', 'False', '1.0', 'core', NULL, 'A', 'helps me improve results quickly', 'Core_Driver', '1.0'),
  ('7', 'core_behaviour', 'Core Behaviour Signals', 'Feedback usually has the biggest impact on me when it:', 'False', '1.0', 'core', NULL, 'B', 'is discussed openly and constructively', 'Core_Influencer', '1.0'),
  ('7', 'core_behaviour', 'Core Behaviour Signals', 'Feedback usually has the biggest impact on me when it:', 'False', '1.0', 'core', NULL, 'C', 'is delivered with care and context', 'Core_Stabiliser', '1.0'),
  ('7', 'core_behaviour', 'Core Behaviour Signals', 'Feedback usually has the biggest impact on me when it:', 'False', '1.0', 'core', NULL, 'D', 'is specific and well reasoned', 'Core_Analyst', '1.0'),
  ('8', 'core_behaviour', 'Core Behaviour Signals', 'My decision-making style is usually:', 'False', '1.0', 'core', NULL, 'A', 'fast and practical', 'Core_Driver', '1.0'),
  ('8', 'core_behaviour', 'Core Behaviour Signals', 'My decision-making style is usually:', 'False', '1.0', 'core', NULL, 'B', 'discussion-led and people-aware', 'Core_Influencer', '1.0'),
  ('8', 'core_behaviour', 'Core Behaviour Signals', 'My decision-making style is usually:', 'False', '1.0', 'core', NULL, 'C', 'careful and steady', 'Core_Stabiliser', '1.0'),
  ('8', 'core_behaviour', 'Core Behaviour Signals', 'My decision-making style is usually:', 'False', '1.0', 'core', NULL, 'D', 'evidence-led and analytical', 'Core_Analyst', '1.0'),
  ('9', 'behaviour_style', 'Behaviour Style', 'In meetings I tend to:', 'False', '1.0', 'style', NULL, 'A', 'direct the discussion toward decisions', 'Style_Driver', '1.0'),
  ('9', 'behaviour_style', 'Behaviour Style', 'In meetings I tend to:', 'False', '1.0', 'style', NULL, 'B', 'bring energy and ideas into the discussion', 'Style_Influencer', '1.0'),
  ('9', 'behaviour_style', 'Behaviour Style', 'In meetings I tend to:', 'False', '1.0', 'style', NULL, 'C', 'support participation across the group', 'Style_Stabiliser', '1.0'),
  ('9', 'behaviour_style', 'Behaviour Style', 'In meetings I tend to:', 'False', '1.0', 'style', NULL, 'D', 'question assumptions and test the logic', 'Style_Analyst', '1.0'),
  ('10', 'behaviour_style', 'Behaviour Style', 'My communication style is usually:', 'False', '1.0', 'style', NULL, 'A', 'direct and concise', 'Style_Driver', '1.0'),
  ('10', 'behaviour_style', 'Behaviour Style', 'My communication style is usually:', 'False', '1.0', 'style', NULL, 'B', 'expressive and persuasive', 'Style_Influencer', '1.0'),
  ('10', 'behaviour_style', 'Behaviour Style', 'My communication style is usually:', 'False', '1.0', 'style', NULL, 'C', 'patient and considerate', 'Style_Stabiliser', '1.0'),
  ('10', 'behaviour_style', 'Behaviour Style', 'My communication style is usually:', 'False', '1.0', 'style', NULL, 'D', 'precise and factual', 'Style_Analyst', '1.0'),
  ('11', 'behaviour_style', 'Behaviour Style', 'When leading a project, I usually:', 'False', '1.0', 'style', NULL, 'A', 'set a clear direction and push momentum', 'Style_Driver', '1.0'),
  ('11', 'behaviour_style', 'Behaviour Style', 'When leading a project, I usually:', 'False', '1.0', 'style', NULL, 'B', 'build enthusiasm around the work', 'Style_Influencer', '1.0'),
  ('11', 'behaviour_style', 'Behaviour Style', 'When leading a project, I usually:', 'False', '1.0', 'style', NULL, 'C', 'make sure people feel included and supported', 'Style_Stabiliser', '1.0'),
  ('11', 'behaviour_style', 'Behaviour Style', 'When leading a project, I usually:', 'False', '1.0', 'style', NULL, 'D', 'focus on structure, accuracy, and process quality', 'Style_Analyst', '1.0'),
  ('12', 'behaviour_style', 'Behaviour Style', 'Under time pressure, I tend to:', 'False', '1.0', 'style', NULL, 'A', 'increase pace and urgency', 'Style_Driver', '1.0'),
  ('12', 'behaviour_style', 'Behaviour Style', 'Under time pressure, I tend to:', 'False', '1.0', 'style', NULL, 'B', 'keep people motivated and engaged', 'Style_Influencer', '1.0'),
  ('12', 'behaviour_style', 'Behaviour Style', 'Under time pressure, I tend to:', 'False', '1.0', 'style', NULL, 'C', 'protect team stability and cooperation', 'Style_Stabiliser', '1.0'),
  ('12', 'behaviour_style', 'Behaviour Style', 'Under time pressure, I tend to:', 'False', '1.0', 'style', NULL, 'D', 'double-check detail and reduce errors', 'Style_Analyst', '1.0'),
  ('13', 'behaviour_style', 'Behaviour Style', 'I am most comfortable when I am:', 'False', '1.0', 'style', NULL, 'A', 'able to take control of progress', 'Style_Driver', '1.0'),
  ('13', 'behaviour_style', 'Behaviour Style', 'I am most comfortable when I am:', 'False', '1.0', 'style', NULL, 'B', 'able to influence and engage others', 'Style_Influencer', '1.0'),
  ('13', 'behaviour_style', 'Behaviour Style', 'I am most comfortable when I am:', 'False', '1.0', 'style', NULL, 'C', 'able to support and steady the team', 'Style_Stabiliser', '1.0'),
  ('13', 'behaviour_style', 'Behaviour Style', 'I am most comfortable when I am:', 'False', '1.0', 'style', NULL, 'D', 'able to analyse and improve the work', 'Style_Analyst', '1.0'),
  ('14', 'behaviour_style', 'Behaviour Style', 'Others are most likely to see me as:', 'False', '1.0', 'style', NULL, 'A', 'decisive', 'Style_Driver', '1.0'),
  ('14', 'behaviour_style', 'Behaviour Style', 'Others are most likely to see me as:', 'False', '1.0', 'style', NULL, 'B', 'energising', 'Style_Influencer', '1.0'),
  ('14', 'behaviour_style', 'Behaviour Style', 'Others are most likely to see me as:', 'False', '1.0', 'style', NULL, 'C', 'reliable', 'Style_Stabiliser', '1.0'),
  ('14', 'behaviour_style', 'Behaviour Style', 'Others are most likely to see me as:', 'False', '1.0', 'style', NULL, 'D', 'thoughtful', 'Style_Analyst', '1.0'),
  ('15', 'behaviour_style', 'Behaviour Style', 'I am most frustrated by:', 'False', '1.0', 'style', NULL, 'A', 'slow or unclear decisions', 'Style_Driver', '1.0'),
  ('15', 'behaviour_style', 'Behaviour Style', 'I am most frustrated by:', 'False', '1.0', 'style', NULL, 'B', 'low energy or weak engagement', 'Style_Influencer', '1.0'),
  ('15', 'behaviour_style', 'Behaviour Style', 'I am most frustrated by:', 'False', '1.0', 'style', NULL, 'C', 'unnecessarily confrontational behaviour', 'Style_Stabiliser', '1.0'),
  ('15', 'behaviour_style', 'Behaviour Style', 'I am most frustrated by:', 'False', '1.0', 'style', NULL, 'D', 'weak reasoning or avoidable errors', 'Style_Analyst', '1.0'),
  ('16', 'motivational_drivers', 'Motivational Drivers', 'I am most motivated by work that offers:', 'False', '1.0', 'motivation', NULL, 'A', 'clear achievement and stretch', 'Mot_Achievement', '1.0'),
  ('16', 'motivational_drivers', 'Motivational Drivers', 'I am most motivated by work that offers:', 'False', '1.0', 'motivation', NULL, 'B', 'influence and visibility', 'Mot_Influence', '1.0'),
  ('16', 'motivational_drivers', 'Motivational Drivers', 'I am most motivated by work that offers:', 'False', '1.0', 'motivation', NULL, 'C', 'stability and security', 'Mot_Stability', '1.0'),
  ('16', 'motivational_drivers', 'Motivational Drivers', 'I am most motivated by work that offers:', 'False', '1.0', 'motivation', NULL, 'D', 'mastery and expertise', 'Mot_Mastery', '1.0'),
  ('17', 'motivational_drivers', 'Motivational Drivers', 'Recognition matters most to me when it:', 'False', '1.0', 'motivation', NULL, 'A', 'reflects strong results', 'Mot_Achievement', '1.0'),
  ('17', 'motivational_drivers', 'Motivational Drivers', 'Recognition matters most to me when it:', 'False', '1.0', 'motivation', NULL, 'B', 'shows that my contribution is noticed', 'Mot_Influence', '1.0'),
  ('17', 'motivational_drivers', 'Motivational Drivers', 'Recognition matters most to me when it:', 'False', '1.0', 'motivation', NULL, 'C', 'strengthens trust and connection', 'Mot_Stability', '1.0'),
  ('17', 'motivational_drivers', 'Motivational Drivers', 'Recognition matters most to me when it:', 'False', '1.0', 'motivation', NULL, 'D', 'confirms depth of capability', 'Mot_Mastery', '1.0'),
  ('18', 'motivational_drivers', 'Motivational Drivers', 'All else being equal, I would prefer:', 'False', '1.0', 'motivation', NULL, 'A', 'stretch targets', 'Mot_Achievement', '1.0'),
  ('18', 'motivational_drivers', 'Motivational Drivers', 'All else being equal, I would prefer:', 'False', '1.0', 'motivation', NULL, 'B', 'wider relationships and reach', 'Mot_Influence', '1.0'),
  ('18', 'motivational_drivers', 'Motivational Drivers', 'All else being equal, I would prefer:', 'False', '1.0', 'motivation', NULL, 'C', 'predictability and security', 'Mot_Stability', '1.0'),
  ('18', 'motivational_drivers', 'Motivational Drivers', 'All else being equal, I would prefer:', 'False', '1.0', 'motivation', NULL, 'D', 'time to build skill depth', 'Mot_Mastery', '1.0'),
  ('19', 'motivational_drivers', 'Motivational Drivers', 'If given a high degree of freedom at work, I would most naturally:', 'False', '1.0', 'motivation', NULL, 'A', 'compete and push for strong outcomes', 'Mot_Achievement', '1.0'),
  ('19', 'motivational_drivers', 'Motivational Drivers', 'If given a high degree of freedom at work, I would most naturally:', 'False', '1.0', 'motivation', NULL, 'B', 'build ideas and gain support', 'Mot_Influence', '1.0'),
  ('19', 'motivational_drivers', 'Motivational Drivers', 'If given a high degree of freedom at work, I would most naturally:', 'False', '1.0', 'motivation', NULL, 'C', 'protect what is working well', 'Mot_Stability', '1.0'),
  ('19', 'motivational_drivers', 'Motivational Drivers', 'If given a high degree of freedom at work, I would most naturally:', 'False', '1.0', 'motivation', NULL, 'D', 'optimise and improve the system', 'Mot_Mastery', '1.0'),
  ('20', 'motivational_drivers', 'Motivational Drivers', 'I measure success mainly through:', 'False', '1.0', 'motivation', NULL, 'A', 'results achieved', 'Mot_Achievement', '1.0'),
  ('20', 'motivational_drivers', 'Motivational Drivers', 'I measure success mainly through:', 'False', '1.0', 'motivation', NULL, 'B', 'impact created', 'Mot_Influence', '1.0'),
  ('20', 'motivational_drivers', 'Motivational Drivers', 'I measure success mainly through:', 'False', '1.0', 'motivation', NULL, 'C', 'stability and harmony', 'Mot_Stability', '1.0'),
  ('20', 'motivational_drivers', 'Motivational Drivers', 'I measure success mainly through:', 'False', '1.0', 'motivation', NULL, 'D', 'quality and standard', 'Mot_Mastery', '1.0'),
  ('21', 'motivational_drivers', 'Motivational Drivers', 'I feel most energised when I am:', 'False', '1.0', 'motivation', NULL, 'A', 'meeting meaningful goals', 'Mot_Achievement', '1.0'),
  ('21', 'motivational_drivers', 'Motivational Drivers', 'I feel most energised when I am:', 'False', '1.0', 'motivation', NULL, 'B', 'getting people behind an idea', 'Mot_Influence', '1.0'),
  ('21', 'motivational_drivers', 'Motivational Drivers', 'I feel most energised when I am:', 'False', '1.0', 'motivation', NULL, 'C', 'supporting others effectively', 'Mot_Stability', '1.0'),
  ('21', 'motivational_drivers', 'Motivational Drivers', 'I feel most energised when I am:', 'False', '1.0', 'motivation', NULL, 'D', 'solving something difficult', 'Mot_Mastery', '1.0'),
  ('22', 'motivational_drivers', 'Motivational Drivers', 'I disengage fastest when:', 'False', '1.0', 'motivation', NULL, 'A', 'goals are weak or unclear', 'Mot_Achievement', '1.0'),
  ('22', 'motivational_drivers', 'Motivational Drivers', 'I disengage fastest when:', 'False', '1.0', 'motivation', NULL, 'B', 'my input has little reach', 'Mot_Influence', '1.0'),
  ('22', 'motivational_drivers', 'Motivational Drivers', 'I disengage fastest when:', 'False', '1.0', 'motivation', NULL, 'C', 'conflict keeps disrupting the environment', 'Mot_Stability', '1.0'),
  ('22', 'motivational_drivers', 'Motivational Drivers', 'I disengage fastest when:', 'False', '1.0', 'motivation', NULL, 'D', 'standards keep slipping', 'Mot_Mastery', '1.0'),
  ('23', 'interpersonal_needs', 'Interpersonal Needs', 'I work best with leaders who:', 'False', '1.0', 'interpersonal', NULL, 'A', 'take clear charge when needed', 'Need_Authority', '1.0'),
  ('23', 'interpersonal_needs', 'Interpersonal Needs', 'I work best with leaders who:', 'False', '1.0', 'interpersonal', NULL, 'B', 'set a compelling direction', 'Need_Influence', '1.0'),
  ('23', 'interpersonal_needs', 'Interpersonal Needs', 'I work best with leaders who:', 'False', '1.0', 'interpersonal', NULL, 'C', 'develop people and relationships', 'Need_Belonging', '1.0'),
  ('23', 'interpersonal_needs', 'Interpersonal Needs', 'I work best with leaders who:', 'False', '1.0', 'interpersonal', NULL, 'D', 'provide clarity and sound judgement', 'Need_Competence', '1.0'),
  ('24', 'interpersonal_needs', 'Interpersonal Needs', 'I feel most valued when I am:', 'False', '1.0', 'interpersonal', NULL, 'A', 'trusted with meaningful responsibility', 'Need_Authority', '1.0'),
  ('24', 'interpersonal_needs', 'Interpersonal Needs', 'I feel most valued when I am:', 'False', '1.0', 'interpersonal', NULL, 'B', 'consulted and asked for input', 'Need_Influence', '1.0'),
  ('24', 'interpersonal_needs', 'Interpersonal Needs', 'I feel most valued when I am:', 'False', '1.0', 'interpersonal', NULL, 'C', 'included and treated as part of the group', 'Need_Belonging', '1.0'),
  ('24', 'interpersonal_needs', 'Interpersonal Needs', 'I feel most valued when I am:', 'False', '1.0', 'interpersonal', NULL, 'D', 'recognised for expertise', 'Need_Competence', '1.0'),
  ('25', 'interpersonal_needs', 'Interpersonal Needs', 'In teams I most naturally:', 'False', '1.0', 'interpersonal', NULL, 'A', 'step forward and lead', 'Need_Authority', '1.0'),
  ('25', 'interpersonal_needs', 'Interpersonal Needs', 'In teams I most naturally:', 'False', '1.0', 'interpersonal', NULL, 'B', 'connect people and ideas', 'Need_Influence', '1.0'),
  ('25', 'interpersonal_needs', 'Interpersonal Needs', 'In teams I most naturally:', 'False', '1.0', 'interpersonal', NULL, 'C', 'stabilise relationships and workflow', 'Need_Belonging', '1.0'),
  ('25', 'interpersonal_needs', 'Interpersonal Needs', 'In teams I most naturally:', 'False', '1.0', 'interpersonal', NULL, 'D', 'contribute specialist thinking', 'Need_Competence', '1.0'),
  ('26', 'interpersonal_needs', 'Interpersonal Needs', 'I usually prefer working:', 'False', '1.0', 'interpersonal', NULL, 'A', 'with room for independent judgement', 'Need_Authority', '1.0'),
  ('26', 'interpersonal_needs', 'Interpersonal Needs', 'I usually prefer working:', 'False', '1.0', 'interpersonal', NULL, 'B', 'in collaborative settings with interaction', 'Need_Influence', '1.0'),
  ('26', 'interpersonal_needs', 'Interpersonal Needs', 'I usually prefer working:', 'False', '1.0', 'interpersonal', NULL, 'C', 'in predictable teams with trust', 'Need_Belonging', '1.0'),
  ('26', 'interpersonal_needs', 'Interpersonal Needs', 'I usually prefer working:', 'False', '1.0', 'interpersonal', NULL, 'D', 'on intellectually demanding work', 'Need_Competence', '1.0'),
  ('27', 'interpersonal_needs', 'Interpersonal Needs', 'When excluded from a decision, I am most likely to:', 'False', '1.0', 'interpersonal', NULL, 'A', 'challenge it directly', 'Need_Authority', '1.0'),
  ('27', 'interpersonal_needs', 'Interpersonal Needs', 'When excluded from a decision, I am most likely to:', 'False', '1.0', 'interpersonal', NULL, 'B', 're-engage and try to influence it', 'Need_Influence', '1.0'),
  ('27', 'interpersonal_needs', 'Interpersonal Needs', 'When excluded from a decision, I am most likely to:', 'False', '1.0', 'interpersonal', NULL, 'C', 'step back and disengage', 'Need_Belonging', '1.0'),
  ('27', 'interpersonal_needs', 'Interpersonal Needs', 'When excluded from a decision, I am most likely to:', 'False', '1.0', 'interpersonal', NULL, 'D', 'analyse the reasoning behind it', 'Need_Competence', '1.0'),
  ('28', 'interpersonal_needs', 'Interpersonal Needs', 'In working relationships, I most often seek:', 'False', '1.0', 'interpersonal', NULL, 'A', 'clear decision authority', 'Need_Authority', '1.0'),
  ('28', 'interpersonal_needs', 'Interpersonal Needs', 'In working relationships, I most often seek:', 'False', '1.0', 'interpersonal', NULL, 'B', 'the ability to shape outcomes', 'Need_Influence', '1.0'),
  ('28', 'interpersonal_needs', 'Interpersonal Needs', 'In working relationships, I most often seek:', 'False', '1.0', 'interpersonal', NULL, 'C', 'a sense of trust and belonging', 'Need_Belonging', '1.0'),
  ('28', 'interpersonal_needs', 'Interpersonal Needs', 'In working relationships, I most often seek:', 'False', '1.0', 'interpersonal', NULL, 'D', 'respect for good thinking and capability', 'Need_Competence', '1.0'),
  ('29', 'conflict_style', 'Conflict Style', 'When disagreement appears, I usually:', 'False', '1.0', 'conflict', NULL, 'A', 'address it directly', 'Conflict_Compete', '1.0'),
  ('29', 'conflict_style', 'Conflict Style', 'When disagreement appears, I usually:', 'False', '1.0', 'conflict', NULL, 'B', 'try to persuade and bring others with me', 'Conflict_Collaborate', '1.0'),
  ('29', 'conflict_style', 'Conflict Style', 'When disagreement appears, I usually:', 'False', '1.0', 'conflict', NULL, 'C', 'look for a workable middle ground', 'Conflict_Compromise', '1.0'),
  ('29', 'conflict_style', 'Conflict Style', 'When disagreement appears, I usually:', 'False', '1.0', 'conflict', NULL, 'D', 'step back until the issue is clearer', 'Conflict_Avoid', '1.0'),
  ('30', 'conflict_style', 'Conflict Style', 'When challenged publicly, I tend to:', 'False', '1.0', 'conflict', NULL, 'A', 'stand firm on my position', 'Conflict_Compete', '1.0'),
  ('30', 'conflict_style', 'Conflict Style', 'When challenged publicly, I tend to:', 'False', '1.0', 'conflict', NULL, 'B', 'respond in the moment and try to regain support', 'Conflict_Collaborate', '1.0'),
  ('30', 'conflict_style', 'Conflict Style', 'When challenged publicly, I tend to:', 'False', '1.0', 'conflict', NULL, 'C', 'de-escalate to protect the relationship', 'Conflict_Accommodate', '1.0'),
  ('30', 'conflict_style', 'Conflict Style', 'When challenged publicly, I tend to:', 'False', '1.0', 'conflict', NULL, 'D', 'clarify facts before reacting further', 'Conflict_Avoid', '1.0'),
  ('31', 'conflict_style', 'Conflict Style', 'If a colleague is underperforming, I usually:', 'False', '1.0', 'conflict', NULL, 'A', 'address it directly and clearly', 'Conflict_Compete', '1.0'),
  ('31', 'conflict_style', 'Conflict Style', 'If a colleague is underperforming, I usually:', 'False', '1.0', 'conflict', NULL, 'B', 'encourage improvement through discussion', 'Conflict_Collaborate', '1.0'),
  ('31', 'conflict_style', 'Conflict Style', 'If a colleague is underperforming, I usually:', 'False', '1.0', 'conflict', NULL, 'C', 'support them quietly and give space', 'Conflict_Accommodate', '1.0'),
  ('31', 'conflict_style', 'Conflict Style', 'If a colleague is underperforming, I usually:', 'False', '1.0', 'conflict', NULL, 'D', 'review the process before confronting the person', 'Conflict_Avoid', '1.0'),
  ('32', 'conflict_style', 'Conflict Style', 'I am most likely to hold back from conflict when:', 'False', '1.0', 'conflict', NULL, 'A', 'the issue is not worth the energy', 'Conflict_Compete', '1.0'),
  ('32', 'conflict_style', 'Conflict Style', 'I am most likely to hold back from conflict when:', 'False', '1.0', 'conflict', NULL, 'B', 'the relationship matters a lot', 'Conflict_Collaborate', '1.0'),
  ('32', 'conflict_style', 'Conflict Style', 'I am most likely to hold back from conflict when:', 'False', '1.0', 'conflict', NULL, 'C', 'the environment feels too aggressive', 'Conflict_Accommodate', '1.0'),
  ('32', 'conflict_style', 'Conflict Style', 'I am most likely to hold back from conflict when:', 'False', '1.0', 'conflict', NULL, 'D', 'the reasoning still seems unclear', 'Conflict_Avoid', '1.0'),
  ('33', 'conflict_style', 'Conflict Style', 'My main strength in conflict is usually:', 'False', '1.0', 'conflict', NULL, 'A', 'directness', 'Conflict_Compete', '1.0'),
  ('33', 'conflict_style', 'Conflict Style', 'My main strength in conflict is usually:', 'False', '1.0', 'conflict', NULL, 'B', 'influence and dialogue', 'Conflict_Collaborate', '1.0'),
  ('33', 'conflict_style', 'Conflict Style', 'My main strength in conflict is usually:', 'False', '1.0', 'conflict', NULL, 'C', 'empathy and care', 'Conflict_Accommodate', '1.0'),
  ('33', 'conflict_style', 'Conflict Style', 'My main strength in conflict is usually:', 'False', '1.0', 'conflict', NULL, 'D', 'objectivity', 'Conflict_Avoid', '1.0'),
  ('34', 'conflict_style', 'Conflict Style', 'My conflict risk is usually that I can become too:', 'False', '1.0', 'conflict', NULL, 'A', 'forceful', 'Conflict_Compete', '1.0'),
  ('34', 'conflict_style', 'Conflict Style', 'My conflict risk is usually that I can become too:', 'False', '1.0', 'conflict', NULL, 'B', 'talkative or persuasive', 'Conflict_Collaborate', '1.0'),
  ('34', 'conflict_style', 'Conflict Style', 'My conflict risk is usually that I can become too:', 'False', '1.0', 'conflict', NULL, 'C', 'accommodating', 'Conflict_Accommodate', '1.0'),
  ('34', 'conflict_style', 'Conflict Style', 'My conflict risk is usually that I can become too:', 'False', '1.0', 'conflict', NULL, 'D', 'detached or over-analytical', 'Conflict_Avoid', '1.0'),
  ('35', 'stress_derailers', 'Stress & Derailers', 'Under prolonged pressure, I may:', 'False', '1.0', 'stress', NULL, 'A', 'become more controlling', 'Stress_Control', '1.0'),
  ('35', 'stress_derailers', 'Stress & Derailers', 'Under prolonged pressure, I may:', 'False', '1.0', 'stress', NULL, 'B', 'become more scattered', 'Stress_Scatter', '1.0'),
  ('35', 'stress_derailers', 'Stress & Derailers', 'Under prolonged pressure, I may:', 'False', '1.0', 'stress', NULL, 'C', 'avoid difficult conversations', 'Stress_Avoidance', '1.0'),
  ('35', 'stress_derailers', 'Stress & Derailers', 'Under prolonged pressure, I may:', 'False', '1.0', 'stress', NULL, 'D', 'become more critical than usual', 'Stress_Criticality', '1.0'),
  ('36', 'stress_derailers', 'Stress & Derailers', 'When overwhelmed, I tend to:', 'False', '1.0', 'stress', NULL, 'A', 'take over the situation', 'Stress_Control', '1.0'),
  ('36', 'stress_derailers', 'Stress & Derailers', 'When overwhelmed, I tend to:', 'False', '1.0', 'stress', NULL, 'B', 'talk more and move quickly between issues', 'Stress_Scatter', '1.0'),
  ('36', 'stress_derailers', 'Stress & Derailers', 'When overwhelmed, I tend to:', 'False', '1.0', 'stress', NULL, 'C', 'retreat and reduce contact', 'Stress_Avoidance', '1.0'),
  ('36', 'stress_derailers', 'Stress & Derailers', 'When overwhelmed, I tend to:', 'False', '1.0', 'stress', NULL, 'D', 'analyse repeatedly and struggle to let go', 'Stress_Criticality', '1.0'),
  ('37', 'stress_derailers', 'Stress & Derailers', 'When trust is broken, I usually:', 'False', '1.0', 'stress', NULL, 'A', 'react quickly and push for control', 'Stress_Control', '1.0'),
  ('37', 'stress_derailers', 'Stress & Derailers', 'When trust is broken, I usually:', 'False', '1.0', 'stress', NULL, 'B', 'show my frustration openly', 'Stress_Scatter', '1.0'),
  ('37', 'stress_derailers', 'Stress & Derailers', 'When trust is broken, I usually:', 'False', '1.0', 'stress', NULL, 'C', 'internalise it and pull back', 'Stress_Avoidance', '1.0'),
  ('37', 'stress_derailers', 'Stress & Derailers', 'When trust is broken, I usually:', 'False', '1.0', 'stress', NULL, 'D', 'become colder and more distant', 'Stress_Criticality', '1.0'),
  ('38', 'stress_derailers', 'Stress & Derailers', 'Under pressure, others may sometimes experience me as:', 'False', '1.0', 'stress', NULL, 'A', 'more forceful than usual', 'Stress_Control', '1.0'),
  ('38', 'stress_derailers', 'Stress & Derailers', 'Under pressure, others may sometimes experience me as:', 'False', '1.0', 'stress', NULL, 'B', 'more reactive or inconsistent', 'Stress_Scatter', '1.0'),
  ('38', 'stress_derailers', 'Stress & Derailers', 'Under pressure, others may sometimes experience me as:', 'False', '1.0', 'stress', NULL, 'C', 'harder to read or engage', 'Stress_Avoidance', '1.0'),
  ('38', 'stress_derailers', 'Stress & Derailers', 'Under pressure, others may sometimes experience me as:', 'False', '1.0', 'stress', NULL, 'D', 'more exacting or demanding', 'Stress_Criticality', '1.0'),
  ('39', 'stress_derailers', 'Stress & Derailers', 'My most likely blind spot under strain is:', 'False', '1.0', 'stress', NULL, 'A', 'impatience', 'Stress_Control', '1.0'),
  ('39', 'stress_derailers', 'Stress & Derailers', 'My most likely blind spot under strain is:', 'False', '1.0', 'stress', NULL, 'B', 'over-optimism', 'Stress_Scatter', '1.0'),
  ('39', 'stress_derailers', 'Stress & Derailers', 'My most likely blind spot under strain is:', 'False', '1.0', 'stress', NULL, 'C', 'avoidance', 'Stress_Avoidance', '1.0'),
  ('39', 'stress_derailers', 'Stress & Derailers', 'My most likely blind spot under strain is:', 'False', '1.0', 'stress', NULL, 'D', 'perfectionism', 'Stress_Criticality', '1.0'),
  ('40', 'stress_derailers', 'Stress & Derailers', 'When I feel under threat, I tend to:', 'False', '1.0', 'stress', NULL, 'A', 'push back strongly', 'Stress_Control', '1.0'),
  ('40', 'stress_derailers', 'Stress & Derailers', 'When I feel under threat, I tend to:', 'False', '1.0', 'stress', NULL, 'B', 'defend my position quickly', 'Stress_Scatter', '1.0'),
  ('40', 'stress_derailers', 'Stress & Derailers', 'When I feel under threat, I tend to:', 'False', '1.0', 'stress', NULL, 'C', 'freeze or hold back', 'Stress_Avoidance', '1.0'),
  ('40', 'stress_derailers', 'Stress & Derailers', 'When I feel under threat, I tend to:', 'False', '1.0', 'stress', NULL, 'D', 'overthink the situation', 'Stress_Criticality', '1.0'),
  ('41', 'decision_risk', 'Decision & Risk Orientation', 'Risk at work usually feels to me like:', 'False', '1.0', 'decision', NULL, 'A', 'an opportunity worth pursuing', 'Decision_Opportunity', '1.0'),
  ('41', 'decision_risk', 'Decision & Risk Orientation', 'Risk at work usually feels to me like:', 'False', '1.0', 'decision', NULL, 'B', 'something that often needs collective judgement', 'Decision_Social', '1.0'),
  ('41', 'decision_risk', 'Decision & Risk Orientation', 'Risk at work usually feels to me like:', 'False', '1.0', 'decision', NULL, 'C', 'something to manage carefully', 'Decision_Stability', '1.0'),
  ('41', 'decision_risk', 'Decision & Risk Orientation', 'Risk at work usually feels to me like:', 'False', '1.0', 'decision', NULL, 'D', 'something to assess through evidence', 'Decision_Evidence', '1.0'),
  ('42', 'decision_risk', 'Decision & Risk Orientation', 'I usually prefer decisions that are:', 'False', '1.0', 'decision', NULL, 'A', 'fast and practical', 'Decision_Opportunity', '1.0'),
  ('42', 'decision_risk', 'Decision & Risk Orientation', 'I usually prefer decisions that are:', 'False', '1.0', 'decision', NULL, 'B', 'aligned through discussion', 'Decision_Social', '1.0'),
  ('42', 'decision_risk', 'Decision & Risk Orientation', 'I usually prefer decisions that are:', 'False', '1.0', 'decision', NULL, 'C', 'safe and dependable', 'Decision_Stability', '1.0'),
  ('42', 'decision_risk', 'Decision & Risk Orientation', 'I usually prefer decisions that are:', 'False', '1.0', 'decision', NULL, 'D', 'evidence-based', 'Decision_Evidence', '1.0'),
  ('43', 'decision_risk', 'Decision & Risk Orientation', 'In high-stakes decisions, I tend to:', 'False', '1.0', 'decision', NULL, 'A', 'act and adapt', 'Decision_Opportunity', '1.0'),
  ('43', 'decision_risk', 'Decision & Risk Orientation', 'In high-stakes decisions, I tend to:', 'False', '1.0', 'decision', NULL, 'B', 'influence and align others', 'Decision_Social', '1.0'),
  ('43', 'decision_risk', 'Decision & Risk Orientation', 'In high-stakes decisions, I tend to:', 'False', '1.0', 'decision', NULL, 'C', 'stabilise and reduce disruption', 'Decision_Stability', '1.0'),
  ('43', 'decision_risk', 'Decision & Risk Orientation', 'In high-stakes decisions, I tend to:', 'False', '1.0', 'decision', NULL, 'D', 'model scenarios and assess trade-offs', 'Decision_Evidence', '1.0'),
  ('44', 'decision_risk', 'Decision & Risk Orientation', 'I tend to trust most:', 'False', '1.0', 'decision', NULL, 'A', 'instinct and experience', 'Decision_Opportunity', '1.0'),
  ('44', 'decision_risk', 'Decision & Risk Orientation', 'I tend to trust most:', 'False', '1.0', 'decision', NULL, 'B', 'people and perspective', 'Decision_Social', '1.0'),
  ('44', 'decision_risk', 'Decision & Risk Orientation', 'I tend to trust most:', 'False', '1.0', 'decision', NULL, 'C', 'what has proven stable before', 'Decision_Stability', '1.0'),
  ('44', 'decision_risk', 'Decision & Risk Orientation', 'I tend to trust most:', 'False', '1.0', 'decision', NULL, 'D', 'data and analysis', 'Decision_Evidence', '1.0'),
  ('45', 'decision_risk', 'Decision & Risk Orientation', 'I am most comfortable with:', 'False', '1.0', 'decision', NULL, 'A', 'volatility if the upside is strong', 'Decision_Opportunity', '1.0'),
  ('45', 'decision_risk', 'Decision & Risk Orientation', 'I am most comfortable with:', 'False', '1.0', 'decision', NULL, 'B', 'change when people stay aligned', 'Decision_Social', '1.0'),
  ('45', 'decision_risk', 'Decision & Risk Orientation', 'I am most comfortable with:', 'False', '1.0', 'decision', NULL, 'C', 'routine and predictability', 'Decision_Stability', '1.0'),
  ('45', 'decision_risk', 'Decision & Risk Orientation', 'I am most comfortable with:', 'False', '1.0', 'decision', NULL, 'D', 'clear structure and logic', 'Decision_Evidence', '1.0'),
  ('46', 'leadership_orientation', 'Leadership Orientation', 'A leader''s primary job is to:', 'False', '1.0', 'leadership', NULL, 'A', 'deliver results', 'Leader_Results', '1.0'),
  ('46', 'leadership_orientation', 'Leadership Orientation', 'A leader''s primary job is to:', 'False', '1.0', 'leadership', NULL, 'B', 'inspire direction and energy', 'Leader_Vision', '1.0'),
  ('46', 'leadership_orientation', 'Leadership Orientation', 'A leader''s primary job is to:', 'False', '1.0', 'leadership', NULL, 'C', 'develop people and teams', 'Leader_People', '1.0'),
  ('46', 'leadership_orientation', 'Leadership Orientation', 'A leader''s primary job is to:', 'False', '1.0', 'leadership', NULL, 'D', 'design effective systems', 'Leader_Process', '1.0'),
  ('47', 'leadership_orientation', 'Leadership Orientation', 'Poor performance is best handled by:', 'False', '1.0', 'leadership', NULL, 'A', 'raising standards clearly', 'Leader_Results', '1.0'),
  ('47', 'leadership_orientation', 'Leadership Orientation', 'Poor performance is best handled by:', 'False', '1.0', 'leadership', NULL, 'B', 'rebuilding motivation and belief', 'Leader_Vision', '1.0'),
  ('47', 'leadership_orientation', 'Leadership Orientation', 'Poor performance is best handled by:', 'False', '1.0', 'leadership', NULL, 'C', 'coaching and support', 'Leader_People', '1.0'),
  ('47', 'leadership_orientation', 'Leadership Orientation', 'Poor performance is best handled by:', 'False', '1.0', 'leadership', NULL, 'D', 'improving process and structure', 'Leader_Process', '1.0'),
  ('48', 'leadership_orientation', 'Leadership Orientation', 'I lead best through:', 'False', '1.0', 'leadership', NULL, 'A', 'direction and accountability', 'Leader_Results', '1.0'),
  ('48', 'leadership_orientation', 'Leadership Orientation', 'I lead best through:', 'False', '1.0', 'leadership', NULL, 'B', 'energy and communication', 'Leader_Vision', '1.0'),
  ('48', 'leadership_orientation', 'Leadership Orientation', 'I lead best through:', 'False', '1.0', 'leadership', NULL, 'C', 'support and development', 'Leader_People', '1.0'),
  ('48', 'leadership_orientation', 'Leadership Orientation', 'I lead best through:', 'False', '1.0', 'leadership', NULL, 'D', 'clarity, process, and expertise', 'Leader_Process', '1.0'),
  ('49', 'leadership_orientation', 'Leadership Orientation', 'Authority is strongest when it is:', 'False', '1.0', 'leadership', NULL, 'A', 'used decisively', 'Leader_Results', '1.0'),
  ('49', 'leadership_orientation', 'Leadership Orientation', 'Authority is strongest when it is:', 'False', '1.0', 'leadership', NULL, 'B', 'earned through belief and followership', 'Leader_Vision', '1.0'),
  ('49', 'leadership_orientation', 'Leadership Orientation', 'Authority is strongest when it is:', 'False', '1.0', 'leadership', NULL, 'C', 'shared appropriately with others', 'Leader_People', '1.0'),
  ('49', 'leadership_orientation', 'Leadership Orientation', 'Authority is strongest when it is:', 'False', '1.0', 'leadership', NULL, 'D', 'anchored in role clarity and structure', 'Leader_Process', '1.0'),
  ('50', 'leadership_orientation', 'Leadership Orientation', 'I am most confident leading:', 'False', '1.0', 'leadership', NULL, 'A', 'in crisis', 'Leader_Results', '1.0'),
  ('50', 'leadership_orientation', 'Leadership Orientation', 'I am most confident leading:', 'False', '1.0', 'leadership', NULL, 'B', 'through growth and change', 'Leader_Vision', '1.0'),
  ('50', 'leadership_orientation', 'Leadership Orientation', 'I am most confident leading:', 'False', '1.0', 'leadership', NULL, 'C', 'in stable team environments', 'Leader_People', '1.0'),
  ('50', 'leadership_orientation', 'Leadership Orientation', 'I am most confident leading:', 'False', '1.0', 'leadership', NULL, 'D', 'in complex or technical environments', 'Leader_Process', '1.0'),
  ('51', 'culture_preference', 'Culture Preference', 'My ideal organisational culture is:', 'False', '1.0', 'culture', NULL, 'A', 'competitive and achievement-focused', 'Culture_Market', '1.0'),
  ('51', 'culture_preference', 'Culture Preference', 'My ideal organisational culture is:', 'False', '1.0', 'culture', NULL, 'B', 'innovative and adaptive', 'Culture_Adhocracy', '1.0'),
  ('51', 'culture_preference', 'Culture Preference', 'My ideal organisational culture is:', 'False', '1.0', 'culture', NULL, 'C', 'collaborative and trust-based', 'Culture_Clan', '1.0'),
  ('51', 'culture_preference', 'Culture Preference', 'My ideal organisational culture is:', 'False', '1.0', 'culture', NULL, 'D', 'structured and disciplined', 'Culture_Hierarchy', '1.0'),
  ('52', 'culture_preference', 'Culture Preference', 'Organisational success should be measured mainly by:', 'False', '1.0', 'culture', NULL, 'A', 'performance and commercial results', 'Culture_Market', '1.0'),
  ('52', 'culture_preference', 'Culture Preference', 'Organisational success should be measured mainly by:', 'False', '1.0', 'culture', NULL, 'B', 'growth and experimentation', 'Culture_Adhocracy', '1.0'),
  ('52', 'culture_preference', 'Culture Preference', 'Organisational success should be measured mainly by:', 'False', '1.0', 'culture', NULL, 'C', 'engagement and cohesion', 'Culture_Clan', '1.0'),
  ('52', 'culture_preference', 'Culture Preference', 'Organisational success should be measured mainly by:', 'False', '1.0', 'culture', NULL, 'D', 'efficiency and reliability', 'Culture_Hierarchy', '1.0'),
  ('53', 'culture_preference', 'Culture Preference', 'Culture should prioritise:', 'False', '1.0', 'culture', NULL, 'A', 'performance expectations', 'Culture_Market', '1.0'),
  ('53', 'culture_preference', 'Culture Preference', 'Culture should prioritise:', 'False', '1.0', 'culture', NULL, 'B', 'creativity and new thinking', 'Culture_Adhocracy', '1.0'),
  ('53', 'culture_preference', 'Culture Preference', 'Culture should prioritise:', 'False', '1.0', 'culture', NULL, 'C', 'belonging and connection', 'Culture_Clan', '1.0'),
  ('53', 'culture_preference', 'Culture Preference', 'Culture should prioritise:', 'False', '1.0', 'culture', NULL, 'D', 'consistency and standards', 'Culture_Hierarchy', '1.0'),
  ('54', 'culture_preference', 'Culture Preference', 'Accountability works best when it is:', 'False', '1.0', 'culture', NULL, 'A', 'high and visible', 'Culture_Market', '1.0'),
  ('54', 'culture_preference', 'Culture Preference', 'Accountability works best when it is:', 'False', '1.0', 'culture', NULL, 'B', 'energising and future-focused', 'Culture_Adhocracy', '1.0'),
  ('54', 'culture_preference', 'Culture Preference', 'Accountability works best when it is:', 'False', '1.0', 'culture', NULL, 'C', 'fair and relationship-aware', 'Culture_Clan', '1.0'),
  ('54', 'culture_preference', 'Culture Preference', 'Accountability works best when it is:', 'False', '1.0', 'culture', NULL, 'D', 'measured and well defined', 'Culture_Hierarchy', '1.0'),
  ('55', 'culture_preference', 'Culture Preference', 'I find it hardest to work in cultures that are:', 'False', '1.0', 'culture', NULL, 'A', 'slow to act', 'Culture_Market', '1.0'),
  ('55', 'culture_preference', 'Culture Preference', 'I find it hardest to work in cultures that are:', 'False', '1.0', 'culture', NULL, 'B', 'too resistant to change', 'Culture_Adhocracy', '1.0'),
  ('55', 'culture_preference', 'Culture Preference', 'I find it hardest to work in cultures that are:', 'False', '1.0', 'culture', NULL, 'C', 'unnecessarily harsh', 'Culture_Clan', '1.0'),
  ('55', 'culture_preference', 'Culture Preference', 'I find it hardest to work in cultures that are:', 'False', '1.0', 'culture', NULL, 'D', 'chaotic and unclear', 'Culture_Hierarchy', '1.0'),
  ('56', 'work_contribution', 'Work Contribution Preference', 'I most naturally add value by:', 'False', '1.0', 'contribution', NULL, 'A', 'driving progress toward objectives', 'Contribution_Drive', '1.0'),
  ('56', 'work_contribution', 'Work Contribution Preference', 'I most naturally add value by:', 'False', '1.0', 'contribution', NULL, 'B', 'bringing people and ideas together', 'Contribution_Connect', '1.0'),
  ('56', 'work_contribution', 'Work Contribution Preference', 'I most naturally add value by:', 'False', '1.0', 'contribution', NULL, 'C', 'supporting stability and follow-through', 'Contribution_Stabilise', '1.0'),
  ('56', 'work_contribution', 'Work Contribution Preference', 'I most naturally add value by:', 'False', '1.0', 'contribution', NULL, 'D', 'improving methods and insight', 'Contribution_Analyse', '1.0'),
  ('57', 'work_contribution', 'Work Contribution Preference', 'My strongest contribution is usually:', 'False', '1.0', 'contribution', NULL, 'A', 'creating momentum', 'Contribution_Drive', '1.0'),
  ('57', 'work_contribution', 'Work Contribution Preference', 'My strongest contribution is usually:', 'False', '1.0', 'contribution', NULL, 'B', 'energising people', 'Contribution_Connect', '1.0'),
  ('57', 'work_contribution', 'Work Contribution Preference', 'My strongest contribution is usually:', 'False', '1.0', 'contribution', NULL, 'C', 'maintaining reliability', 'Contribution_Stabilise', '1.0'),
  ('57', 'work_contribution', 'Work Contribution Preference', 'My strongest contribution is usually:', 'False', '1.0', 'contribution', NULL, 'D', 'improving systems or understanding', 'Contribution_Analyse', '1.0'),
  ('58', 'work_contribution', 'Work Contribution Preference', 'I usually thrive most in work where:', 'False', '1.0', 'contribution', NULL, 'A', 'pace and targets matter', 'Contribution_Drive', '1.0'),
  ('58', 'work_contribution', 'Work Contribution Preference', 'I usually thrive most in work where:', 'False', '1.0', 'contribution', NULL, 'B', 'relationships and influence matter', 'Contribution_Connect', '1.0'),
  ('58', 'work_contribution', 'Work Contribution Preference', 'I usually thrive most in work where:', 'False', '1.0', 'contribution', NULL, 'C', 'stability and cooperation matter', 'Contribution_Stabilise', '1.0'),
  ('58', 'work_contribution', 'Work Contribution Preference', 'I usually thrive most in work where:', 'False', '1.0', 'contribution', NULL, 'D', 'systems and quality matter', 'Contribution_Analyse', '1.0'),
  ('59', 'work_contribution', 'Work Contribution Preference', 'The value I most often bring to an organisation is:', 'False', '1.0', 'contribution', NULL, 'A', 'momentum', 'Contribution_Drive', '1.0'),
  ('59', 'work_contribution', 'Work Contribution Preference', 'The value I most often bring to an organisation is:', 'False', '1.0', 'contribution', NULL, 'B', 'engagement', 'Contribution_Connect', '1.0'),
  ('59', 'work_contribution', 'Work Contribution Preference', 'The value I most often bring to an organisation is:', 'False', '1.0', 'contribution', NULL, 'C', 'dependability', 'Contribution_Stabilise', '1.0'),
  ('59', 'work_contribution', 'Work Contribution Preference', 'The value I most often bring to an organisation is:', 'False', '1.0', 'contribution', NULL, 'D', 'precision', 'Contribution_Analyse', '1.0'),
  ('60', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When progress stalls on an important initiative, I typically:', 'False', '0.5', 'integrity', 'validation', 'A', 'push harder and accelerate decisions', 'Integrity_Driver', '0.5'),
  ('60', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When progress stalls on an important initiative, I typically:', 'False', '0.5', 'integrity', 'validation', 'B', 'rally people and re-energise the group', 'Integrity_Influencer', '0.5'),
  ('60', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When progress stalls on an important initiative, I typically:', 'False', '0.5', 'integrity', 'validation', 'C', 'maintain stability and reduce disruption', 'Integrity_Stabiliser', '0.5'),
  ('60', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When progress stalls on an important initiative, I typically:', 'False', '0.5', 'integrity', 'validation', 'D', 're-evaluate the system or assumptions', 'Integrity_Analyst', '0.5'),
  ('61', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a colleague challenges my idea strongly, I usually:', 'True', '0.5', 'integrity', 'reverse-scored behavioural impulse', 'A', 'defend my position immediately', 'Integrity_Driver', '0.5'),
  ('61', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a colleague challenges my idea strongly, I usually:', 'True', '0.5', 'integrity', 'reverse-scored behavioural impulse', 'B', 'reframe the discussion and try to win support', 'Integrity_Influencer', '0.5'),
  ('61', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a colleague challenges my idea strongly, I usually:', 'True', '0.5', 'integrity', 'reverse-scored behavioural impulse', 'C', 'de-escalate and keep harmony', 'Integrity_Stabiliser', '0.5'),
  ('61', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a colleague challenges my idea strongly, I usually:', 'True', '0.5', 'integrity', 'reverse-scored behavioural impulse', 'D', 'examine their reasoning carefully', 'Integrity_Analyst', '0.5'),
  ('62', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In high-performing teams, I value most:', 'False', '0.5', 'integrity', 'validation', 'A', 'momentum and execution', 'Integrity_Driver', '0.5'),
  ('62', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In high-performing teams, I value most:', 'False', '0.5', 'integrity', 'validation', 'B', 'inspiration and energy', 'Integrity_Influencer', '0.5'),
  ('62', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In high-performing teams, I value most:', 'False', '0.5', 'integrity', 'validation', 'C', 'trust and cohesion', 'Integrity_Stabiliser', '0.5'),
  ('62', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In high-performing teams, I value most:', 'False', '0.5', 'integrity', 'validation', 'D', 'precision and expertise', 'Integrity_Analyst', '0.5'),
  ('63', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a project begins to drift, I prefer to:', 'True', '0.5', 'integrity', 'reverse-scored control bias', 'A', 'take direct control of the situation', 'Integrity_Driver', '0.5'),
  ('63', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a project begins to drift, I prefer to:', 'True', '0.5', 'integrity', 'reverse-scored control bias', 'B', 'influence the team informally', 'Integrity_Influencer', '0.5'),
  ('63', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a project begins to drift, I prefer to:', 'True', '0.5', 'integrity', 'reverse-scored control bias', 'C', 'encourage collaboration', 'Integrity_Stabiliser', '0.5'),
  ('63', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a project begins to drift, I prefer to:', 'True', '0.5', 'integrity', 'reverse-scored control bias', 'D', 'improve the process or structure', 'Integrity_Analyst', '0.5'),
  ('64', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating a risky opportunity, I focus primarily on:', 'False', '0.5', 'integrity', 'validation', 'A', 'potential upside', 'Integrity_Driver', '0.5'),
  ('64', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating a risky opportunity, I focus primarily on:', 'False', '0.5', 'integrity', 'validation', 'B', 'the strategic story and support behind it', 'Integrity_Influencer', '0.5'),
  ('64', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating a risky opportunity, I focus primarily on:', 'False', '0.5', 'integrity', 'validation', 'C', 'the impact on people and stability', 'Integrity_Stabiliser', '0.5'),
  ('64', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating a risky opportunity, I focus primarily on:', 'False', '0.5', 'integrity', 'validation', 'D', 'evidence and probability', 'Integrity_Analyst', '0.5'),
  ('65', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a team member disagrees with me privately, I am most likely to:', 'True', '0.5', 'integrity', 'behavioural contradiction check', 'A', 'expect alignment with the decision', 'Integrity_Driver', '0.5'),
  ('65', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a team member disagrees with me privately, I am most likely to:', 'True', '0.5', 'integrity', 'behavioural contradiction check', 'B', 'try to win them over', 'Integrity_Influencer', '0.5'),
  ('65', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a team member disagrees with me privately, I am most likely to:', 'True', '0.5', 'integrity', 'behavioural contradiction check', 'C', 'explore their concerns', 'Integrity_Stabiliser', '0.5'),
  ('65', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If a team member disagrees with me privately, I am most likely to:', 'True', '0.5', 'integrity', 'behavioural contradiction check', 'D', 'analyse the logic together', 'Integrity_Analyst', '0.5'),
  ('66', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When organisations grow quickly, they most often fail because:', 'False', '0.5', 'integrity', 'validation', 'A', 'leadership loses control', 'Integrity_Driver', '0.5'),
  ('66', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When organisations grow quickly, they most often fail because:', 'False', '0.5', 'integrity', 'validation', 'B', 'vision becomes diluted', 'Integrity_Influencer', '0.5'),
  ('66', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When organisations grow quickly, they most often fail because:', 'False', '0.5', 'integrity', 'validation', 'C', 'culture becomes fragmented', 'Integrity_Stabiliser', '0.5'),
  ('66', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When organisations grow quickly, they most often fail because:', 'False', '0.5', 'integrity', 'validation', 'D', 'systems fail to scale', 'Integrity_Analyst', '0.5'),
  ('67', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In emotionally charged environments, I tend to:', 'True', '0.5', 'integrity', 'reverse-scored emotional response', 'A', 'become more forceful', 'Integrity_Driver', '0.5'),
  ('67', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In emotionally charged environments, I tend to:', 'True', '0.5', 'integrity', 'reverse-scored emotional response', 'B', 'become more expressive', 'Integrity_Influencer', '0.5'),
  ('67', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In emotionally charged environments, I tend to:', 'True', '0.5', 'integrity', 'reverse-scored emotional response', 'C', 'try to calm the situation', 'Integrity_Stabiliser', '0.5'),
  ('67', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In emotionally charged environments, I tend to:', 'True', '0.5', 'integrity', 'reverse-scored emotional response', 'D', 'become more analytical', 'Integrity_Analyst', '0.5'),
  ('68', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In difficult conversations, I prioritise:', 'False', '0.5', 'integrity', 'consistency check', 'A', 'directness', 'Integrity_Driver', '0.5'),
  ('68', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In difficult conversations, I prioritise:', 'False', '0.5', 'integrity', 'consistency check', 'B', 'influence', 'Integrity_Influencer', '0.5'),
  ('68', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In difficult conversations, I prioritise:', 'False', '0.5', 'integrity', 'consistency check', 'C', 'sensitivity', 'Integrity_Stabiliser', '0.5'),
  ('68', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In difficult conversations, I prioritise:', 'False', '0.5', 'integrity', 'consistency check', 'D', 'accuracy', 'Integrity_Analyst', '0.5'),
  ('69', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When a decision proves wrong, I usually:', 'False', '0.5', 'integrity', 'consistency check', 'A', 'correct course quickly', 'Integrity_Driver', '0.5'),
  ('69', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When a decision proves wrong, I usually:', 'False', '0.5', 'integrity', 'consistency check', 'B', 'rebuild commitment and momentum', 'Integrity_Influencer', '0.5'),
  ('69', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When a decision proves wrong, I usually:', 'False', '0.5', 'integrity', 'consistency check', 'C', 'maintain morale', 'Integrity_Stabiliser', '0.5'),
  ('69', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When a decision proves wrong, I usually:', 'False', '0.5', 'integrity', 'consistency check', 'D', 'investigate root causes', 'Integrity_Analyst', '0.5'),
  ('70', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When joining a new organisation, I first try to understand:', 'False', '0.5', 'integrity', 'self-awareness check', 'A', 'power and decision authority', 'Integrity_Driver', '0.5'),
  ('70', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When joining a new organisation, I first try to understand:', 'False', '0.5', 'integrity', 'self-awareness check', 'B', 'informal influence networks', 'Integrity_Influencer', '0.5'),
  ('70', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When joining a new organisation, I first try to understand:', 'False', '0.5', 'integrity', 'self-awareness check', 'C', 'social dynamics and trust', 'Integrity_Stabiliser', '0.5'),
  ('70', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When joining a new organisation, I first try to understand:', 'False', '0.5', 'integrity', 'self-awareness check', 'D', 'systems and processes', 'Integrity_Analyst', '0.5'),
  ('71', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'My leadership impact is strongest when I:', 'False', '0.5', 'integrity', 'self-awareness check', 'A', 'drive performance', 'Integrity_Driver', '0.5'),
  ('71', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'My leadership impact is strongest when I:', 'False', '0.5', 'integrity', 'self-awareness check', 'B', 'inspire confidence', 'Integrity_Influencer', '0.5'),
  ('71', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'My leadership impact is strongest when I:', 'False', '0.5', 'integrity', 'self-awareness check', 'C', 'build stability', 'Integrity_Stabiliser', '0.5'),
  ('71', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'My leadership impact is strongest when I:', 'False', '0.5', 'integrity', 'self-awareness check', 'D', 'provide expertise', 'Integrity_Analyst', '0.5'),
  ('72', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When faced with conflicting priorities, I typically:', 'False', '0.5', 'integrity', 'validation', 'A', 'choose the fastest path forward', 'Integrity_Driver', '0.5'),
  ('72', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When faced with conflicting priorities, I typically:', 'False', '0.5', 'integrity', 'validation', 'B', 'align stakeholders first', 'Integrity_Influencer', '0.5'),
  ('72', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When faced with conflicting priorities, I typically:', 'False', '0.5', 'integrity', 'validation', 'C', 'seek consensus', 'Integrity_Stabiliser', '0.5'),
  ('72', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When faced with conflicting priorities, I typically:', 'False', '0.5', 'integrity', 'validation', 'D', 'analyse implications', 'Integrity_Analyst', '0.5'),
  ('73', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'Uncertainty in organisations usually signals:', 'True', '0.5', 'integrity', 'reverse-scored risk perception', 'A', 'opportunity', 'Integrity_Driver', '0.5'),
  ('73', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'Uncertainty in organisations usually signals:', 'True', '0.5', 'integrity', 'reverse-scored risk perception', 'B', 'energy and movement', 'Integrity_Influencer', '0.5'),
  ('73', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'Uncertainty in organisations usually signals:', 'True', '0.5', 'integrity', 'reverse-scored risk perception', 'C', 'instability', 'Integrity_Stabiliser', '0.5'),
  ('73', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'Uncertainty in organisations usually signals:', 'True', '0.5', 'integrity', 'reverse-scored risk perception', 'D', 'complexity', 'Integrity_Analyst', '0.5'),
  ('74', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The most damaging leadership behaviour is:', 'True', '0.5', 'integrity', 'behavioural tension', 'A', 'indecision', 'Integrity_Driver', '0.5'),
  ('74', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The most damaging leadership behaviour is:', 'True', '0.5', 'integrity', 'behavioural tension', 'B', 'self-focused leadership', 'Integrity_Influencer', '0.5'),
  ('74', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The most damaging leadership behaviour is:', 'True', '0.5', 'integrity', 'behavioural tension', 'C', 'disconnection from people', 'Integrity_Stabiliser', '0.5'),
  ('74', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The most damaging leadership behaviour is:', 'True', '0.5', 'integrity', 'behavioural tension', 'D', 'poor judgement', 'Integrity_Analyst', '0.5'),
  ('75', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When results matter most, I tend to:', 'False', '0.5', 'integrity', 'validation', 'A', 'increase pressure', 'Integrity_Driver', '0.5'),
  ('75', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When results matter most, I tend to:', 'False', '0.5', 'integrity', 'validation', 'B', 'increase communication', 'Integrity_Influencer', '0.5'),
  ('75', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When results matter most, I tend to:', 'False', '0.5', 'integrity', 'validation', 'C', 'increase support', 'Integrity_Stabiliser', '0.5'),
  ('75', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When results matter most, I tend to:', 'False', '0.5', 'integrity', 'validation', 'D', 'increase analysis', 'Integrity_Analyst', '0.5'),
  ('76', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The best leaders create organisations that are:', 'False', '0.5', 'integrity', 'validation', 'A', 'competitive and high-performing', 'Integrity_Driver', '0.5'),
  ('76', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The best leaders create organisations that are:', 'False', '0.5', 'integrity', 'validation', 'B', 'inspired and future-focused', 'Integrity_Influencer', '0.5'),
  ('76', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The best leaders create organisations that are:', 'False', '0.5', 'integrity', 'validation', 'C', 'cohesive and supportive', 'Integrity_Stabiliser', '0.5'),
  ('76', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'The best leaders create organisations that are:', 'False', '0.5', 'integrity', 'validation', 'D', 'systematically effective', 'Integrity_Analyst', '0.5'),
  ('77', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If data contradicts my intuition, I usually:', 'True', '0.5', 'integrity', 'integrity cross-check', 'A', 'back my instinct unless the gap is significant', 'Integrity_Driver', '0.5'),
  ('77', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If data contradicts my intuition, I usually:', 'True', '0.5', 'integrity', 'integrity cross-check', 'B', 'seek additional perspectives', 'Integrity_Influencer', '0.5'),
  ('77', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If data contradicts my intuition, I usually:', 'True', '0.5', 'integrity', 'integrity cross-check', 'C', 'reflect carefully before changing course', 'Integrity_Stabiliser', '0.5'),
  ('77', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'If data contradicts my intuition, I usually:', 'True', '0.5', 'integrity', 'integrity cross-check', 'D', 'follow the evidence', 'Integrity_Analyst', '0.5'),
  ('78', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In organisational change, my first instinct is to:', 'False', '0.5', 'integrity', 'culture tension mapping', 'A', 'drive transformation quickly', 'Integrity_Driver', '0.5'),
  ('78', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In organisational change, my first instinct is to:', 'False', '0.5', 'integrity', 'culture tension mapping', 'B', 'communicate the vision', 'Integrity_Influencer', '0.5'),
  ('78', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In organisational change, my first instinct is to:', 'False', '0.5', 'integrity', 'culture tension mapping', 'C', 'protect stability', 'Integrity_Stabiliser', '0.5'),
  ('78', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'In organisational change, my first instinct is to:', 'False', '0.5', 'integrity', 'culture tension mapping', 'D', 'design the transition carefully', 'Integrity_Analyst', '0.5'),
  ('79', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'I perform best in organisations that reward:', 'False', '0.5', 'integrity', 'culture tension mapping', 'A', 'strong results', 'Integrity_Driver', '0.5'),
  ('79', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'I perform best in organisations that reward:', 'False', '0.5', 'integrity', 'culture tension mapping', 'B', 'visible contribution', 'Integrity_Influencer', '0.5'),
  ('79', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'I perform best in organisations that reward:', 'False', '0.5', 'integrity', 'culture tension mapping', 'C', 'commitment and loyalty', 'Integrity_Stabiliser', '0.5'),
  ('79', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'I perform best in organisations that reward:', 'False', '0.5', 'integrity', 'culture tension mapping', 'D', 'capability and judgement', 'Integrity_Analyst', '0.5'),
  ('80', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating other people''s performance, I value most:', 'False', '0.5', 'integrity', 'final validation signal', 'A', 'results delivered', 'Integrity_Driver', '0.5'),
  ('80', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating other people''s performance, I value most:', 'False', '0.5', 'integrity', 'final validation signal', 'B', 'influence created', 'Integrity_Influencer', '0.5'),
  ('80', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating other people''s performance, I value most:', 'False', '0.5', 'integrity', 'final validation signal', 'C', 'relationships maintained', 'Integrity_Stabiliser', '0.5'),
  ('80', 'behavioural_integrity', 'Behavioural Integrity & Consistency', 'When evaluating other people''s performance, I value most:', 'False', '0.5', 'integrity', 'final validation signal', 'D', 'quality of thinking', 'Integrity_Analyst', '0.5');

INSERT INTO assessment_question_sets (
  assessment_version_id,
  key,
  name,
  description,
  is_active
)
SELECT
  av.id,
  'wplp80-v1-main',
  'WPLP-80 Main Question Set',
  'Primary question set for WPLP-80 Sonartra Signals',
  TRUE
FROM assessment_versions av
WHERE av.key = 'wplp80-v1'
ON CONFLICT (key)
DO UPDATE SET
  assessment_version_id = EXCLUDED.assessment_version_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

WITH question_set AS (
  SELECT id
  FROM assessment_question_sets
  WHERE key = 'wplp80-v1-main'
),
question_rows AS (
  SELECT
    question_id AS question_number,
    MAX(prompt) AS prompt,
    MAX(section_key) AS section_key,
    MAX(NULLIF(section_name, '')) AS section_name,
    BOOL_OR(LOWER(reverse_scored) IN ('true', 't', '1', 'yes', 'y')) AS reverse_scored,
    MAX(question_weight_default) AS question_weight_default,
    MAX(NULLIF(scoring_family, '')) AS scoring_family,
    MAX(NULLIF(notes, '')) AS notes
  FROM tmp_wplp80_seed_rows
  GROUP BY question_id
)
INSERT INTO assessment_questions (
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
)
SELECT
  qs.id,
  qr.question_number,
  'wplp80_q' || LPAD(qr.question_number::TEXT, 2, '0'),
  qr.prompt,
  qr.section_key,
  qr.section_name,
  qr.reverse_scored,
  qr.question_weight_default,
  qr.scoring_family,
  qr.notes,
  TRUE
FROM question_rows qr
CROSS JOIN question_set qs
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
  updated_at = NOW();

WITH question_set AS (
  SELECT id
  FROM assessment_question_sets
  WHERE key = 'wplp80-v1-main'
),
question_lookup AS (
  SELECT id, question_number
  FROM assessment_questions
  WHERE question_set_id = (SELECT id FROM question_set)
),
option_rows AS (
  SELECT DISTINCT
    r.question_id,
    UPPER(r.option_key) AS option_key,
    r.option_text,
    CASE UPPER(r.option_key)
      WHEN 'A' THEN 1
      WHEN 'B' THEN 2
      WHEN 'C' THEN 3
      WHEN 'D' THEN 4
      ELSE NULL
    END AS display_order
  FROM tmp_wplp80_seed_rows r
)
INSERT INTO assessment_question_options (
  question_id,
  option_key,
  option_text,
  display_order,
  numeric_value
)
SELECT
  ql.id,
  o.option_key,
  o.option_text,
  o.display_order,
  o.display_order
FROM option_rows o
JOIN question_lookup ql ON ql.question_number = o.question_id
WHERE o.display_order IS NOT NULL
ON CONFLICT (question_id, option_key)
DO UPDATE SET
  option_text = EXCLUDED.option_text,
  display_order = EXCLUDED.display_order,
  numeric_value = EXCLUDED.numeric_value,
  updated_at = NOW();

WITH question_set AS (
  SELECT id
  FROM assessment_question_sets
  WHERE key = 'wplp80-v1-main'
),
question_lookup AS (
  SELECT id, question_number
  FROM assessment_questions
  WHERE question_set_id = (SELECT id FROM question_set)
),
option_lookup AS (
  SELECT
    o.id,
    q.question_number,
    o.option_key
  FROM assessment_question_options o
  JOIN question_lookup q ON q.id = o.question_id
)
INSERT INTO assessment_option_signal_mappings (
  question_option_id,
  signal_code,
  signal_weight
)
SELECT
  ol.id AS question_option_id,
  r.signal_code,
  r.signal_weight
FROM tmp_wplp80_seed_rows r
JOIN option_lookup ol
  ON ol.question_number = r.question_id
 AND ol.option_key = UPPER(r.option_key)
ON CONFLICT (question_option_id, signal_code)
DO UPDATE SET
  signal_weight = EXCLUDED.signal_weight;

COMMIT;

-- Optional validation queries (run after COMMIT)
-- 1) Question set exists and is active for wplp80-v1
SELECT
  av.key AS assessment_version_key,
  qs.key AS question_set_key,
  qs.is_active
FROM assessment_question_sets qs
JOIN assessment_versions av ON av.id = qs.assessment_version_id
WHERE av.key = 'wplp80-v1'
  AND qs.key = 'wplp80-v1-main';

-- 2) Question count should be 80
SELECT COUNT(*) AS question_count
FROM assessment_questions q
JOIN assessment_question_sets qs ON qs.id = q.question_set_id
WHERE qs.key = 'wplp80-v1-main';

-- 3) Option count should be 320
SELECT COUNT(*) AS option_count
FROM assessment_question_options o
JOIN assessment_questions q ON q.id = o.question_id
JOIN assessment_question_sets qs ON qs.id = q.question_set_id
WHERE qs.key = 'wplp80-v1-main';

-- 4) Every question should have exactly 4 options
SELECT COUNT(*) AS invalid_question_option_counts
FROM (
  SELECT q.id, COUNT(o.id) AS option_count
  FROM assessment_questions q
  JOIN assessment_question_sets qs ON qs.id = q.question_set_id
  LEFT JOIN assessment_question_options o ON o.question_id = q.id
  WHERE qs.key = 'wplp80-v1-main'
  GROUP BY q.id
) grouped
WHERE grouped.option_count <> 4;
