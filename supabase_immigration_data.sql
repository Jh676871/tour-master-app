-- Add destination_country column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS destination_country TEXT DEFAULT 'Japan';

-- Ensure country_name is unique for ON CONFLICT to work
ALTER TABLE immigration_templates ADD CONSTRAINT immigration_templates_country_name_key UNIQUE (country_name);

-- Insert or Update Immigration Templates
-- Japan
INSERT INTO immigration_templates (country_name, template_image_url, instruction_text)
VALUES (
  'Japan', 
  '/images/immigration/japan.svg', 
  '1. 姓名：請填寫與護照一致的英文姓名\n2. 住宿：請填寫第一晚飯店名稱與地址 (Tokyo Dome Hotel)\n3. 攜帶現金：若超過 100 萬日圓需申報\n4. 背面問題全選「無 (No)」'
)
ON CONFLICT (country_name) DO UPDATE 
SET template_image_url = EXCLUDED.template_image_url, 
    instruction_text = EXCLUDED.instruction_text;

-- Korea
INSERT INTO immigration_templates (country_name, template_image_url, instruction_text)
VALUES (
  'Korea', 
  '/images/immigration/korea.svg', 
  '1. 填寫全名 (英文)\n2. 國籍：TAIWAN\n3. 職業：OFFICE WORKER\n4. 在韓聯絡處：填寫飯店名稱與電話'
)
ON CONFLICT (country_name) DO UPDATE 
SET template_image_url = EXCLUDED.template_image_url, 
    instruction_text = EXCLUDED.instruction_text;

-- Thailand
INSERT INTO immigration_templates (country_name, template_image_url, instruction_text)
VALUES (
  'Thailand', 
  '/images/immigration/thailand.svg', 
  '1. 簽證號碼：請填寫落地簽或紙本簽證號碼\n2. 班機號碼：CIxxx / BRxxx\n3. 簽名：請務必簽名 (與護照相同)'
)
ON CONFLICT (country_name) DO UPDATE 
SET template_image_url = EXCLUDED.template_image_url, 
    instruction_text = EXCLUDED.instruction_text;

-- USA
INSERT INTO immigration_templates (country_name, template_image_url, instruction_text)
VALUES (
  'USA', 
  '/images/immigration/usa.svg', 
  '1. 美國入境卡 (海關申報單 6059B)\n2. 一個家庭填寫一張即可\n3. 食物/動植物產品：建議全勾 No (若有帶泡麵/肉類請務必申報)\n4. 攜帶現金：超過 10,000 美金需申報'
)
ON CONFLICT (country_name) DO UPDATE 
SET template_image_url = EXCLUDED.template_image_url, 
    instruction_text = EXCLUDED.instruction_text;

-- UK
INSERT INTO immigration_templates (country_name, template_image_url, instruction_text)
VALUES (
  'UK', 
  '/images/immigration/uk.jpg', 
  '1. 英國入境不再需要填寫入境卡 (2019起取消)。\n2. 請準備好回程機票與住宿證明以備查驗。'
)
ON CONFLICT (country_name) DO UPDATE 
SET template_image_url = EXCLUDED.template_image_url, 
    instruction_text = EXCLUDED.instruction_text;
