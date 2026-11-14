-- Verified empty local schema formerly recorded as 6e40cd2a0801.

CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(1023) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `location` varchar(511) DEFAULT NULL,
  `separated_genders` tinyint(1) NOT NULL,
  `is_current` tinyint(1) NOT NULL,
  `teammates` int DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `enable_waitlist` tinyint(1) NOT NULL,
  `waitlist` tinyint(1) NOT NULL,
  `waitlist_max_participants` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_events_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `form_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `sport` varchar(63) NOT NULL,
  `gender` varchar(31) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `teammates` varchar(511) DEFAULT NULL,
  `team_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(21) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  KEY `ix_form_submissions_id` (`id`),
  CONSTRAINT `form_submissions_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sponsors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `website` varchar(1023) DEFAULT NULL,
  `logo` varchar(1023) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sponsors_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `picture` varchar(1023) DEFAULT NULL,
  `role` varchar(31) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_email` (`email`),
  KEY `ix_users_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO alembic_version (version_num) VALUES ('6e40cd2a0801');
