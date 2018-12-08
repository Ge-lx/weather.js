-- Up
CREATE TABLE Weather (
  temperature  REAL  NOT NULL,
  humidity REAL NOT NULL,
  pressure REAL NOT NULL,
  mesaurement_ts DATETIME NOT NULL PRIMARY KEY
);
-- Down
SELECT NOW();