CREATE DATABASE IF NOT EXISTS aubgolympics_db;

DROP USER IF EXISTS 'aubgolympics_user'@'localhost';
CREATE USER 'aubgolympics_user'@'localhost' IDENTIFIED BY 'PeP1roN1OnF1re';

GRANT ALL PRIVILEGES ON aubgolympics_db.* TO 'aubgolympics_user'@'localhost';

FLUSH PRIVILEGES;
