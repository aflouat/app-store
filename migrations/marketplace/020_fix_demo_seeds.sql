-- 020_fix_demo_seeds.sql
-- Corrige les emails @demo.fr → @perform-learn.fr et les placeholder password_hash
-- Root cause du BUG-01 : bcrypt.compare retournait toujours false

-- Fix emails + hash admin (placeholder → hash réel de 'demo1234')
UPDATE freelancehub.users
SET password_hash = '$2b$10$77kR1EJH4WEpNm0PI4y2wOo3qN0hMcimUaaBQOjcbI1Jjb9ItIy6K'
WHERE email = 'admin@perform-learn.fr'
  AND password_hash = '$2b$10$placeholder_admin_hash';

-- Fix consultant : email @demo.fr → @perform-learn.fr + hash réel
UPDATE freelancehub.users
SET email         = 'consultant1@perform-learn.fr',
    password_hash = '$2b$10$Skb7V62TLNrY/6e99AGO5uXLNPSvN9iTRlnbdZWT4KFOxk8Ds0dcG'
WHERE email = 'consultant1@demo.fr';

-- Fix client : email @demo.fr → @perform-learn.fr + hash réel
UPDATE freelancehub.users
SET email         = 'client1@perform-learn.fr',
    password_hash = '$2b$10$.RWKKLW.tEMkL7XySWnd6.3FVcvmZWauS.vIIlQKZExTE7LhRX8E.'
WHERE email = 'client1@demo.fr';
