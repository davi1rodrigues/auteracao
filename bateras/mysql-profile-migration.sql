-- Execute uma vez em bancos Batera's que já tinham a tabela customers.
USE bateras_shop;
ALTER TABLE customers
  ADD COLUMN phone VARCHAR(25) DEFAULT NULL,
  ADD COLUMN city VARCHAR(100) DEFAULT NULL,
  ADD COLUMN state CHAR(2) DEFAULT NULL,
  ADD COLUMN playing_level VARCHAR(30) DEFAULT NULL,
  ADD COLUMN favorite_gear VARCHAR(120) DEFAULT NULL,
  ADD COLUMN about VARCHAR(500) DEFAULT NULL;
